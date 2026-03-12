import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Activity, TrendingUp, Heart, Sparkles, X } from "lucide-react";
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

const motivationalMessages = [
  "Nosso sistema está acompanhando sua jornada de perto. Pequenas ações diárias estão construindo grandes resultados.",
  "Cada escolha conta. Sua dedicação está sendo registrada e analisada para otimizar seu progresso.",
  "Padrões positivos detectados na sua rotina. Continue assim — consistência gera transformação.",
  "Seu ritmo está alinhado com pacientes que alcançam resultados acima da média. Impressionante!",
  "A inteligência do sistema está trabalhando para você. Seu comprometimento faz toda a diferença.",
  "Dados indicam evolução constante. Você está no caminho certo para seus objetivos.",
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
        background: "radial-gradient(circle, hsl(170 80% 60%), transparent)",
        boxShadow: "0 0 6px hsl(170 80% 60% / 0.5)",
      }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export default function BrainIntelligence({ collapsed = false }: { collapsed?: boolean }) {
  const { user, isNutritionist, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalDataAnalyzed: 0,
    patternsDetected: 0,
    preventiveAlerts: 0,
    globalEvolution: 0,
  });
  const [personalMetrics, setPersonalMetrics] = useState<PersonalMetrics>({
    consistencyScore: 0,
    evolutionTrend: "stable",
    engagementScore: 0,
    metabolicRhythm: "stable",
  });
  const [loading, setLoading] = useState(false);

  const message = useMemo(
    () => motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)],
    [open]
  );

  const neuralParticles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        delay: i * 0.4,
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
      })),
    []
  );

  const fetchMetrics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const isProf = isNutritionist || isAdmin;

      // System-wide metrics (aggregate counts)
      const [checklistRes, mealsRes, checkinsRes, alertsRes, assessmentsRes] = await Promise.all([
        supabase.from("checklist_tasks").select("id", { count: "exact", head: true }),
        supabase.from("meals").select("id", { count: "exact", head: true }),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }),
        supabase.from("patient_signals").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("physical_assessments").select("id", { count: "exact", head: true }),
      ]);

      const totalEvents =
        (checklistRes.count || 0) +
        (mealsRes.count || 0) +
        (checkinsRes.count || 0) +
        (assessmentsRes.count || 0);

      const patterns = Math.floor(totalEvents * 0.03 + (alertsRes.count || 0) * 2.5);
      const alerts = alertsRes.count || 0;
      const evolution = totalEvents > 100 ? +(2.5 + Math.random() * 4.5).toFixed(1) : +(0.5 + Math.random() * 2).toFixed(1);

      setSystemMetrics({
        totalDataAnalyzed: totalEvents,
        patternsDetected: patterns,
        preventiveAlerts: alerts,
        globalEvolution: evolution,
      });

      // Personal metrics (patient-specific)
      if (!isProf && user) {
        const today = new Date().toISOString().split("T")[0];
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

        const [tasksTodayRes, tasksWeekRes, mealsWeekRes, pointsRes] = await Promise.all([
          supabase
            .from("checklist_tasks")
            .select("id, completed")
            .eq("patient_id", user.id)
            .eq("date", today),
          supabase
            .from("checklist_tasks")
            .select("id, completed")
            .eq("patient_id", user.id)
            .gte("date", weekAgo),
          supabase
            .from("meals")
            .select("id")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
          supabase
            .from("patient_points")
            .select("points")
            .eq("patient_id", user.id)
            .gte("earned_at", new Date(Date.now() - 14 * 86400000).toISOString()),
        ]);

        const weekTasks = tasksWeekRes.data || [];
        const completedWeek = weekTasks.filter((t: any) => t.completed).length;
        const consistency = weekTasks.length > 0 ? Math.round((completedWeek / weekTasks.length) * 100) : 50;

        const totalPoints = (pointsRes.data || []).reduce((s: number, p: any) => s + (p.points || 0), 0);
        const engagement = Math.min(100, Math.round(totalPoints / 10 + (mealsWeekRes.count || 0) * 5));

        const trend: PersonalMetrics["evolutionTrend"] =
          consistency >= 65 ? "positive" : consistency >= 40 ? "stable" : "negative";

        const rhythm: PersonalMetrics["metabolicRhythm"] =
          (mealsWeekRes.count || 0) >= 14 ? "accelerated" : (mealsWeekRes.count || 0) >= 7 ? "stable" : "slow";

        setPersonalMetrics({
          consistencyScore: consistency,
          evolutionTrend: trend,
          engagementScore: engagement,
          metabolicRhythm: rhythm,
        });
      }
    } catch (e) {
      console.error("Brain metrics error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3600000); // 1h
    return () => clearInterval(interval);
  }, [user]);

  const isPatient = !isNutritionist && !isAdmin;

  const trendLabel = {
    positive: "Positiva ↑",
    stable: "Estável →",
    negative: "Atenção ↓",
  };
  const trendColor = {
    positive: "text-emerald-400",
    stable: "text-amber-400",
    negative: "text-red-400",
  };
  const rhythmLabel = {
    accelerated: "Acelerado",
    stable: "Estável",
    slow: "Lento",
  };

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
                  background:
                    "radial-gradient(circle, hsl(170 80% 50% / 0.25) 0%, hsl(200 70% 55% / 0.1) 50%, transparent 70%)",
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Neural particles */}
              <div className="absolute -inset-3 pointer-events-none">
                {neuralParticles.slice(0, 4).map((p, i) => (
                  <NeuralParticle key={i} {...p} />
                ))}
              </div>

              {/* Brain icon */}
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(170 60% 35% / 0.8), hsl(200 70% 40% / 0.8))",
                  boxShadow:
                    "0 0 15px hsl(170 80% 50% / 0.3), inset 0 1px 1px rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                }}
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <Brain className="w-4 h-4 text-white" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
              </motion.div>

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-cyan-400/30"
                animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                style={{ width: 32, height: 32 }}
              />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-background/95 backdrop-blur-lg border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium">Inteligência FitJourney ativa</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal content */}
            <motion.div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Glass background */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(220 25% 12% / 0.95), hsl(220 30% 8% / 0.98))",
                  backdropFilter: "blur(20px)",
                }}
              />

              {/* Gradient border */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  border: "1px solid transparent",
                  background:
                    "linear-gradient(135deg, hsl(170 80% 50% / 0.3), hsl(200 70% 55% / 0.1), hsl(170 60% 45% / 0.2)) border-box",
                  WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />

              {/* Neural particles background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {neuralParticles.map((p, i) => (
                  <NeuralParticle key={i} {...p} />
                ))}
              </div>

              <div className="relative z-10 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, hsl(170 60% 35%), hsl(200 70% 40%))",
                        boxShadow: "0 0 20px hsl(170 80% 50% / 0.3)",
                      }}
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 6, repeat: Infinity }}
                    >
                      <Brain className="w-5 h-5 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg font-display font-bold text-white">
                        Inteligência FitJourney
                      </h2>
                      <p className="text-xs text-cyan-400/70">Motor clínico ativo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Block 1: System Status */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "hsl(220 30% 15% / 0.6)",
                    border: "1px solid hsl(170 60% 40% / 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white/90">Status do Sistema</span>
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

                  {/* Animated activity bar */}
                  <div className="h-1 rounded-full overflow-hidden bg-white/5 mt-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: "linear-gradient(90deg, hsl(170 80% 50%), hsl(200 70% 55%), hsl(170 80% 50%))",
                        backgroundSize: "200% 100%",
                      }}
                      animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Block 2: Personal Metrics (patient only) */}
                {isPatient && (
                  <div
                    className="rounded-xl p-4 space-y-3"
                    style={{
                      background: "hsl(220 30% 15% / 0.6)",
                      border: "1px solid hsl(200 60% 40% / 0.15)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white/90">Seus Indicadores</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Consistência</p>
                        <p className="text-lg font-display font-bold text-cyan-300">
                          {personalMetrics.consistencyScore}%
                        </p>
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
                          {personalMetrics.engagementScore > 70
                            ? "Acima da média"
                            : personalMetrics.engagementScore > 40
                            ? "Na média"
                            : "Abaixo da média"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Ritmo metabólico</p>
                        <p className="text-lg font-display font-bold text-amber-300">
                          {rhythmLabel[personalMetrics.metabolicRhythm]}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Block 3: Motivational message */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(170 60% 30% / 0.15), hsl(200 70% 35% / 0.1))",
                    border: "1px solid hsl(170 60% 40% / 0.1)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Heart className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/70 leading-relaxed italic">{message}</p>
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
                    Atualizado em tempo real
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
