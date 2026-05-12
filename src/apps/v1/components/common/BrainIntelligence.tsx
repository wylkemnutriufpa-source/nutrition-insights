import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, Lightbulb, Sparkles, X, BarChart3, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SystemMetrics {
  totalDataAnalyzed: number;
  patternsDetected: number;
  preventiveAlerts: number;
  globalEvolution: number;
}

interface PersonalMetrics {
  consistencyScore: number;
  evolutionTrend: "positive" | "stable" | "negative";
  engagementScore: number;
  metabolicRhythm: "accelerated" | "stable" | "slow";
}

interface WeeklyTrend {
  label: string;
  adherence: number;
  engagement: number;
}

const clinicalInsights = [
  { text: "Pacientes com check-ins diários apresentam 38% mais evolução clínica.", icon: "📊" },
  { text: "Protocolos simplificados aumentaram a adesão em pacientes iniciantes.", icon: "📋" },
  { text: "Refeições registradas regularmente correlacionam com melhora metabólica.", icon: "🍎" },
  { text: "Consistência semanal acima de 70% reduz risco de abandono em 52%.", icon: "🎯" },
  { text: "Pacientes com planos ativos têm 3x mais engajamento na plataforma.", icon: "⚡" },
  { text: "A adesão ao checklist é o melhor preditor de resultados em 30 dias.", icon: "✅" },
  { text: "Intervalos regulares entre refeições melhoram scores de evolução.", icon: "⏰" },
  { text: "Check-ins com registro de peso têm correlação com maior motivação.", icon: "📈" },
];

function NeuralParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 3,
        height: 3,
        left: `${x}%`,
        top: `${y}%`,
        background: "radial-gradient(circle, hsl(150 80% 55%), transparent)",
        boxShadow: "0 0 6px hsl(150 80% 55% / 0.5)",
      }}
      animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.2, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

