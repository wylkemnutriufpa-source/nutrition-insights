import { motion } from "framer-motion";
import { AlertCircle, Flame, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { useEngagement } from "@/hooks/useEngagement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function PatientRetentionAlerts() {
  const { 
    stats, 
    isStreakAtRisk, 
    isNearCompletion, 
    identityStatus, 
    progressPct,
    remainingMeals,
    riskLevel 
  } = useEngagement();

  if (!stats) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* Identity Status & Quick Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Seu Status</p>
            <p className="text-sm font-bold text-foreground">{identityStatus}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Progresso Hoje</p>
          <p className="text-sm font-bold text-primary">{Math.round(progressPct)}%</p>
        </div>
      </div>

      <Progress value={progressPct} className="h-2 bg-muted/30" />

      {/* Psychological Alerts */}
      <div className="grid grid-cols-1 gap-3">
        {isStreakAtRisk && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3"
          >
            <Flame className="w-5 h-5 text-orange-500 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-orange-600">Alerta de Perda!</p>
              <p className="text-xs text-orange-600/80">
                Você pode perder sua sequência de <span className="font-bold">{stats.current_streak} dias</span> hoje. Complete suas refeições!
              </p>
            </div>
          </motion.div>
        )}

        {isNearCompletion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-600">Quase lá!</p>
              <p className="text-xs text-emerald-600/80">
                Falta só mais {remainingMeals} {remainingMeals === 1 ? 'refeição' : 'refeições'} para completar o dia. Você consegue!
              </p>
            </div>
          </motion.div>
        )}

        {riskLevel === "risco_alto" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-600">Sentimos sua falta!</p>
              <p className="text-xs text-rose-600/80">
                Faz tempo que você não registra suas refeições. Que tal voltar hoje e retomar o foco?
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Weekly Feedback (Simple) */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Sua Evolução</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Últimos 7 dias</span>
        </div>
        <div className="flex items-center gap-1 justify-between">
           {[...Array(7)].map((_, i) => (
             <div 
               key={i} 
               className={`h-1.5 flex-1 rounded-full ${i < (stats.weekly_adherence_pct / 14) ? 'bg-primary' : 'bg-muted'}`} 
             />
           ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Você está com {stats.weekly_adherence_pct}% de adesão nesta semana.
        </p>
      </div>
    </div>
  );
}