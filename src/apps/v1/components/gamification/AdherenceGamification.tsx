import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import { Flame, Droplets, Dumbbell, UtensilsCrossed, Star, Trophy, Zap } from "lucide-react";
import { Progress } from "@v1/components/ui/progress";

// ── Category Points Config ──
const CATEGORY_POINTS: Record<string, number> = {
  hydration: 5,
  nutrition: 10,
  exercise: 15,
  supplement: 5,
  habit: 8,
  sleep: 8,
  mindfulness: 7,
};

function getCategoryPoints(category: string): number {
  return CATEGORY_POINTS[category.toLowerCase()] || 5;
}

// ── Daily Score Card ──
export function DailyScoreCard({ tasks }: { tasks: { category: string; completed: boolean }[] }) {
  const { earned, total } = useMemo(() => {
    let earned = 0;
    let total = 0;
    for (const t of tasks) {
      const pts = getCategoryPoints(t.category);
      total += pts;
      if (t.completed) earned += pts;
    }
    return { earned, total };
  }, [tasks]);

  const pct = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Star className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pontos Hoje</p>
            <p className="font-display font-bold text-lg leading-none">
              {earned}<span className="text-sm font-normal text-muted-foreground">/{total}</span>
            </p>
          </div>
        </div>
        <span className={`text-sm font-bold ${pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"}`}>
          {pct}%
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap mt-2">
        {tasks.map((t, i) => {
          return (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                t.completed ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {t.category}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Weekly Progress Bar ──
export function WeeklyProgressBar({ userId }: { userId: string }) {
  const [weekData, setWeekData] = useState<{ day: string; pct: number }[]>([]);

  useEffect(() => {
    if (!userId) return;
    const days: { day: string; pct: number }[] = [];
    const now = new Date();
    const promises: Promise<void>[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

      promises.push(
        supabase
          .from("checklist_tasks")
          .select("completed")
          .eq("patient_id", userId)
          .eq("date", dateStr)
          .then(({ data }) => {
            const total = data?.length || 0;
            const done = data?.filter((t: any) => t.completed).length || 0;
            days[6 - i] = { day: dayLabel, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
          }) as unknown as Promise<void>
      );
    }

    Promise.all(promises).then(() => setWeekData([...days]));
  }, [userId]);

  const avgPct = weekData.length > 0
    ? Math.round(weekData.reduce((a, b) => a + b.pct, 0) / weekData.length)
    : 0;

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Progresso Semanal</p>
            <p className="font-display font-bold text-lg leading-none">{avgPct}%</p>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-16">
        {weekData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-muted/30 rounded-full overflow-hidden" style={{ height: "48px" }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${d.pct}%` }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className={`w-full rounded-full ${d.pct >= 80 ? "bg-success" : d.pct >= 50 ? "bg-warning" : d.pct > 0 ? "bg-destructive/60" : "bg-muted/20"}`}
                style={{ marginTop: "auto" }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground capitalize">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Motivation Message ──
export function AIMotivationCard({ streak, checklistProgress }: { streak: number; checklistProgress: number }) {
  const message = useMemo(() => {
    if (streak >= 7 && checklistProgress >= 80) {
      return { text: `Incrível! 🔥 ${streak} dias seguidos com alta adesão. Você é uma inspiração!`, mood: "success" };
    }
    if (streak >= 3) {
      return { text: `Você está no ${streak}º dia de streak! Complete o checklist de hoje para manter o ritmo. 💪`, mood: "primary" };
    }
    if (streak === 0 && checklistProgress > 0) {
      return { text: "Novo dia, nova chance! Complete seu checklist para iniciar uma nova sequência. 🌟", mood: "warning" };
    }
    if (checklistProgress >= 80) {
      return { text: "Quase tudo completo hoje! Finalize as tarefas restantes para pontuação máxima. 🎯", mood: "primary" };
    }
    if (checklistProgress >= 50) {
      return { text: "Bom progresso hoje! Continue completando suas tarefas. Cada ponto conta! ⚡", mood: "info" };
    }
    return { text: "Comece seu dia completando o checklist. Pequenos passos levam a grandes resultados! 🚀", mood: "muted" };
  }, [streak, checklistProgress]);

  const colorMap: Record<string, string> = {
    success: "border-success/20 bg-success/5",
    primary: "border-primary/20 bg-primary/5",
    warning: "border-warning/20 bg-warning/5",
    info: "border-info/20 bg-info/5",
    muted: "border-border bg-muted/5",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[message.mood]}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow">
          <Flame className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-0.5">IA Motivacional</p>
          <p className="text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
