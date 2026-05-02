import { motion } from "framer-motion";
import { AlertCircle, Flame, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { useEngagement } from "@/hooks/useEngagement";
import { Button } from "@/components/ui/button";
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
            className="p-5 rounded-xl bg-rose-500 border-2 border-rose-600 shadow-lg shadow-rose-500/20 flex items-start gap-4 text-white"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <p className="text-base font-bold">Retome o controle agora!</p>
              <p className="text-sm text-white/90 mb-3">
                Você está perdendo o ritmo da sua evolução. Voltar hoje é 2x mais fácil que voltar amanhã.
              </p>
              <Button size="sm" variant="secondary" className="font-bold text-rose-600 bg-white hover:bg-white/90" asChild>
                <a href="/my-diet">Fazer check-in agora</a>
              </Button>
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
               className={`h-2 flex-1 rounded-full ${i < (stats.weekly_adherence_pct / 14.28) ? 'bg-primary' : 'bg-muted'} ${i === 6 ? 'animate-pulse' : ''}`} 
             />
           ))}
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">
            {stats.weekly_adherence_pct}% de adesão semanal
          </p>
          {stats.weekly_adherence_pct > 70 && (
            <p className="text-[10px] text-emerald-600 font-bold">
              {stats.weekly_adherence_pct > 90 ? "Consistência perfeita! 🔥" : "Você está acima da média! 🚀"}
            </p>
          )}
          {useEngagement().isBetterThanLastWeek && (
            <p className="text-[10px] text-primary font-bold">
              Melhor que semana passada! 📈
            </p>
          )}
        </div>
      </div>
    </div>
  );
}