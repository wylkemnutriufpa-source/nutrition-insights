import { motion } from "framer-motion";
import { AlertCircle, Flame, CheckCircle2, TrendingUp, Zap, Target, Trophy, Calendar } from "lucide-react";
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
    riskLevel,
    isDayComplete,
    dailyMission,
    daysToRecord
  } = useEngagement();

  if (!stats) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* Daily Mission */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Sua Missão de Hoje</p>
            <p className="text-sm font-bold text-foreground">{dailyMission}</p>
          </div>
        </div>
        {isDayComplete && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
      </motion.div>

      {/* Evolution Prediction */}
      {!isDayComplete && daysToRecord > 0 && (
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-3 h-3 text-primary" />
          <p className="text-[10px] text-muted-foreground">
            Se continuar assim, você bate seu recorde em <span className="text-primary font-bold">{daysToRecord} dias</span>
          </p>
        </div>
      )}
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

        {isDayComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/20 text-white overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-black leading-tight">Dia Finalizado!</p>
                  <p className="text-xs text-white/80">Você completou todas as refeições com sucesso.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                  <p className="text-[10px] uppercase font-bold text-white/60">Streak Atual</p>
                  <p className="text-xl font-black">{stats.current_streak} dias</p>
                </div>
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                  <p className="text-[10px] uppercase font-bold text-white/60">Adesão Hoje</p>
                  <p className="text-xl font-black">100%</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <p className="text-xs font-medium">Amanhã continuamos sua sequência!</p>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
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

      {/* Visual History (Calendar Style) */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Sua Jornada (Dia {stats.total_checkins + 1})</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Sua Constância</span>
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {[...Array(21)].map((_, i) => {
            // Simulated history visualization
            const isActive = i <= (stats.current_streak % 21);
            const isToday = i === (stats.current_streak % 21);
            return (
              <div 
                key={i} 
                className={`aspect-square rounded-sm transition-all duration-500 ${
                  isActive 
                    ? isToday ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'bg-primary/60' 
                    : 'bg-muted/40'
                }`}
              />
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground">
            {stats.weekly_adherence_pct}% de adesão semanal
          </p>
          <div className="flex items-center gap-2">
            {useEngagement().isBetterThanLastWeek && (
              <p className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Evoluindo!
              </p>
            )}
            <p className="text-[10px] text-emerald-600 font-bold">
              {stats.current_streak} dias seguidos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}