import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AchievementCard from "@/components/gamification/AchievementCard";
import { Trophy } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";
import ShareProgressButton from "@/components/social/ShareProgressButton";

type Achievement = Tables<"achievements">;
type UserAchievement = Tables<"user_achievements">;

export default function Achievements() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("achievements").select("*").order("requirement_value")
      .then(({ data }) => setAchievements(data || []));

    if (user) {
      supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id)
        .then(({ data }) => setEarned(new Set(data?.map(d => d.achievement_id) || [])));
    }
  }, [user]);

  const earnedCount = earned.size;
  const totalCount = achievements.length;

  const shareRef = useRef<HTMLDivElement>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6" ref={shareRef}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-accent" /> {t("achievements.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {earnedCount}/{totalCount} {t("achievements.unlocked")}
            </p>
          </div>
          <ShareProgressButton captureRef={shareRef} context="achievements" />
        </div>

        {/* Progress */}
        <div className="glass rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t("achievements.overallProgress")}</span>
            <span className="text-sm font-bold text-primary">
              {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(earnedCount / totalCount) * 100}%` : "0%" }}
              transition={{ duration: 1 }}
              className="h-full rounded-full gradient-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((a) => (
            <AchievementCard
              key={a.id}
              icon={a.icon}
              name={a.name}
              description={a.description}
              earned={earned.has(a.id)}
              xpReward={a.xp_reward}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}