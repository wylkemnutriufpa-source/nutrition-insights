import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Sparkles, Sun, CloudRain, Flame, Award } from "lucide-react";

interface EmotionalFeedbackProps {
  userId: string;
}

interface FeedbackMessage {
  text: string;
  emoji: string;
  mood: "celebration" | "encouragement" | "gentle" | "alert" | "welcome";
  icon: typeof Heart;
}

export default function EmotionalFeedback({ userId }: EmotionalFeedbackProps) {
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    if (!userId) return;

    const today = new Date().toISOString().split("T")[0];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    Promise.all([
      supabase
        .from("player_stats")
        .select("current_streak, longest_streak, total_xp, level")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("checklist_tasks")
        .select("completed")
        .eq("patient_id", userId)
        .eq("date", today),
      supabase
        .from("meals")
        .select("id")
        .eq("user_id", userId)
        .gte("logged_at", threeDaysAgo.toISOString()),
      supabase
        .from("patient_points")
        .select("points")
        .eq("patient_id", userId)
        .gte("earned_at", threeDaysAgo.toISOString()),
    ]).then(([statsRes, checkRes, mealsRes, pointsRes]) => {
      const stats = statsRes.data;
      const tasks = checkRes.data || [];
      const mealsCount = mealsRes.data?.length || 0;
      const recentPoints = (pointsRes.data || []).reduce((s: number, p: any) => s + (p.points || 0), 0);

      const streak = stats?.current_streak || 0;
      const longestStreak = stats?.longest_streak || 0;
      const level = stats?.level || 1;
      const todayCompleted = tasks.filter((t: any) => t.completed).length;
      const todayTotal = tasks.length;
      const todayPct = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

      const hour = new Date().getHours();
      let msg: FeedbackMessage;

      // Breaking personal record
      if (streak > 0 && streak >= longestStreak && streak >= 5) {
        msg = {
          text: `Recorde pessoal! 🏆 ${streak} dias seguidos. Você está escrevendo sua melhor versão!`,
          emoji: "🏆",
          mood: "celebration",
          icon: Award,
        };
      }
      // Perfect day
      else if (todayPct >= 100) {
        msg = {
          text: "Dia perfeito! ✨ Todas as tarefas completas. Seu corpo agradece cada escolha inteligente.",
          emoji: "✨",
          mood: "celebration",
          icon: Sparkles,
        };
      }
      // Great streak
      else if (streak >= 7) {
        msg = {
          text: `${streak} dias de dedicação! 🔥 Você está criando hábitos que duram. Cada dia conta.`,
          emoji: "🔥",
          mood: "celebration",
          icon: Flame,
        };
      }
      // Good progress today
      else if (todayPct >= 70) {
        msg = {
          text: "Ótimo ritmo hoje! 💪 Faltam poucos passos para completar seu dia. Força!",
          emoji: "💪",
          mood: "encouragement",
          icon: Sun,
        };
      }
      // Morning motivation
      else if (hour < 12 && todayPct < 30) {
        msg = {
          text: "Bom dia! ☀️ Seu checklist está esperando. Comece pelo mais fácil — o ritmo vem depois.",
          emoji: "☀️",
          mood: "gentle",
          icon: Sun,
        };
      }
      // Afternoon nudge
      else if (hour >= 12 && hour < 18 && todayPct < 50) {
        msg = {
          text: "A tarde é sua aliada! 🌤️ Ainda dá tempo de fazer este dia valer. Uma tarefa por vez.",
          emoji: "🌤️",
          mood: "gentle",
          icon: Sun,
        };
      }
      // Low activity 3 days
      else if (mealsCount < 3) {
        msg = {
          text: "Sentimos sua falta! 🌱 Registre uma refeição ou complete uma tarefa. Pequenos passos = grandes mudanças.",
          emoji: "🌱",
          mood: "alert",
          icon: Heart,
        };
      }
      // Evening wrap-up
      else if (hour >= 18) {
        msg = {
          text: "Noite chegando! 🌙 Revise seu dia e complete o que puder. Amanhã é um novo começo.",
          emoji: "🌙",
          mood: "gentle",
          icon: Heart,
        };
      }
      // Default welcome
      else {
        msg = {
          text: "Cada escolha saudável é uma vitória! 💚 Continue construindo sua melhor versão.",
          emoji: "💚",
          mood: "welcome",
          icon: Heart,
        };
      }

      setMessage(msg);
    });
  }, [userId]);

  if (!message) return null;

  const moodStyles: Record<string, string> = {
    celebration: "border-success/30 bg-gradient-to-r from-success/5 to-success/10",
    encouragement: "border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10",
    gentle: "border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10",
    alert: "border-destructive/20 bg-gradient-to-r from-destructive/5 to-destructive/10",
    welcome: "border-border bg-gradient-to-r from-muted/5 to-muted/10",
  };

  const moodIconColor: Record<string, string> = {
    celebration: "gradient-primary shadow-glow",
    encouragement: "bg-primary/20",
    gentle: "bg-warning/20",
    alert: "bg-destructive/20",
    welcome: "bg-muted/20",
  };

  const Icon = message.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className={`rounded-xl border p-4 ${moodStyles[message.mood]}`}
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${moodIconColor[message.mood]}`}
          >
            <Icon className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              ❤️ Sistema Emocional
            </p>
            <p className="text-sm leading-relaxed">{message.text}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
