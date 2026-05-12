
import React from "react";
import { Trophy, Star, Zap, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AchievementBadgesProps {
  achievements: {
    oneDay: boolean;
    threeDays: boolean;
    sevenDays: boolean;
  };
}

export default function AchievementBadges({ achievements }: AchievementBadgesProps) {
  const badgeList = [
    { 
      key: "oneDay", 
      label: "Primeiro Passo", 
      icon: <CheckCircle2 className="w-4 h-4" />, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      description: "Completou seu primeiro dia de check-in!"
    },
    { 
      key: "threeDays", 
      label: "Consistente", 
      icon: <Zap className="w-4 h-4" />, 
      color: "text-orange-500", 
      bg: "bg-orange-500/10",
      description: "3 dias seguidos no plano!"
    },
    { 
      key: "sevenDays", 
      label: "Imbatível", 
      icon: <Trophy className="w-4 h-4" />, 
      color: "text-yellow-500", 
      bg: "bg-yellow-500/10",
      description: "Uma semana inteira de foco total!"
    },
  ];

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        {badgeList.map((badge, idx) => {
          const active = achievements[badge.key as keyof typeof achievements];
          return (
            <Tooltip key={badge.key}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={false}
                  animate={{ 
                    scale: active ? 1 : 0.9,
                    opacity: active ? 1 : 0.3,
                    filter: active ? "grayscale(0%)" : "grayscale(100%)"
                  }}
                  className={`p-2 rounded-full ${active ? badge.bg : "bg-muted"} ${active ? badge.color : "text-muted-foreground"} border border-border/50`}
                >
                  {badge.icon}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">{badge.label}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
                {!active && <p className="text-[10px] mt-1 text-primary">Bloqueado</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
