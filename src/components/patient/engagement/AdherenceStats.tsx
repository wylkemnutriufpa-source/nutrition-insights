import { motion } from "framer-motion";
import { Flame, Target, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AdherenceStatsProps {
  streak: number;
  adherence: number;
  longestStreak?: number;
}

export default function AdherenceStats({ streak, adherence, longestStreak }: AdherenceStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div whileHover={{ y: -2 }}>
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Flame className="w-12 h-12 text-orange-500" />
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Sequência</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black">{streak}</span>
              <span className="text-xs text-muted-foreground font-medium">dias</span>
            </div>
            {longestStreak && longestStreak > streak && (
              <p className="text-[10px] text-muted-foreground mt-1">Recorde: {longestStreak} dias</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div whileHover={{ y: -2 }}>
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Target className="w-12 h-12 text-primary" />
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Adesão</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black">{adherence}%</span>
              <span className="text-xs text-muted-foreground font-medium">semanal</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
