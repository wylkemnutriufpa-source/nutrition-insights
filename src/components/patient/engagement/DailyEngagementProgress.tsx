import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Trophy, Sparkles } from "lucide-react";

interface DailyEngagementProgressProps {
  completed: number;
  total: number;
}

export default function DailyEngagementProgress({ completed, total }: DailyEngagementProgressProps) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const getMotivationalMessage = (p: number) => {
    if (p === 100) return "Dia perfeito! Você é incrível! 🏆";
    if (p >= 75) return "Quase lá! Mantenha o foco! 🔥";
    if (p >= 50) return "Ótimo progresso! Continue assim! ✨";
    if (p > 0) return "Bom começo! Vamos bater a meta de hoje? 🎯";
    return "Que tal começar marcando sua primeira refeição? 👋";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            Progresso do Dia {progress === 100 && <Trophy className="w-5 h-5 text-amber-500" />}
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            {getMotivationalMessage(progress)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-primary">{progress}%</span>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {completed}/{total} refeições
          </p>
        </div>
      </div>
      
      <div className="relative pt-1">
        <Progress value={progress} className="h-3 rounded-full bg-primary/10" />
        {progress > 0 && progress < 100 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-0 right-0 -mt-1 -mr-1"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </motion.div>
        )}
      </div>
    </div>
  );
}
