import { useMemo } from "react";
import { useAdherenceScore } from "@v1/hooks/queries/useEngagement";
import { Badge } from "@v1/components/ui/badge";
import { Card, CardContent } from "@v1/components/ui/card";
import { motion } from "framer-motion";
import { Flame, Scale, AlertTriangle, TrendingUp, TrendingDown, Minus, ShieldAlert } from "lucide-react";

type MomentumLevel = "fire" | "stable" | "declining" | "critical";

interface MomentumData {
  level: MomentumLevel;
  label: string;
  icon: typeof Flame;
  emoji: string;
  color: string;
  bgGradient: string;
  description: string;
  score: number;
  trend: number;
  streakDays: number;
}

function calculateMomentum(history: Array<{ total_score: number | null; streak_days: number | null; date: string }>): MomentumData {
  if (history.length === 0) {
    return {
      level: "stable", label: "Iniciando", icon: Scale, emoji: "🆕",
      color: "text-muted-foreground", bgGradient: "from-muted/30 to-muted/10",
      description: "Complete tarefas para ativar seu momentum!", score: 0, trend: 0, streakDays: 0,
    };
  }

  const recent = history.slice(0, 7);
  const older = history.slice(7, 14);
  const avgRecent = recent.reduce((s, d) => s + (Number(d.total_score) || 0), 0) / Math.max(recent.length, 1);
  const avgOlder = older.length > 0 ? older.reduce((s, d) => s + (Number(d.total_score) || 0), 0) / older.length : avgRecent;
  const trend = avgRecent - avgOlder;
  const streakDays = Number(history[0]?.streak_days) || 0;

  // Count active days in last 7
  const activeDays = recent.filter(d => (Number(d.total_score) || 0) > 0).length;
  const consistency = activeDays / Math.max(recent.length, 1);

  // 🔥 Alto: high score AND improving/stable AND streak AND consistent
  if (avgRecent >= 65 && trend >= -5 && streakDays >= 3 && consistency >= 0.6) {
    return {
      level: "fire", label: "Em Alta", icon: Flame, emoji: "🔥",
      color: "text-orange-500", bgGradient: "from-orange-500/15 to-amber-500/5",
      description: `Score ${Math.round(avgRecent)}% com ${streakDays} dias de streak. Continue assim!`,
      score: avgRecent, trend, streakDays,
    };
  }

  // 🚨 Crítico: very low score OR massive drop OR no activity
  if (avgRecent < 20 || (trend < -30 && avgRecent < 40) || (activeDays <= 1 && history.length >= 7)) {
    return {
      level: "critical", label: "Crítico", icon: ShieldAlert, emoji: "🚨",
      color: "text-red-600", bgGradient: "from-red-600/15 to-red-600/5",
      description: activeDays <= 1
        ? "Quase sem atividade nos últimos 7 dias. Precisamos conversar!"
        : trend < -30
          ? `Queda de ${Math.abs(Math.round(trend))}% na aderência. Intervenção necessária.`
          : `Score em ${Math.round(avgRecent)}%. Momento de reengajar!`,
      score: avgRecent, trend, streakDays,
    };
  }

  // 📉 Em Queda: declining trend OR broken streak with mediocre score
  if (trend < -10 || (streakDays === 0 && avgRecent < 50) || (avgRecent < 45 && trend < -5)) {
    return {
      level: "declining", label: "Em Queda", icon: AlertTriangle, emoji: "📉",
      color: "text-red-500", bgGradient: "from-red-500/15 to-red-500/5",
      description: trend < -10
        ? `Aderência caiu ${Math.abs(Math.round(trend))}% esta semana. Hora de retomar!`
        : `Score em ${Math.round(avgRecent)}%. Que tal começar com uma micro-meta?`,
      score: avgRecent, trend, streakDays,
    };
  }

  // ⚖️ Estável: everything else
  return {
    level: "stable", label: "Estável", icon: Scale, emoji: "⚖️",
    color: "text-yellow-500", bgGradient: "from-yellow-500/15 to-yellow-500/5",
    description: `Score ${Math.round(avgRecent)}%. Mantenha a consistência para subir de nível!`,
    score: avgRecent, trend, streakDays,
  };
}

interface MomentumIndicatorProps {
  variant?: "card" | "badge" | "inline";
  patientId?: string;
  adherenceHistory?: Array<{ total_score: number | null; streak_days: number | null; date: string }>;
}

export function MomentumIndicator({ variant = "card", patientId, adherenceHistory }: MomentumIndicatorProps) {
  // If adherenceHistory is provided externally (e.g. nutritionist view), use it directly
  const { data: ownHistory = [] } = useAdherenceScore();
  const history = adherenceHistory ?? ownHistory;
  const momentum = useMemo(() => calculateMomentum(history), [history]);
  const Icon = momentum.icon;
  const TrendIcon = momentum.trend > 5 ? TrendingUp : momentum.trend < -5 ? TrendingDown : Minus;

  if (variant === "badge") {
    return (
      <Badge variant="outline" className={`gap-1 ${momentum.color}`}>
        <span>{momentum.emoji}</span> {momentum.label}
      </Badge>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${momentum.color}`}>
        <span className="text-lg">{momentum.emoji}</span>
        <span className="text-sm font-medium">{momentum.label}</span>
        <TrendIcon className="h-3 w-3" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`overflow-hidden border-0 bg-gradient-to-br ${momentum.bgGradient}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={momentum.level === "fire" ? { scale: [1, 1.15, 1] } : momentum.level === "critical" ? { rotate: [0, -5, 5, 0] } : {}}
              transition={{ repeat: Infinity, duration: momentum.level === "critical" ? 2 : 1.5 }}
              className="text-4xl"
            >
              {momentum.emoji}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${momentum.color}`}>{momentum.label}</span>
                <div className="flex items-center gap-1">
                  <TrendIcon className={`h-4 w-4 ${momentum.trend > 0 ? "text-green-500" : momentum.trend < 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  <span className="text-xs text-muted-foreground">
                    {momentum.trend > 0 ? "+" : ""}{Math.round(momentum.trend)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{momentum.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold">{Math.round(momentum.score)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { calculateMomentum };
export type { MomentumLevel, MomentumData };
