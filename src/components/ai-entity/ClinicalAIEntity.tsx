import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { cn } from "@/lib/utils";
import { Brain, X, ChevronRight, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type EntityState = "passive" | "detecting" | "critical" | "positive";

interface AISignal {
  message: string;
  patientName?: string;
  patientId?: string;
  reason?: string;
  confidence?: number;
  type: EntityState;
}

// Module-level cache to prevent re-fetch/re-animate on every route change
let _cachedState: EntityState = "passive";
let _cachedSignal: AISignal | null = null;
let _lastFetchTime = 0;
const CACHE_TTL_MS = 120_000; // 2 min — same as the old interval

export default function ClinicalAIEntity() {
  const { user } = useAuth();
  const [state, setState] = useState<EntityState>(_cachedState);
  const [signal, setSignal] = useState<AISignal | null>(_cachedSignal);
  const [panelOpen, setPanelOpen] = useState(false);
  const [summary, setSummary] = useState<{
    focusPatients: number;
    automationsToday: number;
    pendingDecisions: number;
    riskPrediction: number;
    engagementScore: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const mountedRef = useRef(true);
  const { tenantId } = useTenant();

  // Load signals from real data
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user) return;

    async function checkSignals() {
      try {
        const { data: alerts } = await withTenantFilter((supabase as any)
          .from("clinical_alerts")
          .select("id, title, severity, patient_id, description")
          .eq("nutritionist_id", user!.id)
          .eq("is_active", true)
          .eq("severity", "critical")
          .order("created_at", { ascending: false })
          .limit(1), tenantId);

        if (!mountedRef.current) return;

        if (alerts?.length) {
          const a = alerts[0];
          const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", a.patient_id).single();
          if (!mountedRef.current) return;
          const newSignal: AISignal = {
            message: a.title,
            patientName: prof?.full_name ?? "Paciente",
            patientId: a.patient_id,
            reason: a.description?.substring(0, 80),
            type: "critical",
          };
          _cachedSignal = newSignal;
          _cachedState = "critical";
          setSignal(newSignal);
          setState("critical");
          return;
        }

        const { data: decisions } = await (supabase as any)
          .from("clinical_decisions")
          .select("id, title, patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!mountedRef.current) return;

        if (decisions?.length) {
          const newSignal: AISignal = {
            message: decisions[0].title || "Decisão clínica pendente",
            type: "detecting",
          };
          _cachedSignal = newSignal;
          _cachedState = "detecting";
          setSignal(newSignal);
          setState("detecting");
          return;
        }

        const { data: patients } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "active");

        if (!mountedRef.current) return;

        const ids = (patients ?? []).map(p => p.patient_id);
        if (ids.length) {
          const { data: snapshots } = await (supabase as any)
            .from("clinical_daily_snapshots")
            .select("patient_id, adherence_score, momentum_direction")
            .in("patient_id", ids)
            .order("snapshot_date", { ascending: false });

          if (!mountedRef.current) return;

          const latest = new Map<string, any>();
          for (const s of (snapshots ?? [])) {
            if (!latest.has(s.patient_id)) latest.set(s.patient_id, s);
          }
          const all = Array.from(latest.values());
          const improving = all.filter(s => s.momentum_direction === "up").length;

          if (improving > all.length * 0.5) {
            const newSignal: AISignal = { message: `${improving} pacientes com tendência positiva`, type: "positive" };
            _cachedSignal = newSignal;
            _cachedState = "positive";
            setSignal(newSignal);
            setState("positive");
            return;
          }
        }

        _cachedState = "passive";
        _cachedSignal = null;
        setState("passive");
        setSignal(null);
      } catch (e) {
        console.error("AI entity error:", e);
        setState("passive");
      } finally {
        _lastFetchTime = Date.now();
      }
    }

    // Only fetch if cache is stale
    const elapsed = Date.now() - _lastFetchTime;
    if (elapsed >= CACHE_TTL_MS) {
      checkSignals();
    }

    const interval = setInterval(checkSignals, CACHE_TTL_MS);
    return () => clearInterval(interval);
  }, [user]);

  // Load summary for panel
  const loadSummary = useCallback(async () => {
    if (!user) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: patients } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user.id)
        .eq("status", "active");

      const ids = (patients ?? []).map(p => p.patient_id);

      const [{ data: snapshots }, { data: runs }, { data: decisions }] = await Promise.all([
        ids.length ? (supabase as any)
          .from("clinical_daily_snapshots")
          .select("patient_id, adherence_score, dropout_risk_score, momentum_direction")
          .in("patient_id", ids)
          .order("snapshot_date", { ascending: false }) : Promise.resolve({ data: [] }),
        withTenantFilter((supabase as any)
          .from("automation_runs")
          .select("id")
          .eq("nutritionist_id", user.id)
          .eq("status", "success")
          .gte("executed_at", todayStart.toISOString()), tenantId),
        (supabase as any)
          .from("clinical_decisions")
          .select("id")
          .eq("nutritionist_id", user.id)
          .eq("status", "pending"),
      ]);

      const latest = new Map<string, any>();
      for (const s of (snapshots ?? [])) {
        if (!latest.has(s.patient_id)) latest.set(s.patient_id, s);
      }
      const all = Array.from(latest.values());
      const atRisk = all.filter(s => (s.dropout_risk_score ?? 0) > 50).length;
      const avgAdherence = all.length ? Math.round(all.reduce((acc: number, s: any) => acc + (s.adherence_score ?? 0), 0) / all.length) : 0;

      setSummary({
        focusPatients: atRisk,
        automationsToday: (runs ?? []).length,
        pendingDecisions: (decisions ?? []).length,
        riskPrediction: atRisk,
        engagementScore: avgAdherence,
      });
    } catch (e) {
      console.error("AI summary error:", e);
    }
  }, [user]);

  if (!user || dismissed) return null;

  const orbColors = {
    passive: "from-emerald-500/20 to-sky-500/20 shadow-emerald-500/10",
    detecting: "from-amber-500/30 to-sky-500/20 shadow-amber-500/15",
    critical: "from-red-500/30 to-amber-500/20 shadow-red-500/20",
    positive: "from-emerald-500/30 to-emerald-400/20 shadow-emerald-500/20",
  };

  const pulseSpeed = {
    passive: "animate-[pulse_4s_ease-in-out_infinite]",
    detecting: "animate-[pulse_2.5s_ease-in-out_infinite]",
    critical: "animate-[pulse_1.5s_ease-in-out_infinite]",
    positive: "animate-[pulse_3s_ease-in-out_infinite]",
  };

  return (
    <>
      {/* Floating Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
      >
        {/* Signal micro-message */}
        <AnimatePresence>
          {signal && !panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className={cn(
                "max-w-[240px] p-3 rounded-xl backdrop-blur-xl border text-xs",
                state === "critical"
                  ? "bg-red-950/80 border-red-500/30 text-red-200"
                  : state === "positive"
                  ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
                  : "bg-zinc-900/90 border-white/10 text-white/70"
              )}
            >
              <p className="leading-snug">{signal.message}</p>
              {signal.patientName && (
                <p className="text-[10px] mt-1 opacity-60">{signal.patientName}</p>
              )}
              {signal.patientId && (
                <div className="flex gap-1.5 mt-2">
                  <Link to={`/patients/${signal.patientId}`}>
                    <Button size="sm" variant="outline" className="h-6 text-[10px] border-white/20 text-white/60 hover:text-white">
                      <Eye className="w-3 h-3 mr-1" /> Revisar
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] text-white/40" onClick={() => setSignal(null)}>
                    <Clock className="w-3 h-3 mr-1" /> Depois
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orb button */}
        <button
          onClick={() => {
            if (!panelOpen) loadSummary();
            setPanelOpen(!panelOpen);
          }}
          className={cn(
            "relative w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center",
            "shadow-2xl transition-all duration-500 hover:scale-110",
            orbColors[state], pulseSpeed[state]
          )}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent" />
          <Brain className={cn("w-6 h-6 relative z-10",
            state === "critical" ? "text-red-300" :
            state === "positive" ? "text-emerald-300" :
            state === "detecting" ? "text-amber-300" : "text-white/60"
          )} />
          {state !== "passive" && (
            <div className={cn(
              "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950",
              state === "critical" ? "bg-red-500 animate-ping" :
              state === "positive" ? "bg-emerald-500" : "bg-amber-500"
            )} />
          )}
        </button>
      </motion.div>

      {/* Expanded Intelligence Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[320px] max-h-[70vh] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-sky-500/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">FitJourney AI</p>
                  <p className="text-[10px] text-white/30">Briefing Clínico</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[40px] min-w-[40px] p-0 text-white/30 hover:text-white hover:bg-white/10 rounded-full" onClick={() => setPanelOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Summary */}
            <div className="p-4 space-y-3">
              {summary ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Pacientes em Foco", value: summary.focusPatients, color: "text-red-400" },
                      { label: "Automações Hoje", value: summary.automationsToday, color: "text-violet-400" },
                      { label: "Decisões Pendentes", value: summary.pendingDecisions, color: "text-amber-400" },
                      { label: "Engajamento", value: `${summary.engagementScore}%`, color: "text-emerald-400" },
                    ].map(item => (
                      <div key={item.label} className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                        <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                        <p className="text-[9px] text-white/35">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <Link to="/control-tower" onClick={() => setPanelOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full text-xs border-white/10 text-white/60 hover:text-white gap-1.5 mt-2">
                      Abrir Control Tower <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
