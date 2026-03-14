import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DisciplineScoreProps {
  userId: string;
}

export default function DisciplineScore({ userId }: DisciplineScoreProps) {
  const [score, setScore] = useState(0);
  const [trend, setTrend] = useState<"up" | "down" | "stable">("stable");
  const [details, setDetails] = useState({ streak: 0, weeklyAdherence: 0, mealConsistency: 0 });

  useEffect(() => {
    if (!userId) return;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    Promise.all([
      // Current week checklist adherence
      supabase
        .from("checklist_tasks")
        .select("completed")
        .eq("patient_id", userId)
        .gte("date", weekAgo.toISOString().split("T")[0]),
      // Previous week checklist adherence
      supabase
        .from("checklist_tasks")
        .select("completed")
        .eq("patient_id", userId)
        .gte("date", twoWeeksAgo.toISOString().split("T")[0])
        .lt("date", weekAgo.toISOString().split("T")[0]),
      // Streak
      supabase
        .from("player_stats")
        .select("current_streak")
        .eq("user_id", userId)
        .maybeSingle(),
      // Meals this week
      supabase
        .from("meals")
        .select("id")
        .eq("user_id", userId)
        .gte("logged_at", weekAgo.toISOString()),
    ]).then(([currentRes, prevRes, streakRes, mealsRes]) => {
      const currentTasks = currentRes.data || [];
      const prevTasks = prevRes.data || [];
      const streak = streakRes.data?.current_streak || 0;
      const mealsCount = mealsRes.data?.length || 0;

      const currentAdherence = currentTasks.length > 0
        ? Math.round((currentTasks.filter((t: any) => t.completed).length / currentTasks.length) * 100)
        : 0;
      const prevAdherence = prevTasks.length > 0
        ? Math.round((prevTasks.filter((t: any) => t.completed).length / prevTasks.length) * 100)
        : 0;

      // Meal consistency: expected ~3 meals/day * 7 days = 21
      const mealConsistency = Math.min(100, Math.round((mealsCount / 21) * 100));

      // Discipline score: weighted average
      const streakScore = Math.min(100, streak * 10); // 10 days = 100%
      const disciplineScore = Math.round(
        currentAdherence * 0.45 + streakScore * 0.30 + mealConsistency * 0.25
      );

      setScore(disciplineScore);
      setDetails({ streak, weeklyAdherence: currentAdherence, mealConsistency });

      if (currentAdherence > prevAdherence + 5) setTrend("up");
      else if (currentAdherence < prevAdherence - 5) setTrend("down");
      else setTrend("stable");
    });
  }, [userId]);

  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = () => {
    if (score >= 90) return "Impecável";
    if (score >= 75) return "Disciplinado";
    if (score >= 50) return "Regular";
    if (score >= 25) return "Irregular";
    return "Crítico";
  };

  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Score de Disciplina</p>
          <div className="flex items-center gap-1">
            <span className={`font-display font-bold text-lg ${getScoreColor()}`}>{getScoreLabel()}</span>
            {trend === "up" && <TrendingUp className="w-3 h-3 text-success" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 text-destructive" />}
            {trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
          <svg width={72} height={72} className="-rotate-90">
            <circle cx={36} cy={36} r={32} fill="none" strokeWidth={5} className="stroke-muted/20" />
            <motion.circle
              cx={36} cy={36} r={32} fill="none" strokeWidth={5} strokeLinecap="round"
              className={score >= 80 ? "stroke-success" : score >= 50 ? "stroke-warning" : "stroke-destructive"}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold text-lg ${getScoreColor()}`}>{score}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Checklist</span>
            <span className="text-[10px] font-semibold">{details.weeklyAdherence}%</span>
          </div>
          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${details.weeklyAdherence}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Streak</span>
            <span className="text-[10px] font-semibold">{details.streak}d</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Refeições</span>
            <span className="text-[10px] font-semibold">{details.mealConsistency}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
