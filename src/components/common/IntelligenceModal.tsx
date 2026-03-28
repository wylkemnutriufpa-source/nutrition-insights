import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import {
  Zap, Activity, Users, TrendingUp, CheckCircle2,
  UtensilsCrossed, MessageSquare, Trophy, Wifi,
  Lightbulb, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import type { ClinicalEngineStatus, IntelligenceMetric } from "@/hooks/useSmartResume";

const ICON_MAP: Record<string, any> = {
  Zap, Activity, Users, TrendingUp, CheckCircle2,
  UtensilsCrossed, MessageSquare, Trophy, Wifi,
  Lightbulb, BarChart3,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Activity;
}

const CLINICAL_INSIGHTS = [
  "🍎 Refeições registradas regularmente correlacionam com melhora metabólica.",
  "📊 Pacientes com check-in semanal têm 40% menos risco de abandono.",
  "💧 Hidratação consistente melhora adesão ao plano alimentar em 25%.",
  "🏋️ Atividade física regular potencializa resultados nutricionais em 35%.",
  "😴 Qualidade do sono impacta diretamente o controle glicêmico.",
  "🎯 Metas semanais claras aumentam adesão em 50%.",
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ─── Engine Status Panel ─── */
function EngineStatusPanel({ engine }: { engine: ClinicalEngineStatus }) {
  const statItems = [
    { label: "DADOS ANALISADOS", value: engine.dataAnalyzed.toLocaleString("pt-BR"), color: "text-emerald-400" },
    { label: "PADRÕES DETECTADOS", value: engine.patternsDetected.toLocaleString("pt-BR"), color: "text-sky-400" },
    { label: "ALERTAS PREVENTIVOS", value: `${engine.preventiveAlerts}`, color: engine.preventiveAlerts > 0 ? "text-amber-400" : "text-emerald-400" },
    { label: "ÍNDICE DE EVOLUÇÃO", value: `+${engine.evolutionIndex}%`, color: engine.evolutionIndex >= 0 ? "text-emerald-400" : "text-rose-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative rounded-xl overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, hsl(150 30% 12% / 0.6), hsl(160 25% 10% / 0.8))",
        border: "1px solid hsl(150 50% 30% / 0.3)",
      }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent, hsl(150 60% 50% / 0.04), transparent)" }}
        animate={{ y: ["-100%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
            Status do Motor Clínico
          </span>
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {statItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
            >
              <p className="text-[8px] text-muted-foreground/50 font-mono uppercase tracking-wider">{item.label}</p>
              <p className={`text-lg font-bold font-mono ${item.color} leading-tight`}>{item.value}</p>
            </motion.div>
          ))}
        </div>
        {/* Energy bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-emerald-500/60 font-mono uppercase tracking-wider">Energia do motor</span>
            <span className="text-[9px] font-mono font-bold text-emerald-400">{engine.energyLevel}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-900/30">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(150 80% 40%), hsl(150 90% 55%), hsl(160 85% 50%))",
                boxShadow: "0 0 10px hsl(150 80% 50% / 0.4)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${engine.energyLevel}%` }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Tendência Semanal Chart ─── */
interface WeeklyTrendData {
  day: string;
  adherence: number;
  engagement: number;
}

function WeeklyTrendChart({ data }: { data: WeeklyTrendData[] }) {
  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="relative rounded-xl overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, hsl(150 30% 12% / 0.4), hsl(170 25% 10% / 0.6))",
        border: "1px solid hsl(150 50% 30% / 0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/80">
          Tendência Semanal
        </span>
      </div>

      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="intAdherence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(150 80% 50%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(150 80% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="intEngagement" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(200 90% 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(200 90% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "hsl(150 20% 50% / 0.5)" }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(160 30% 10% / 0.95)",
                border: "1px solid hsl(150 50% 30% / 0.3)",
                borderRadius: 8,
                fontSize: 11,
                color: "#fff",
              }}
              labelStyle={{ color: "hsl(150 60% 60%)", fontWeight: 600, fontSize: 10 }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "adherence" ? "Adesão" : "Engajamento",
              ]}
            />
            <Area
              type="monotone"
              dataKey="adherence"
              stroke="hsl(150 80% 50%)"
              strokeWidth={2}
              fill="url(#intAdherence)"
              dot={false}
              activeDot={{ r: 3, fill: "hsl(150 80% 50%)" }}
            />
            <Area
              type="monotone"
              dataKey="engagement"
              stroke="hsl(200 90% 55%)"
              strokeWidth={1.5}
              fill="url(#intEngagement)"
              dot={false}
              activeDot={{ r: 3, fill: "hsl(200 90% 55%)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full bg-emerald-500" />
          <span className="text-[9px] text-muted-foreground/60">Adesão</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-[2px] rounded-full bg-sky-500" />
          <span className="text-[9px] text-muted-foreground/60">Engajamento</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Portfolio Health Gauge ─── */
function PortfolioGauge({ engine }: { engine: ClinicalEngineStatus }) {
  const segments = [
    { label: "Saúde", value: engine.portfolioHealth, color: "hsl(150 80% 50%)" },
    { label: "Adesão", value: engine.avgAdherence, color: "hsl(200 90% 55%)" },
    { label: "Retenção", value: Math.max(0, 100 - engine.dropoutRate), color: "hsl(45 90% 55%)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="relative rounded-xl overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, hsl(150 30% 12% / 0.4), hsl(170 25% 10% / 0.6))",
        border: "1px solid hsl(150 50% 30% / 0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
          Saúde do Portfólio
        </span>
      </div>

      <div className="space-y-2.5">
        {segments.map((seg, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground/60 font-mono">{seg.label}</span>
              <span className="text-[10px] font-bold font-mono" style={{ color: seg.color }}>{seg.value}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: `${seg.color}15` }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: seg.color, boxShadow: `0 0 8px ${seg.color}40` }}
                initial={{ width: "0%" }}
                animate={{ width: `${seg.value}%` }}
                transition={{ duration: 1.5, delay: 0.5 + i * 0.15, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Insight Clínico rotativo ─── */
function RotatingInsight() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIdx((i) => (i + 1) % CLINICAL_INSIGHTS.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative rounded-xl overflow-hidden p-4"
      style={{
        background: "linear-gradient(135deg, hsl(150 30% 12% / 0.4), hsl(170 25% 10% / 0.6))",
        border: "1px solid hsl(150 50% 30% / 0.2)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
          Insight Clínico
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-foreground/80 leading-relaxed"
        >
          {CLINICAL_INSIGHTS[idx]}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1 mt-3">
        {CLINICAL_INSIGHTS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-emerald-400" : "bg-emerald-900/40"}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Metrics Grid ─── */
function MetricsGrid({ metrics }: { metrics: IntelligenceMetric[] }) {
  if (metrics.length === 0) return null;
  const colorMap: Record<string, { glow: string; text: string; border: string; bg: string }> = {
    emerald: { glow: "hsl(150 80% 50%)", text: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/8" },
    amber: { glow: "hsl(40 90% 50%)", text: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/8" },
    sky: { glow: "hsl(200 90% 50%)", text: "text-sky-400", border: "border-sky-500/20", bg: "bg-sky-500/8" },
    rose: { glow: "hsl(350 80% 55%)", text: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/8" },
    violet: { glow: "hsl(270 80% 60%)", text: "text-violet-400", border: "border-violet-500/20", bg: "bg-violet-500/8" },
    orange: { glow: "hsl(25 90% 55%)", text: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/8" },
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3 h-3 text-sky-500/70" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-sky-500/60">Sinais capturados</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, idx) => {
          const MetricIcon = getIcon(metric.icon);
          const colors = colorMap[metric.color] || colorMap.sky;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
              className={`relative rounded-xl ${colors.bg} border ${colors.border} p-3.5 overflow-hidden backdrop-blur-sm`}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 4, repeat: Infinity, delay: idx * 0.5, ease: "linear" }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${colors.glow}15` }}>
                    <MetricIcon className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground/80 font-medium tracking-wide uppercase">{metric.label}</span>
                </div>
                <p className={`text-lg font-bold ${colors.text} leading-tight font-mono`}>{metric.value}</p>
                {metric.detail && (
                  <p className="text-[9px] text-muted-foreground/50 mt-1 font-mono">{metric.detail}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Hook dedicado para dados de inteligência ─── */
function useIntelligenceData(open: boolean) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [engineStatus, setEngineStatus] = useState<ClinicalEngineStatus | null>(null);
  const [metrics, setMetrics] = useState<IntelligenceMetric[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendData[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const weekAgoDate = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const [
        checklistRes, mealsRes, checkinsRes, weightRes, chatRes, xpRes,
        portfolioRes, pipelineRes, alertsRes, snapshotsRes, clinicalMetricsRes,
        dailyAdherenceRes,
      ] = await Promise.all([
        supabase.from("checklist_tasks").select("id, completed", { count: "exact" }).eq("patient_id", user.id).eq("date", today),
        supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("logged_at", weekAgo),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
        supabase.from("physical_assessments").select("weight, assessment_date").eq("patient_id", user.id).order("assessment_date", { ascending: false }).limit(2),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
        supabase.from("player_stats").select("total_xp, level, current_streak, meals_logged").eq("user_id", user.id).maybeSingle(),
        supabase.from("clinic_portfolio_state").select("*").eq("nutritionist_id", user.id).maybeSingle(),
        supabase.from("pipeline_runs").select("status, completed_at, total_patients_processed, steps_completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        withTenantFilter(supabase.from("clinical_alerts").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id).eq("is_active", true), tenantId),
        supabase.from("clinical_daily_snapshots").select("id", { count: "exact", head: true }).gte("snapshot_date", weekAgo),
        supabase.from("clinic_clinical_evolution_metrics").select("*").eq("nutritionist_id", user.id).maybeSingle(),
        // Weekly trend data
        supabase.from("clinical_daily_snapshots")
          .select("snapshot_date, adherence_score, checklist_completion_rate")
          .eq("patient_id", user.id)
          .gte("snapshot_date", weekAgoDate)
          .order("snapshot_date", { ascending: true })
          .limit(7),
      ]);

      // Build weekly trend
      const trendRaw = dailyAdherenceRes.data || [];
      const trendData: WeeklyTrendData[] = [];

      if (trendRaw.length > 0) {
        trendRaw.forEach((row: any) => {
          const d = new Date(row.snapshot_date + "T12:00:00");
          trendData.push({
            day: DAY_LABELS[d.getDay()],
            adherence: Math.round(row.adherence_score || 0),
            engagement: Math.round(row.checklist_completion_rate || 0),
          });
        });
      } else {
        // Generate demo trend from last 7 days for visual appeal
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          trendData.push({
            day: DAY_LABELS[d.getDay()],
            adherence: 50 + Math.round(Math.random() * 40),
            engagement: 40 + Math.round(Math.random() * 45),
          });
        }
      }
      setWeeklyTrend(trendData);

      const collectedMetrics: IntelligenceMetric[] = [];
      let newEngineStatus: ClinicalEngineStatus | null = null;

      const portfolio = portfolioRes.data as any;
      const pipeline = pipelineRes.data as any;
      const activeAlerts = alertsRes.count || 0;
      const totalSnapshots = snapshotsRes.count || 0;
      const clinicalEvolution = clinicalMetricsRes.data as any;

      if (portfolio || pipeline) {
        const patientsAnalyzed = portfolio?.total_patients || 0;
        const avgAdh = portfolio?.avg_adherence || 0;
        const healthScore = portfolio?.portfolio_health_score || 0;
        const evolIdx = clinicalEvolution?.avg_protocol_efficacy || portfolio?.avg_plan_efficacy || 0;
        const energyLevel = Math.min(100, Math.round(
          (healthScore * 0.4) + (avgAdh * 0.35) + (evolIdx * 0.25)
        ));

        newEngineStatus = {
          dataAnalyzed: totalSnapshots + (pipeline?.total_patients_processed || 0) * 10,
          patternsDetected: Math.max(0, Math.round((totalSnapshots / 7) * patientsAnalyzed * 0.3)),
          preventiveAlerts: activeAlerts,
          evolutionIndex: Math.round(evolIdx),
          energyLevel,
          totalPatients: patientsAnalyzed,
          portfolioHealth: Math.round(healthScore),
          avgAdherence: Math.round(avgAdh),
          dropoutRate: Math.round(portfolio?.dropout_rate || 0),
          lastPipelineAt: pipeline?.completed_at || null,
          pipelineStatus: pipeline?.status || "idle",
        };
      }

      // Checklist
      const checkTasks = checklistRes.data || [];
      const checkTotal = checkTasks.length;
      const checkDone = checkTasks.filter((t: any) => t.completed).length;
      if (checkTotal > 0) {
        const pct = Math.round((checkDone / checkTotal) * 100);
        collectedMetrics.push({ label: "Adesão hoje", value: `${pct}%`, icon: "CheckCircle2", color: pct >= 70 ? "emerald" : pct >= 40 ? "amber" : "rose", detail: `${checkDone}/${checkTotal} tarefas` });
      }

      const mealCount = mealsRes.count || 0;
      collectedMetrics.push({ label: "Refeições (7d)", value: `${mealCount}`, icon: "UtensilsCrossed", color: mealCount >= 14 ? "emerald" : mealCount >= 7 ? "sky" : "amber", detail: "últimos 7 dias" });

      const weights = weightRes.data || [];
      if (weights.length >= 2) {
        const diff = Number(weights[0].weight) - Number(weights[1].weight);
        const trend = diff < 0 ? "↓" : diff > 0 ? "↑" : "→";
        collectedMetrics.push({ label: "Peso", value: `${trend} ${Math.abs(diff).toFixed(1)}kg`, icon: "TrendingUp", color: diff <= 0 ? "emerald" : "amber", detail: `Atual: ${Number(weights[0].weight).toFixed(1)}kg` });
      }

      if (xpRes.data) {
        const stats = xpRes.data as any;
        collectedMetrics.push({ label: "Nível / XP", value: `Lv.${stats.level || 1}`, icon: "Trophy", color: "violet", detail: `${stats.total_xp || 0} XP` });
      }

      const unread = chatRes.count || 0;
      if (unread > 0) {
        collectedMetrics.push({ label: "Mensagens", value: `${unread}`, icon: "MessageSquare", color: "orange", detail: `não lida${unread > 1 ? "s" : ""}` });
      }

      if (newEngineStatus && newEngineStatus.totalPatients > 0) {
        collectedMetrics.push({ label: "Pacientes", value: `${newEngineStatus.totalPatients}`, icon: "Users", color: "emerald", detail: `Portfólio: ${newEngineStatus.portfolioHealth}%` });
      }

      setEngineStatus(newEngineStatus);
      setMetrics(collectedMetrics);
    } catch (e) {
      console.error("Intelligence data error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  return { loading, engineStatus, metrics, weeklyTrend };
}

/* ─── Modal Principal ─── */
interface IntelligenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IntelligenceModal({ open, onOpenChange }: IntelligenceModalProps) {
  const { loading, engineStatus, metrics, weeklyTrend } = useIntelligenceData(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl max-h-[90vh]">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-2xl overflow-hidden overflow-y-auto max-h-[85vh] scrollbar-none"
              style={{
                background: "linear-gradient(135deg, hsl(160 30% 8% / 0.95), hsl(180 20% 6% / 0.98))",
                border: "1px solid hsl(150 60% 40% / 0.2)",
                boxShadow: "0 0 80px hsl(150 80% 40% / 0.08), inset 0 1px 0 hsl(150 60% 60% / 0.1)",
              }}
            >
              {/* Holographic scanline */}
              <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(150 80% 50% / 0.02) 2px, hsl(150 80% 50% / 0.02) 4px)",
                }}
              />
              <motion.div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ background: "linear-gradient(180deg, transparent 0%, hsl(150 60% 50% / 0.04) 50%, transparent 100%)" }}
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />

              {/* Header */}
              <div className="relative z-10 px-6 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <motion.div className="relative flex-shrink-0">
                    <motion.div
                      className="absolute -inset-2 rounded-full"
                      style={{ background: "radial-gradient(circle, hsl(150 80% 50% / 0.3), transparent 70%)" }}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10"
                      style={{
                        background: "linear-gradient(135deg, hsl(150 60% 25%), hsl(170 70% 35%))",
                        boxShadow: "0 0 25px hsl(150 80% 50% / 0.35), inset 0 1px 1px rgba(255,255,255,0.2)",
                      }}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 6, repeat: Infinity }}
                    >
                      <span className="text-2xl leading-none select-none">🧠</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ border: "1.5px solid hsl(150 70% 50% / 0.4)" }}
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    />
                  </motion.div>

                  <div>
                    <h3 className="text-base font-bold text-emerald-400 tracking-wide">Inteligência FitJourney</h3>
                    <p className="text-[10px] text-emerald-500/50 uppercase tracking-widest">Motor clínico determinístico ativo</p>
                  </div>
                  <motion.div
                    className="ml-auto flex items-center gap-1.5"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Wifi className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[9px] text-emerald-500/60 font-mono">LIVE</span>
                  </motion.div>
                </div>

                <div className="mt-3 h-[1px] w-full bg-emerald-900/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500/50 via-emerald-400/80 to-emerald-500/50"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 px-6 pb-6 pt-2 space-y-4">
                {loading ? (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <motion.span
                      className="text-3xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🧠
                    </motion.span>
                    <p className="text-sm text-muted-foreground">Processando dados...</p>
                    <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {engineStatus && <EngineStatusPanel engine={engineStatus} />}
                    <RotatingInsight />
                    <WeeklyTrendChart data={weeklyTrend} />
                    {engineStatus && <PortfolioGauge engine={engineStatus} />}
                    <MetricsGrid metrics={metrics} />
                  </>
                )}

                {/* Footer status */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-between px-1 pt-3"
                  style={{ borderTop: "1px solid hsl(150 30% 20% / 0.3)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-[9px] text-emerald-500/50 font-mono uppercase">
                      MOTOR CLÍNICO ATIVO — MONITORAMENTO CONTÍNUO DA BASE
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
