import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertTriangle, ShieldAlert, TrendingUp, Zap, Clock, Activity } from "lucide-react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { cn } from "@v1/lib/utils";

interface StatusMetric {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  glowColor: string;
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 800;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = value;
    }
    requestAnimationFrame(tick);
  }, [value]);

  return <span>{display}</span>;
}

export default function GlobalClinicalStatusBar() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [metrics, setMetrics] = useState<StatusMetric[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { data: patients } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "active");

        const ids = (patients ?? []).map(p => p.patient_id);
        if (!ids.length) {
          setMetrics([]);
          setLoaded(true);
          return;
        }

        const { data: snapshots } = await (supabase as any)
          .from("clinical_daily_snapshots")
          .select("patient_id, adherence_score, dropout_risk_score, risk_level, momentum_direction")
          .in("patient_id", ids)
          .order("snapshot_date", { ascending: false });

        const latest = new Map<string, any>();
        for (const s of (snapshots ?? [])) {
          if (!latest.has(s.patient_id)) latest.set(s.patient_id, s);
        }
        const all = Array.from(latest.values());

        const { data: alerts } = await withTenantFilter((supabase as any)
          .from("clinical_alerts")
          .select("id")
          .eq("nutritionist_id", user!.id)
          .eq("is_active", true), tenantId);

        const { data: decisions } = await (supabase as any)
          .from("clinical_decisions")
          .select("id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "pending");

        const { data: autoRuns } = await withTenantFilter((supabase as any)
          .from("automation_runs")
          .select("id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "success")
          .gte("executed_at", new Date(Date.now() - 86400000).toISOString()), tenantId);

        const critical = all.filter(s => (s.dropout_risk_score ?? 0) > 60 || s.risk_level === "critical").length;
        const positive = all.filter(s => (s.adherence_score ?? 0) > 70 && s.momentum_direction === "up").length;

        setMetrics([
          { label: "Pacientes Analisados", value: all.length, icon: Users, color: "text-sky-400", glowColor: "shadow-sky-400/30" },
          { label: "Alertas Críticos", value: (alerts ?? []).length, icon: AlertTriangle, color: "text-red-400", glowColor: "shadow-red-400/30" },
          { label: "Risco Clínico", value: critical, icon: ShieldAlert, color: "text-amber-400", glowColor: "shadow-amber-400/30" },
          { label: "Respondendo Bem", value: positive, icon: TrendingUp, color: "text-emerald-400", glowColor: "shadow-emerald-400/30" },
          { label: "Automações Hoje", value: (autoRuns ?? []).length, icon: Zap, color: "text-violet-400", glowColor: "shadow-violet-400/30" },
          { label: "Decisões Pendentes", value: (decisions ?? []).length, icon: Clock, color: "text-orange-400", glowColor: "shadow-orange-400/30" },
        ]);
      } catch (e) {
        console.error("StatusBar error:", e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, [user]);

  if (!loaded) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-w-[140px] h-20 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={cn(
            "relative min-w-[140px] flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-3.5",
            "hover:bg-white/[0.06] transition-all duration-300 group",
            m.value > 0 && `shadow-lg ${m.glowColor}`
          )}
        >
          {m.value > 0 && (
            <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse", m.color.replace("text-", "bg-"))} />
          )}
          <m.icon className={cn("w-4 h-4 mb-1.5", m.color)} />
          <p className="text-2xl font-bold text-white leading-none">
            <AnimatedCounter value={m.value} />
          </p>
          <p className="text-[10px] text-white/50 mt-1 leading-tight">{m.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
