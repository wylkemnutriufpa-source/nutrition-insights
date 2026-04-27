import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Brain, Clock, TrendingDown, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { safeNum } from "@/lib/formatMacros";

interface BehaviorPattern {
  type: "peak_performance" | "weak_window" | "consistency_gap" | "recovery_signal";
  label: string;
  description: string;
  dayOfWeek?: string;
  timeWindow?: string;
  confidence: number;
}

const PATTERN_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  peak_performance: { icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  weak_window: { icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10" },
  consistency_gap: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
  recovery_signal: { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
};

const DAYS_PT: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta",
  4: "Quinta", 5: "Sexta", 6: "Sábado",
};

export default function PatientBehaviorLearningCard() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    detectPatterns(user.id).then((p) => {
      setPatterns(p);
      setLoading(false);
    });
  }, [user]);

  if (loading || patterns.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-premium rounded-2xl overflow-hidden shimmer-sweep"
    >
      <div className="p-5 pb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
          <Brain className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm">Inteligência Comportamental</h3>
          <p className="text-[10px] text-muted-foreground">Padrões detectados pelo sistema</p>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-2.5">
        {(patterns || []).slice(0, 4).map((pattern, i) => {
          const config = (pattern?.type && PATTERN_CONFIG[pattern.type]) || PATTERN_CONFIG.recovery_signal;
          const Icon = config.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
            >
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{pattern.label}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{pattern.description}</p>
                {pattern.timeWindow && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" /> {pattern.timeWindow}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{safeNum(pattern?.confidence)}%</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Pattern detection engine (deterministic, client-side) ───
async function detectPatterns(userId: string): Promise<BehaviorPattern[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("checklist_tasks")
    .select("date, completed, category, completed_at")
    .eq("patient_id", userId)
    .gte("date", dateStr)
    .order("date");

  if (!tasks || tasks.length < 14) return [];

  const patterns: BehaviorPattern[] = [];

  // Group by day of week
  const dayStats: Record<number, { total: number; done: number }> = {};
  for (const t of tasks) {
    const d = new Date(t.date).getDay();
    if (!dayStats[d]) dayStats[d] = { total: 0, done: 0 };
    dayStats[d].total++;
    if (t.completed) dayStats[d].done++;
  }

  // Find best and worst days
  let bestDay = -1, bestRate = 0, worstDay = -1, worstRate = 100;
  for (const [day, s] of Object.entries(dayStats)) {
    if (s.total < 5) continue;
    const rate = (s.done / s.total) * 100;
    if (rate > bestRate) { bestRate = rate; bestDay = Number(day); }
    if (rate < worstRate) { worstRate = rate; worstDay = Number(day); }
  }

  if (bestDay >= 0 && bestRate > 70) {
    patterns.push({
      type: "peak_performance",
      label: `Melhor dia: ${DAYS_PT[bestDay]}`,
      description: `Você tem ${Math.round(bestRate)}% de adesão neste dia. Continue assim!`,
      dayOfWeek: DAYS_PT[bestDay],
      confidence: Math.min(95, Math.round(bestRate)),
    });
  }

  if (worstDay >= 0 && worstRate < 50 && worstDay !== bestDay) {
    patterns.push({
      type: "weak_window",
      label: `Dia de atenção: ${DAYS_PT[worstDay]}`,
      description: `Sua adesão cai para ${Math.round(worstRate)}% neste dia. Planeje com antecedência.`,
      dayOfWeek: DAYS_PT[worstDay],
      confidence: Math.min(90, Math.round(100 - worstRate)),
    });
  }

  // Detect category gaps
  const catStats: Record<string, { total: number; done: number }> = {};
  for (const t of tasks) {
    const cat = (t.category || "geral").toLowerCase();
    if (!catStats[cat]) catStats[cat] = { total: 0, done: 0 };
    catStats[cat].total++;
    if (t.completed) catStats[cat].done++;
  }

  const weakCats = Object.entries(catStats)
    .filter(([, s]) => s.total >= 5 && (s.done / s.total) < 0.4)
    .sort((a, b) => (a[1].done / a[1].total) - (b[1].done / b[1].total));

  if (weakCats.length > 0) {
    const [cat, s] = weakCats[0];
    const catLabels: Record<string, string> = {
      hydration: "Hidratação", nutrition: "Nutrição", sleep: "Sono",
      exercise: "Exercício", supplement: "Suplementação",
    };
    patterns.push({
      type: "consistency_gap",
      label: `Gap: ${catLabels[cat] || cat}`,
      description: `Apenas ${Math.round((s.done / s.total) * 100)}% de conclusão. Foco nessa área.`,
      confidence: 75,
    });
  }

  // Detect recovery (improving trend last 7 vs prior 7)
  const recentTasks = tasks.filter(t => {
    const d = new Date(t.date);
    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
    return d >= sevenAgo;
  });
  const priorTasks = tasks.filter(t => {
    const d = new Date(t.date);
    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
    const fourteenAgo = new Date(); fourteenAgo.setDate(fourteenAgo.getDate() - 14);
    return d >= fourteenAgo && d < sevenAgo;
  });

  const recentRate = recentTasks.length > 0 ? recentTasks.filter(t => t.completed).length / recentTasks.length : 0;
  const priorRate = priorTasks.length > 0 ? priorTasks.filter(t => t.completed).length / priorTasks.length : 0;

  if (recentRate > priorRate + 0.15 && recentTasks.length >= 5) {
    patterns.push({
      type: "recovery_signal",
      label: "Tendência de Recuperação",
      description: `Sua adesão melhorou ${Math.round((recentRate - priorRate) * 100)}% na última semana. Ótimo progresso!`,
      confidence: 80,
    });
  }

  return patterns;
}
