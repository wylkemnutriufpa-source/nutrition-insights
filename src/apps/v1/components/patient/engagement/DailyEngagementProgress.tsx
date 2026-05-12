import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Trophy, Sparkles, Target, Star } from "lucide-react";

interface DailyEngagementProgressProps {
  completed: number;
  total: number;
  expectationMessage?: string | null;
  personalMessage?: string | null;
  rewardImpact?: "light" | "medium" | "strong";
}

export default function DailyEngagementProgress({ 
  completed, 
  total, 
  expectationMessage,
  personalMessage,
  rewardImpact = "light"
}: DailyEngagementProgressProps) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const getMotivationalMessage = (p: number) => {
    if (p === 100) return "Dia perfeito! Você é incrível! 🏆";
    if (p >= 75) return "Quase lá! Mantenha o foco! 🔥";
    if (p >= 50) return "Ótimo progresso! Continue assim! ✨";
    if (p > 0) return "Bom começo! Vamos bater a meta de hoje? 🎯";
    return "Que tal começar marcando sua primeira refeição? 👋";
  };

  const impactStyles = {
    light: "text-primary",
    medium: "text-amber-500",
    strong: "text-purple-600 animate-pulse font-black"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            Meta Diária {progress === 100 && <Trophy className="w-5 h-5 text-amber-500" />}
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            {getMotivationalMessage(progress)}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${impactStyles[rewardImpact]}`}>{progress}%</span>
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

      {(expectationMessage || personalMessage) && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-primary/5 rounded-lg p-3 space-y-2 border border-primary/10"
        >
          {expectationMessage && (
            <div className="flex items-start gap-2">
              <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-primary-foreground/80 dark:text-primary/90">
                {expectationMessage}
              </p>
            </div>
          )}
          {personalMessage && (
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-medium italic">
                "{personalMessage}"
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
