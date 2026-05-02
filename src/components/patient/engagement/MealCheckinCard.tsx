import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEngagement } from "@/hooks/useEngagement";

interface MealCheckinCardProps {
  mealId: string;
  title: string;
  time: string;
  kcal: number;
}

export default function MealCheckinCard({ mealId, title, time, kcal }: MealCheckinCardProps) {
  const { checkins, toggleCheckin, isCheckingIn } = useEngagement();
  const isCompleted = checkins?.some(c => String(c.meal_id) === String(mealId) && c.completed);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
        isCompleted 
          ? "bg-primary/5 border-primary/20" 
          : "bg-card border-border/50 hover:border-primary/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isCompleted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-display font-bold text-sm">{title}</h4>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            <span>{time}</span>
            <span>•</span>
            <span>{kcal} kcal</span>
          </div>
        </div>
      </div>

      <Button 
        size="sm" 
        variant={isCompleted ? "ghost" : "outline"}
        disabled={isCheckingIn}
        className={`rounded-full px-4 h-8 text-xs font-bold transition-all ${
          isCompleted ? "text-primary hover:bg-primary/10" : "hover:border-primary hover:text-primary"
        }`}
        onClick={() => toggleCheckin(mealId, !isCompleted)}
      >
        {isCompleted ? "Concluído" : "Marcar"}
      </Button>
    </motion.div>
  );
}
