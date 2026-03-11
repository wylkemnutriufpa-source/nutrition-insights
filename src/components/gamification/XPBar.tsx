import { motion } from "framer-motion";
import { Zap, Star } from "lucide-react";

interface XPBarProps {
  totalXp: number;
  level: number;
}

function xpForLevel(level: number) {
  return level * 100;
}

export default function XPBar({ totalXp, level }: XPBarProps) {
  const currentLevelXp = xpForLevel(level);
  const xpInLevel = totalXp - (level > 1 ? Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0) : 0);
  const progress = Math.min((xpInLevel / currentLevelXp) * 100, 100);

  return (
    <div className="glass-premium rounded-xl p-5 shadow-card shimmer-sweep">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
          >
            <Zap className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nível</p>
            <div className="flex items-center gap-1.5">
              <p className="font-display font-bold text-2xl leading-none">{level}</p>
              {level >= 5 && <Star className="w-3.5 h-3.5 text-accent fill-accent" />}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">XP Total</p>
          <p className="font-display font-bold text-2xl leading-none text-primary counter-animate">{totalXp}</p>
        </div>
      </div>
      <div className="w-full h-3.5 rounded-full bg-muted/60 overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full gradient-xp shadow-glow relative"
        >
          <div className="absolute inset-0 rounded-full shimmer-sweep" />
        </motion.div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-muted-foreground font-medium">
          Próximo nível: {currentLevelXp - Math.round(xpInLevel)} XP restantes
        </p>
        <p className="text-[10px] text-primary font-bold">
          {Math.round(xpInLevel)}/{currentLevelXp} XP
        </p>
      </div>
    </div>
  );
}