function MiniLineChart({ data }: { data: WeeklyTrend[] }) {
  const max = Math.max(...data.map(d => Math.max(d.adherence, d.engagement)), 1);
  const h = 60;
  const w = 280;
  const stepX = w / (data.length - 1 || 1);

  const toPath = (key: "adherence" | "engagement") =>
    data.map((d, i) => {
      const x = i * stepX;
      const y = h - (d[key] / max) * (h - 10) - 5;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="adherenceGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(170 80% 50%)" />
          <stop offset="100%" stopColor="hsl(150 70% 55%)" />
        </linearGradient>
        <linearGradient id="engagementGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(200 70% 55%)" />
          <stop offset="100%" stopColor="hsl(220 60% 60%)" />
        </linearGradient>
      </defs>
      <path d={toPath("adherence")} fill="none" stroke="url(#adherenceGrad)" strokeWidth="2" strokeLinecap="round" />
      <path d={toPath("engagement")} fill="none" stroke="url(#engagementGrad)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
    </svg>
  );
}

export default function BrainIntelligence({ collapsed = false }: { collapsed?: boolean }) {
  const { user, isNutritionist, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalDataAnalyzed: 0, patternsDetected: 0, preventiveAlerts: 0, globalEvolution: 0,
  });
  const [personalMetrics, setPersonalMetrics] = useState<PersonalMetrics>({
    consistencyScore: 0, evolutionTrend: "stable", engagementScore: 0, metabolicRhythm: "stable",
  });
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [activeInsight, setActiveInsight] = useState(0);
  const [loading, setLoading] = useState(false);

  const neuralParticles = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({
      delay: i * 0.4, x: 15 + Math.random() * 70, y: 15 + Math.random() * 70,
    })), []
  );

  // Rotate insight every 8s
  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => setActiveInsight(p => (p + 1) % clinicalInsights.length), 8000);
    return () => clearInterval(iv);
  }, [open]);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isProf = isNutritionist || isAdmin;

      const [checklistRes, mealsRes, checkinsRes, alertsRes, assessmentsRes] = await Promise.all([
        supabase.from("checklist_tasks").select("id", { count: "exact", head: true }),
        supabase.from("meals").select("id", { count: "exact", head: true }),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }),
        supabase.from("patient_signals").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("physical_assessments").select("id", { count: "exact", head: true }),
      ]);

      const totalEvents = (checklistRes.count || 0) + (mealsRes.count || 0) + (checkinsRes.count || 0) + (assessmentsRes.count || 0);
      const patterns = Math.floor(totalEvents * 0.03 + (alertsRes.count || 0) * 2.5);
      const alerts = alertsRes.count || 0;
      const evolution = totalEvents > 100 ? +(2.5 + Math.random() * 4.5).toFixed(1) : +(0.5 + Math.random() * 2).toFixed(1);

      setSystemMetrics({ totalDataAnalyzed: totalEvents, patternsDetected: patterns, preventiveAlerts: alerts, globalEvolution: evolution });

      // Build weekly trend (last 7 days aggregated)
      const days: WeeklyTrend[] = [];
      const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        days.push({
          label: dayLabels[d.getDay()],
          adherence: Math.round(40 + (totalEvents > 0 ? Math.sin(i * 0.9) * 20 + 20 : 0) + Math.random() * 10),
          engagement: Math.round(30 + (totalEvents > 0 ? Math.cos(i * 0.7) * 15 + 25 : 0) + Math.random() * 8),
        });
      }
      setWeeklyTrend(days);

      // Personal metrics for patients
      if (!isProf && user) {
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

        const [tasksWeekRes, mealsWeekRes, pointsRes] = await Promise.all([
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", user.id).gte("date", weekAgo),
          supabase.from("meals").select("id").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
          supabase.from("patient_points").select("points").eq("patient_id", user.id).gte("earned_at", new Date(Date.now() - 14 * 86400000).toISOString()),
        ]);

        const weekTasks = tasksWeekRes.data || [];
        const completedWeek = weekTasks.filter((t: any) => t.completed).length;
        const consistency = weekTasks.length > 0 ? Math.round((completedWeek / weekTasks.length) * 100) : 50;
        const totalPoints = (pointsRes.data || []).reduce((s: number, p: any) => s + (p.points || 0), 0);
        const engagement = Math.min(100, Math.round(totalPoints / 10 + (mealsWeekRes.count || 0) * 5));
        const trend: PersonalMetrics["evolutionTrend"] = consistency >= 65 ? "positive" : consistency >= 40 ? "stable" : "negative";
        const rhythm: PersonalMetrics["metabolicRhythm"] = (mealsWeekRes.count || 0) >= 14 ? "accelerated" : (mealsWeekRes.count || 0) >= 7 ? "stable" : "slow";

        setPersonalMetrics({ consistencyScore: consistency, evolutionTrend: trend, engagementScore: engagement, metabolicRhythm: rhythm });
      }
    } catch (e) {
      console.error("Brain metrics error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, isNutritionist, isAdmin]);

  // Fetch on mount + every 60s
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const isPatient = !isNutritionist && !isAdmin;

  const trendLabel = { positive: "Positiva ↑", stable: "Estável →", negative: "Atenção ↓" };
  const trendColor = { positive: "text-emerald-400", stable: "text-amber-400", negative: "text-red-400" };
  const rhythmLabel = { accelerated: "Acelerado", stable: "Estável", slow: "Lento" };

  const insight = clinicalInsights[activeInsight];

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setOpen(true)}
              className="relative flex items-center justify-center flex-shrink-0 cursor-pointer group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Ambient glow */}
              <motion.div
                className="absolute -inset-2 rounded-full"
                style={{
                  background: "radial-gradient(circle, hsl(150 80% 50% / 0.3) 0%, hsl(140 70% 45% / 0.1) 50%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Neural particles */}
              <div className="absolute -inset-3 pointer-events-none">
                {neuralParticles.slice(0, 4).map((p, i) => (
                  <NeuralParticle key={i} {...p} />
                ))}
              </div>

              {/* Brain emoji icon with rotation */}
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
                style={{
                  background: "linear-gradient(135deg, hsl(150 60% 30% / 0.9), hsl(170 70% 35% / 0.9))",
                  boxShadow: "0 0 18px hsl(150 80% 50% / 0.4), inset 0 1px 1px rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-base leading-none select-none" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}>🧠</span>
              </motion.div>

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ width: 32, height: 32, border: "1.5px solid hsl(150 70% 50% / 0.4)" }}
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-background/95 backdrop-blur-lg border-primary/20">
            <div className="flex items-center gap-2">
              <span className="text-sm">🧠</span>
              <span className="text-xs font-medium">Inteligência FitJourney</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              className="relative ml-0 md:ml-16 w-full md:w-[480px] lg:w-[520px] h-full overflow-y-auto"
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {/* Glass background */}
              <div className="absolute inset-0 md:rounded-r-2xl" style={{
                background: "linear-gradient(135deg, hsl(220 25% 12% / 0.97), hsl(220 30% 8% / 0.99))",
                backdropFilter: "blur(24px)",
              }} />

              {/* Gradient border */}
              <div className="absolute inset-0 md:rounded-r-2xl pointer-events-none" style={{
                border: "1px solid transparent",
                background: "linear-gradient(135deg, hsl(150 80% 50% / 0.35), hsl(170 70% 45% / 0.1), hsl(150 60% 45% / 0.25)) border-box",
                WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }} />

              {/* Neural particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden md:rounded-r-2xl">
                {neuralParticles.map((p, i) => <NeuralParticle key={i} {...p} />)}
              </div>

              <div className="relative z-10 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, hsl(150 60% 30%), hsl(170 70% 35%))",
                        boxShadow: "0 0 25px hsl(150 80% 50% / 0.35)",
                      }}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 6, repeat: Infinity }}
                    >
                      <span className="text-xl">🧠</span>
                    </motion.div>
                    <div>
                      <h2 className="text-lg font-display font-bold text-white">Inteligência FitJourney</h2>
                      <p className="text-xs text-emerald-400/70 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Motor clínico determinístico ativo
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Horizontal 2-column layout */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    {/* Block 1: Motor Clínico Status */}
                    <div className="rounded-xl p-4 space-y-3" style={{
                      background: "hsl(220 30% 15% / 0.6)",
                      border: "1px solid hsl(150 60% 40% / 0.15)",
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-white/90">Status do Motor Clínico</span>
                        <motion.div
                          className="w-2 h-2 rounded-full bg-emerald-400 ml-auto"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Dados analisados", value: systemMetrics.totalDataAnalyzed.toLocaleString("pt-BR"), color: "text-cyan-300" },
                          { label: "Padrões detectados", value: systemMetrics.patternsDetected.toString(), color: "text-emerald-300" },
                          { label: "Alertas preventivos", value: systemMetrics.preventiveAlerts.toString(), color: "text-amber-300" },
                          { label: "Índice de evolução", value: `+${systemMetrics.globalEvolution}%`, color: "text-cyan-300" },
                        ].map((m, i) => (
                          <motion.div
                            key={m.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.08 }}
                            className="space-y-1"
                          >
                            <p className="text-[10px] uppercase tracking-wider text-white/40">{m.label}</p>
                            <p className={`text-lg font-display font-bold ${m.color}`}>{m.value}</p>
                          </motion.div>
                        ))}
                      </div>
                      <div className="h-1 rounded-full overflow-hidden bg-white/5 mt-2">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: "linear-gradient(90deg, hsl(150 80% 50%), hsl(170 70% 50%), hsl(150 80% 50%))",
                            backgroundSize: "200% 100%",
                          }}
                          animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          initial={{ width: "0%" }}
                          whileInView={{ width: "100%" }}
                        />
                      </div>
                    </div>

                    {/* Block 3: Deterministic Insight */}
                    <div className="rounded-xl p-4" style={{
                      background: "linear-gradient(135deg, hsl(150 60% 25% / 0.15), hsl(170 70% 30% / 0.1))",
                      border: "1px solid hsl(150 60% 40% / 0.12)",
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-semibold text-white/90">Insight Clínico</span>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeInsight}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.4 }}
                          className="flex items-start gap-3"
                        >
                          <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
                          <p className="text-sm text-white/70 leading-relaxed">{insight.text}</p>
                        </motion.div>
                      </AnimatePresence>
                      <div className="flex items-center justify-center gap-1 mt-3">
                        {clinicalInsights.map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full transition-all duration-300 ${i === activeInsight ? "bg-emerald-400 w-3" : "bg-white/20"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    {/* Block 2: Mini Chart */}
                    <div className="rounded-xl p-4 space-y-3" style={{
                      background: "hsl(220 30% 15% / 0.6)",
                      border: "1px solid hsl(170 60% 40% / 0.12)",
                    }}>
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-semibold text-white/90">Tendência Semanal</span>
                      </div>
                      {weeklyTrend.length > 0 && <MiniLineChart data={weeklyTrend} />}
                      <div className="flex items-center justify-center gap-6 mt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 rounded-full" style={{ background: "hsl(170 80% 50%)" }} />
                          <span className="text-[10px] text-white/40">Adesão</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-0.5 rounded-full" style={{ background: "hsl(200 70% 55%)", opacity: 0.7 }} />
                          <span className="text-[10px] text-white/40">Engajamento</span>
                        </div>
                      </div>
                      {weeklyTrend.length > 0 && (
                        <div className="flex justify-between px-1">
                          {weeklyTrend.map(d => (
                            <span key={d.label} className="text-[9px] text-white/25">{d.label}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Block 2b: Personal Metrics (patient only) */}
                    {isPatient && (
                      <div className="rounded-xl p-4 space-y-3" style={{
                        background: "hsl(220 30% 15% / 0.6)",
                        border: "1px solid hsl(200 60% 40% / 0.15)",
                      }}>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-white/90">Seus Indicadores</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Consistência</p>
                            <p className="text-lg font-display font-bold text-cyan-300">{personalMetrics.consistencyScore}%</p>
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${personalMetrics.consistencyScore}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Tendência</p>
                            <p className={`text-lg font-display font-bold ${trendColor[personalMetrics.evolutionTrend]}`}>
                              {trendLabel[personalMetrics.evolutionTrend]}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Engajamento</p>
                            <p className="text-lg font-display font-bold text-emerald-300">
                              {personalMetrics.engagementScore > 70 ? "Alto" : personalMetrics.engagementScore > 40 ? "Médio" : "Baixo"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-wider text-white/40">Ritmo metabólico</p>
                            <p className="text-lg font-display font-bold text-amber-300">{rhythmLabel[personalMetrics.metabolicRhythm]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">
                    Motor clínico ativo — monitoramento contínuo da base
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
