import { useActiveMissions, useAdherenceScore } from "@v1/hooks/queries/useEngagement";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Progress } from "@v1/components/ui/progress";
import { Badge } from "@v1/components/ui/badge";
import { Target, Flame, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export function DailyMissionsWidget() {
  const { t } = useTranslation();
  const { data: missions = [] } = useActiveMissions();
  const { data: adherenceHistory = [] } = useAdherenceScore();
  const todayAdherence = adherenceHistory[0];

  if (missions.length === 0 && !todayAdherence) return null;

  const score = todayAdherence?.total_score ?? 0;
  const streak = todayAdherence?.streak_days ?? 0;

  const getMomentum = () => {
    if (score >= 70) return { label: "🔥 Em alta", color: "text-orange-500", bg: "bg-orange-500/10" };
    if (score >= 40) return { label: "⚖️ Estável", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { label: "⚠️ Em risco", color: "text-red-500", bg: "bg-red-500/10" };
  };
  const momentum = getMomentum();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Missões do Dia
          </CardTitle>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Flame className="h-3 w-3 text-orange-500" />
                {streak}d streak
              </Badge>
            )}
            <Badge className={`${momentum.bg} ${momentum.color} border-0 text-xs`}>
              {momentum.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adherence Score Ring */}
        {todayAdherence && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="relative h-14 w-14 flex-shrink-0">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted stroke-current"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                />
                <path
                  className="text-primary stroke-current transition-all duration-1000"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${score}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {Math.round(score)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Score de Aderência</p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>Checklist {Math.round(todayAdherence.checklist_score ?? 0)}%</span>
                <span>Refeições {Math.round(todayAdherence.meals_score ?? 0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Missions */}
        <AnimatePresence>
          {missions.map((mission, i) => {
            const progress = mission.target_value > 0
              ? Math.min(100, ((mission.current_value ?? 0) / mission.target_value) * 100)
              : 0;
            return (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="text-2xl flex-shrink-0">{mission.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mission.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{mission.description}</p>
                  <Progress value={progress} className="h-1.5 mt-2" />
                </div>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs gap-0.5">
                    <Zap className="h-3 w-3" />
                    {mission.xp_reward}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {missions.length === 0 && todayAdherence && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-primary/40" />
            Nenhuma missão pendente. Continue assim! 💪
          </div>
        )}
      </CardContent>
    </Card>
  );
}
