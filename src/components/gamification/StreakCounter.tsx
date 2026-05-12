import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";

interface StreakCounterProps {
  current: number;
  longest: number;
}

export default function StreakCounter({ current, longest }: StreakCounterProps) {
  const streakIntensity = Math.min(current / 10, 1);

  return (
    <div className="glass-premium rounded-xl p-5 shadow-card shimmer-sweep">
      <div className="flex items-center gap-4">
        <motion.div
          animate={current > 0 ? {
            scale: [1, 1.12, 1],
            rotate: [0, -3, 3, 0],
          } : {}}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="relative"
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            current > 0
              ? "bg-gradient-to-br from-accent/20 to-accent/5"
              : "bg-muted/40"
          }`}>
            <Flame className={`w-7 h-7 ${current > 0 ? "text-accent" : "text-muted-foreground"}`} />
          </div>
          {current >= 7 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-accent-foreground">🔥</span>
            </motion.div>
          )}
        </motion.div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Streak atual</p>
          <div className="flex items-baseline gap-1.5">
            <motion.p
              key={current}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display font-bold text-3xl leading-none counter-animate"
            >
              {current}
            </motion.p>
            <span className="text-sm font-medium text-muted-foreground">dias</span>
          </div>
        </div>
      </div>

      {/* Streak progress dots */}
      <div className="flex gap-1 mt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < (current % 7) ? "bg-accent" : "bg-muted/50"
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <Trophy className="w-3.5 h-3.5 text-accent" />
        <span className="text-muted-foreground">Recorde:</span>
        <span className="font-bold text-foreground">{longest} dias</span>
        {current >= longest && current > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold ml-auto">
            Novo recorde! 🎉
          </span>
        )}
      </div>
    </div>
  );
}
