import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface MatrixPatient {
  id: string;
  name: string;
  adherence: number;
  progress: number; // derived from momentum + weight trend
  risk: number;
}

const QUADRANTS = [
  { label: "Performance Zone", x: "right", y: "top", color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/15" },
  { label: "Strategy Review", x: "right", y: "bottom", color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/15" },
  { label: "Consistency Watch", x: "left", y: "top", color: "text-sky-400", bg: "bg-sky-500/5", border: "border-sky-500/15" },
  { label: "Intervention Zone", x: "left", y: "bottom", color: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/15" },
];

export default function PatientHealthMatrix() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<MatrixPatient[]>([]);
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
            .select("patient_id, adherence_score, dropout_risk_score, momentum_direction, weight_trend")
            .in("patient_id", ids)
            .order("snapshot_date", { ascending: false }),
          supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
        ]);

        const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name ?? "Paciente"]));
        const latest = new Map<string, any>();
        for (const s of (snapshots ?? [])) {
          if (!latest.has(s.patient_id)) latest.set(s.patient_id, s);
        }

        const pts: MatrixPatient[] = Array.from(latest.values()).map(s => {
          let progress = 50;
          if (s.momentum_direction === "up") progress += 25;
          if (s.momentum_direction === "down") progress -= 25;
          if (s.weight_trend === "losing") progress += 15;
          if (s.weight_trend === "gaining") progress -= 15;
          progress = Math.max(0, Math.min(100, progress));

          return {
            id: s.patient_id,
            name: nameMap.get(s.patient_id) ?? "Paciente",
            adherence: s.adherence_score ?? 50,
            progress,
            risk: s.dropout_risk_score ?? 0,
          };
        });
        setPatients(pts);
      } catch (e) {
        console.error("Health matrix error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return <div className="h-[300px] rounded-xl bg-white/5 animate-pulse" />;
  }

  if (!patients.length) {
    return <p className="text-xs text-white/30 text-center py-12">Sem dados para exibir</p>;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="relative w-full aspect-square max-h-[360px] rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* Axis labels */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/25 uppercase tracking-widest">Adesão →</div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] text-white/25 uppercase tracking-widest">Progresso →</div>

        {/* Grid lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />

        {/* Quadrant labels */}
        {QUADRANTS.map(q => (
          <div
            key={q.label}
            className={cn(
              "absolute text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
              q.color,
              q.x === "right" ? "right-2" : "left-2",
              q.y === "top" ? "top-2" : "bottom-2",
            )}
          >
            {q.label}
          </div>
        ))}

        {/* Patient dots */}
        {patients.map(p => {
          const x = (p.adherence / 100) * 90 + 5;
          const y = 95 - (p.progress / 100) * 90;
          const dotColor = p.risk > 60 ? "bg-red-400" : p.risk > 30 ? "bg-amber-400" : "bg-emerald-400";
          const glowColor = p.risk > 60 ? "shadow-red-400/40" : p.risk > 30 ? "shadow-amber-400/40" : "shadow-emerald-400/40";

          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute w-3 h-3 rounded-full cursor-pointer transition-all duration-300 hover:scale-[2] hover:shadow-lg",
                    dotColor, glowColor, "shadow-md"
                  )}
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-zinc-900 border-white/10 text-white">
                <p className="font-semibold text-xs">{p.name}</p>
                <p className="text-[10px] text-white/60">Adesão: {p.adherence}% · Risco: {p.risk}%</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
