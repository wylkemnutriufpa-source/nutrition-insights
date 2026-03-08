import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakCounterProps {
  current: number;
  longest: number;
}

export default function StreakCounter({ current, longest }: StreakCounterProps) {
  return (
    <div className="glass rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-3">
        <motion.div
          animate={current > 0 ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center"
        >
          <Flame className={`w-6 h-6 ${current > 0 ? "text-accent" : "text-muted-foreground"}`} />
        </motion.div>
        <div>
          <p className="text-xs text-muted-foreground">Streak atual</p>
          <p className="font-display font-bold text-2xl leading-none">
            {current} <span className="text-sm font-normal text-muted-foreground">dias</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>🏆 Recorde:</span>
        <span className="font-bold text-foreground">{longest} dias</span>
      </div>
    </div>
  );
}
