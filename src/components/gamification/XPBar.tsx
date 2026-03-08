import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface XPBarProps {
  totalXp: number;
  level: number;
}

function xpForLevel(level: number) {
  return level * 100;
}

export default function XPBar({ totalXp, level }: XPBarProps) {
  const currentLevelXp = xpForLevel(level);
  const prevLevelXp = xpForLevel(level - 1);
  const xpInLevel = totalXp - (level > 1 ? Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0) : 0);
  const progress = Math.min((xpInLevel / currentLevelXp) * 100, 100);

  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Nível</p>
            <p className="font-display font-bold text-lg leading-none">{level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">XP Total</p>
          <p className="font-display font-bold text-lg leading-none text-primary">{totalXp}</p>
        </div>
      </div>
      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full gradient-xp shadow-glow"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {Math.round(xpInLevel)}/{currentLevelXp} XP
      </p>
    </div>
  );
}
