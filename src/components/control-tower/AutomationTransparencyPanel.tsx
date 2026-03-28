import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { cn } from "@/lib/utils";
import { Zap, Clock, ShieldCheck, Activity } from "lucide-react";

interface AutoStats {
  executedToday: number;
  pendingApproval: number;
  blockedByGuardrail: number;
  confidenceIndex: number;
}

export default function AutomationTransparencyPanel() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [stats, setStats] = useState<AutoStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [{ data: runs }, { data: decisions }, { data: guardrails }] = await Promise.all([
          withTenantFilter((supabase as any)
            .from("automation_runs")
            .select("id, status")
            .eq("nutritionist_id", user!.id)
            .gte("executed_at", todayStart.toISOString()), tenantId),
          (supabase as any)
            .from("clinical_decisions")
            .select("id, confidence")
            .eq("nutritionist_id", user!.id)
            .eq("status", "pending"),
          (supabase as any)
            .from("clinical_auto_adjustment_logs")
            .select("id, approved_by_guardrail")
            .eq("approved_by_guardrail", false)
            .gte("created_at", todayStart.toISOString()),
        ]);

        const allRuns = runs ?? [];
        const allDecisions = decisions ?? [];
        const confidences = allDecisions.map((d: any) => d.confidence ?? 0).filter(Boolean);

        setStats({
          executedToday: allRuns.filter((r: any) => r.status === "success").length,
          pendingApproval: allDecisions.length,
          blockedByGuardrail: (guardrails ?? []).length,
          confidenceIndex: confidences.length ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length) : 0,
        });
      } catch (e) {
        console.error("Automation panel error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
    ))}</div>;
  }

  if (!stats) return null;

  const cards = [
    { icon: Zap, label: "Automações Executadas", value: stats.executedToday, color: "text-emerald-400", glowColor: "shadow-emerald-400/20", sub: "hoje" },
    { icon: Clock, label: "Aguardando Aprovação", value: stats.pendingApproval, color: "text-amber-400", glowColor: "shadow-amber-400/20", sub: "decisões" },
    { icon: ShieldCheck, label: "Bloqueadas por Guardrail", value: stats.blockedByGuardrail, color: "text-sky-400", glowColor: "shadow-sky-400/20", sub: "segurança" },
    { icon: Activity, label: "Índice de Confiança", value: stats.confidenceIndex, color: "text-violet-400", glowColor: "shadow-violet-400/20", sub: "%" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            "rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center",
            c.value > 0 && `shadow-lg ${c.glowColor}`
          )}
        >
          <c.icon className={cn("w-5 h-5 mx-auto mb-2", c.color)} />
          <p className="text-2xl font-bold text-white">{c.value}{c.sub === "%" && "%"}</p>
          <p className="text-[10px] text-white/40 mt-1">{c.label}</p>
          {c.sub !== "%" && <p className="text-[9px] text-white/25">{c.sub}</p>}
        </motion.div>
      ))}
      <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
        <p className="text-[10px] text-white/30 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          FitJourney AI — Inteligente mas clinicamente responsável
        </p>
      </div>
    </div>
  );
}
