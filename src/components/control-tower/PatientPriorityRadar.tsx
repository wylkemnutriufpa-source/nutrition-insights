import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { cn } from "@v1/lib/utils";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Eye, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PatientCard {
  id: string;
  name: string;
  adherence: number;
  risk: number;
  riskLevel: string;
  lastActivity: string | null;
  trigger: string;
  zone: "stable" | "attention" | "critical";
}

const ZONE_CONFIG = {
  stable: { label: "Zona Estável", icon: ShieldCheck, border: "border-emerald-500/30", glow: "", dot: "bg-emerald-400", headerColor: "text-emerald-400" },
  attention: { label: "Zona de Atenção", icon: AlertTriangle, border: "border-amber-500/30", glow: "", dot: "bg-amber-400", headerColor: "text-amber-400" },
  critical: { label: "Zona Crítica", icon: ShieldAlert, border: "border-red-500/30", glow: "shadow-red-500/10 shadow-lg", dot: "bg-red-400", headerColor: "text-red-400" },
};

function AdherenceRing({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? "#34d399" : pct >= 40 ? "#fbbf24" : "#f87171";

  return (
    <svg width="40" height="40" className="flex-shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        className="transition-all duration-700"
      />
      <text x="20" y="20" textAnchor="middle" dy=".35em" className="fill-white text-[9px] font-bold">{pct}%</text>
    </svg>
  );
}

export default function PatientPriorityRadar() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { data: np } = await supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user!.id)
          .eq("status", "active");

        const ids = (np ?? []).map(p => p.patient_id);
        if (!ids.length) { setLoading(false); return; }

        const [{ data: snapshots }, { data: profiles }] = await Promise.all([
          (supabase as any)
            .from("clinical_daily_snapshots")
            .select("patient_id, adherence_score, dropout_risk_score, risk_level, momentum_direction, snapshot_date")
            .in("patient_id", ids)
            .order("snapshot_date", { ascending: false }),
          supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
        ]);

        const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? "Paciente"]));
        const latest = new Map<string, any>();
        for (const s of (snapshots ?? [])) {
          if (!latest.has(s.patient_id)) latest.set(s.patient_id, s);
        }

        const cards: PatientCard[] = Array.from(latest.values()).map(s => {
          const risk = s.dropout_risk_score ?? 0;
          const adherence = s.adherence_score ?? 0;
          let zone: PatientCard["zone"] = "stable";
          if (risk > 60 || adherence < 30) zone = "critical";
          else if (risk > 30 || adherence < 50) zone = "attention";

          let trigger = "Monitoramento normal";
          if (risk > 60) trigger = "Risco de abandono alto";
          else if (adherence < 30) trigger = "Adesão muito baixa";
          else if (risk > 30) trigger = "Risco moderado";
          else if (s.momentum_direction === "down") trigger = "Tendência negativa";

          return {
            id: s.patient_id,
            name: nameMap.get(s.patient_id) ?? "Paciente",
            adherence,
            risk,
            riskLevel: s.risk_level ?? "normal",
            lastActivity: s.snapshot_date,
            trigger,
            zone,
          };
        });

        cards.sort((a, b) => b.risk - a.risk);
        setPatients(cards);
      } catch (e) {
        console.error("Priority radar error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
    ))}</div>;
  }

  const zones: PatientCard["zone"][] = ["critical", "attention", "stable"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {zones.map(zone => {
        const cfg = ZONE_CONFIG[zone];
        const zonePatients = patients.filter(p => p.zone === zone);
        return (
          <div key={zone} className={cn("rounded-xl border bg-white/[0.02] backdrop-blur-sm overflow-hidden", cfg.border, cfg.glow)}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <cfg.icon className={cn("w-4 h-4", cfg.headerColor)} />
              <span className={cn("text-xs font-semibold uppercase tracking-wider", cfg.headerColor)}>{cfg.label}</span>
              <Badge variant="outline" className="ml-auto text-[10px] h-5 border-white/20 text-white/60">{zonePatients.length}</Badge>
            </div>
            <div className="p-2 space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-hide">
              {zonePatients.length === 0 && (
                <p className="text-xs text-white/30 text-center py-6">Nenhum paciente</p>
              )}
              {zonePatients.slice(0, 8).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: zone === "critical" ? -5 : 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all group",
                    zone === "critical" && "animate-[pulse_4s_ease-in-out_infinite] border-red-500/20"
                  )}
                >
                  <AdherenceRing value={p.adherence} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-white/40 truncate">{p.trigger}</p>
                    {p.lastActivity && (
                      <p className="text-[9px] text-white/25 mt-0.5">
                        {formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true, locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4 px-1.5",
                      p.risk > 60 ? "border-red-500/50 text-red-400" : p.risk > 30 ? "border-amber-500/50 text-amber-400" : "border-emerald-500/50 text-emerald-400"
                    )}>
                      R {p.risk}%
                    </Badge>
                    <Link to={`/v1/patients/${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
