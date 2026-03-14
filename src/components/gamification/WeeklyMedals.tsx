import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Medal, Trophy, Star, Zap, Flame, Target } from "lucide-react";

interface WeeklyMedal {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
}

interface WeeklyMedalsProps {
  userId: string;
}

export default function WeeklyMedals({ userId }: WeeklyMedalsProps) {
  const [medals, setMedals] = useState<WeeklyMedal[]>([]);

  useEffect(() => {
    if (!userId) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split("T")[0];

    Promise.all([
      supabase
        .from("checklist_tasks")
        .select("completed, date")
        .eq("patient_id", userId)
        .gte("date", weekStr),
      supabase
        .from("meals")
        .select("id")
        .eq("user_id", userId)
        .gte("logged_at", weekAgo.toISOString()),
      supabase
        .from("player_stats")
        .select("current_streak")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("patient_points")
        .select("points")
        .eq("patient_id", userId)
        .gte("earned_at", weekAgo.toISOString()),
    ]).then(([checkRes, mealsRes, streakRes, pointsRes]) => {
      const tasks = checkRes.data || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.completed).length;
      const adherence = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const mealsCount = mealsRes.data?.length || 0;
      const streak = streakRes.data?.current_streak || 0;
      const weeklyPoints = (pointsRes.data || []).reduce((sum: number, p: any) => sum + (p.points || 0), 0);

      // Check unique days with tasks completed
      const daysActive = new Set(
        tasks.filter((t: any) => t.completed).map((t: any) => t.date)
      ).size;

      const weeklyMedals: WeeklyMedal[] = [
        {
          id: "perfect_week",
          icon: "🏆",
          title: "Semana Perfeita",
          description: "100% do checklist na semana",
          earned: adherence >= 100,
        },
        {
          id: "consistency",
          icon: "🔥",
          title: "Consistência",
          description: "Ativo em pelo menos 5 dias",
          earned: daysActive >= 5,
        },
        {
          id: "meal_master",
          icon: "🍽️",
          title: "Mestre das Refeições",
          description: "15+ refeições registradas",
          earned: mealsCount >= 15,
        },
        {
          id: "streak_warrior",
          icon: "⚡",
          title: "Guerreiro do Streak",
          description: "7+ dias de sequência",
          earned: streak >= 7,
        },
        {
          id: "point_hunter",
          icon: "💎",
          title: "Caçador de Pontos",
          description: "200+ pontos na semana",
          earned: weeklyPoints >= 200,
        },
        {
          id: "dedication",
          icon: "🎯",
          title: "Dedicação Total",
          description: "80%+ de adesão semanal",
          earned: adherence >= 80,
        },
      ];

      setMedals(weeklyMedals);
    });
  }, [userId]);

  const earnedCount = medals.filter((m) => m.earned).length;

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Medal className="w-4 h-4 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Medalhas da Semana</p>
            <p className="font-display font-bold text-lg leading-none">
              {earnedCount}<span className="text-sm font-normal text-muted-foreground">/{medals.length}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {medals.map((medal, i) => (
          <motion.div
            key={medal.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`flex flex-col items-center p-2 rounded-lg transition-all ${
              medal.earned
                ? "bg-warning/10 ring-1 ring-warning/30"
                : "bg-muted/10 opacity-40 grayscale"
            }`}
          >
            <span className="text-2xl mb-1">{medal.icon}</span>
            <span className="text-[9px] font-semibold text-center leading-tight">{medal.title}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
