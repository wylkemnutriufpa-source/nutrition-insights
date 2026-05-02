import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEngagement } from "@/hooks/useEngagement";
import { format, parse } from "date-fns";

interface MealCheckinCardProps {
  mealId: string;
  title: string;
  time: string;
  kcal: number;
}

export default function MealCheckinCard({ mealId, title, time, kcal }: MealCheckinCardProps) {
  const { checkins, toggleCheckin, isCheckingIn } = useEngagement();
  const isCompleted = checkins?.some(c => String(c.meal_id) === String(mealId) && c.completed);
  
  // Detect if this is the "current" meal based on time (approx 1h window)
  const isCurrentTime = (() => {
    try {
      if (!time || time === "--:--") return false;
      const now = new Date();
      const mealTime = parse(time, "HH:mm", new Date());
      const diffMinutes = Math.abs((now.getTime() - mealTime.getTime()) / (1000 * 60));
      return diffMinutes <= 60; // 1 hour window
    } catch (e) {
      return false;
    }
  })();

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-2xl border transition-all flex items-center justify-between relative overflow-hidden ${
        isCompleted 
          ? "bg-primary/5 border-primary/20" 
          : isCurrentTime 
            ? "bg-primary/10 border-primary/40 shadow-md scale-[1.02]" 
            : "bg-card border-border/50 hover:border-primary/20"
      }`}
    >
      {isCurrentTime && !isCompleted && (
        <div className="absolute top-0 left-0 w-1 h-full bg-primary animate-pulse" />
      )}

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCompleted 
            ? "bg-primary/20 text-primary" 
            : isCurrentTime 
              ? "bg-primary text-primary-foreground animate-pulse" 
              : "bg-muted text-muted-foreground"
        }`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-display font-bold text-sm">{title}</h4>
            {isCurrentTime && !isCompleted && (
              <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-primary animate-bounce">
                <Clock className="w-2.5 h-2.5" /> Agora
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            <span>{time}</span>
            <span>•</span>
            <span>{kcal} kcal</span>
          </div>
        </div>
      </div>

      <Button 
        size="sm" 
        variant={isCompleted ? "ghost" : isCurrentTime ? "default" : "outline"}
        disabled={isCheckingIn}
        className={`rounded-full px-4 h-8 text-xs font-bold transition-all ${
          isCompleted 
            ? "text-primary hover:bg-primary/10" 
            : isCurrentTime 
              ? "shadow-sm" 
              : "hover:border-primary hover:text-primary"
        }`}
        onClick={() => toggleCheckin(mealId, !isCompleted)}
      >
        {isCompleted ? "Concluído" : "Marcar"}
      </Button>
    </motion.div>
  );
}
