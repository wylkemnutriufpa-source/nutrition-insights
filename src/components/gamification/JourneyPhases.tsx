import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Lock, Check, ChevronRight, Star, Zap, Trophy, Flame } from "lucide-react";

interface Phase {
  id: number;
  title: string;
  description: string;
  icon: string;
  unlockCondition: string;
  unlocked: boolean;
  completed: boolean;
  progress: number;
}

export default function JourneyPhases() {
  const { user } = useAuth();
  const [phases, setPhases] = useState<Phase[]>([]);

  useEffect(() => {
    if (!user) return;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 30);

    Promise.all([
      supabase.from("player_stats").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("checklist_tasks").select("completed").eq("patient_id", user.id).gte("date", weekAgo.toISOString().split("T")[0]),
      supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("patient_id", user.id),
    ]).then(([statsRes, mealsRes, checklistRes, achievRes, checkinRes]) => {
      const stats = statsRes.data;
      const meals = mealsRes.count || 0;
      const tasks = checklistRes.data || [];
      const adherence = tasks.length > 0
        ? Math.round((tasks.filter((t: any) => t.completed).length / tasks.length) * 100)
        : 0;
      const achievements = achievRes.count || 0;
      const checkins = checkinRes.count || 0;
      const streak = stats?.current_streak || 0;
      const level = stats?.level || 1;
      const xp = stats?.total_xp || 0;

      const phaseList: Phase[] = [
        {
          id: 1,
          title: "Despertar",
          description: "Complete sua anamnese e registre 3 refeições",
          icon: "🌱",
          unlockCondition: "Início",
          unlocked: true,
          completed: meals >= 3,
          progress: Math.min(100, Math.round((meals / 3) * 100)),
        },
        {
          id: 2,
          title: "Fundação",
          description: "7 dias de streak e 50% adesão ao checklist",
          icon: "🧱",
          unlockCondition: "3 refeições registradas",
          unlocked: meals >= 3,
          completed: streak >= 7 && adherence >= 50,
          progress: Math.min(100, Math.round(((Math.min(streak, 7) / 7) * 50 + (Math.min(adherence, 50) / 50) * 50))),
        },
        {
          id: 3,
          title: "Disciplina",
          description: "14 dias streak, 70% adesão e 1 check-in",
          icon: "⚡",
          unlockCondition: "Fase Fundação completa",
          unlocked: streak >= 7 && adherence >= 50,
          completed: streak >= 14 && adherence >= 70 && checkins >= 1,
          progress: Math.min(100, Math.round(
            ((Math.min(streak, 14) / 14) * 33 +
            (Math.min(adherence, 70) / 70) * 33 +
            (Math.min(checkins, 1)) * 34)
          )),
        },
        {
          id: 4,
          title: "Consistência",
          description: "Nível 5, 80% adesão e 3 conquistas",
          icon: "🔥",
          unlockCondition: "Fase Disciplina completa",
          unlocked: streak >= 14 && adherence >= 70 && checkins >= 1,
          completed: level >= 5 && adherence >= 80 && achievements >= 3,
          progress: Math.min(100, Math.round(
            ((Math.min(level, 5) / 5) * 33 +
            (Math.min(adherence, 80) / 80) * 33 +
            (Math.min(achievements, 3) / 3) * 34)
          )),
        },
        {
          id: 5,
          title: "Maestria",
          description: "30 dias streak, 90% adesão, nível 10",
          icon: "🏆",
          unlockCondition: "Fase Consistência completa",
          unlocked: level >= 5 && adherence >= 80 && achievements >= 3,
          completed: streak >= 30 && adherence >= 90 && level >= 10,
          progress: Math.min(100, Math.round(
            ((Math.min(streak, 30) / 30) * 33 +
            (Math.min(adherence, 90) / 90) * 33 +
            (Math.min(level, 10) / 10) * 34)
          )),
        },
        {
          id: 6,
          title: "Lenda",
          description: "Nível 15, 5000 XP, 10+ conquistas",
          icon: "👑",
          unlockCondition: "Fase Maestria completa",
          unlocked: streak >= 30 && adherence >= 90 && level >= 10,
          completed: level >= 15 && xp >= 5000 && achievements >= 10,
          progress: Math.min(100, Math.round(
            ((Math.min(level, 15) / 15) * 33 +
            (Math.min(xp, 5000) / 5000) * 33 +
            (Math.min(achievements, 10) / 10) * 34)
          )),
        },
      ];

      setPhases(phaseList);
    });
  }, [user]);

  const currentPhase = phases.findIndex((p) => !p.completed);

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display font-bold text-sm">Jornada de Evolução</p>
          <p className="text-[10px] text-muted-foreground">
            Fase {currentPhase >= 0 ? currentPhase + 1 : phases.length} de {phases.length}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {phases.map((phase, i) => {
          const isCurrent = i === currentPhase;
          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative flex items-center gap-3 p-3 rounded-xl transition-all ${
                phase.completed
                  ? "bg-success/5 border border-success/20"
                  : isCurrent
                  ? "bg-primary/5 border border-primary/30 ring-1 ring-primary/20"
                  : !phase.unlocked
                  ? "bg-muted/5 border border-border opacity-50"
                  : "bg-card border border-border"
              }`}
            >
              {/* Phase icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                phase.completed ? "bg-success/20" : isCurrent ? "bg-primary/20" : "bg-muted/20"
              }`}>
                {phase.unlocked ? (
                  <span className="text-xl">{phase.icon}</span>
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm">{phase.title}</span>
                  {phase.completed && <Check className="w-3.5 h-3.5 text-success" />}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{phase.description}</p>
                {(isCurrent || (phase.unlocked && !phase.completed)) && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.progress}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                    <span className="text-[9px] font-semibold text-primary">{phase.progress}%</span>
                  </div>
                )}
              </div>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div className="absolute left-7 -bottom-2 w-0.5 h-2 bg-border z-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
