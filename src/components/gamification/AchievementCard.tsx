import { motion } from "framer-motion";

interface AchievementCardProps {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  xpReward: number;
}

export default function AchievementCard({ icon, name, description, earned, xpReward }: AchievementCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`glass rounded-xl p-4 shadow-card transition-all ${
        earned ? "ring-2 ring-primary/30" : "opacity-50 grayscale"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-sm">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs font-bold text-primary">+{xpReward} XP</span>
            {earned && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">
                ✓ Conquistado
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
