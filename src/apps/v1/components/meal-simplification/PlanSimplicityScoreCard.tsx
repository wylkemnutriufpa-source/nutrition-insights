import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, AlertTriangle, XCircle, Gauge } from "lucide-react";
import type { SimplicityScore } from "@/lib/planSimplicityEngine";
import { getScoreBadgeColor } from "@/lib/planSimplicityEngine";

interface PlanSimplicityScoreCardProps {
  score: SimplicityScore;
  compact?: boolean;
}

export default function PlanSimplicityScoreCard({ score, compact }: PlanSimplicityScoreCardProps) {
  const Icon = score.total >= 90 ? ShieldCheck : score.total >= 60 ? AlertTriangle : XCircle;
  const progressColor = score.total >= 90 ? "bg-green-500" : score.total >= 75 ? "bg-blue-500" : score.total >= 60 ? "bg-amber-500" : "bg-red-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${score.color}`} />
        <span className={`text-sm font-bold ${score.color}`}>{score.total}</span>
        <Badge variant="outline" className={`text-[10px] ${getScoreBadgeColor(score.total)}`}>
          {score.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Score de Simplicidade</span>
        </div>
        <Badge variant="outline" className={`text-xs ${getScoreBadgeColor(score.total)}`}>
          {score.label}
        </Badge>
      </div>

      <div className="flex items-end gap-3">
        <span className={`text-3xl font-bold ${score.color}`}>{score.total}</span>
        <span className="text-sm text-muted-foreground mb-1">/100</span>
      </div>

      <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${score.total}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{score.problematicMeals}</p>
          <p className="text-[10px] text-muted-foreground">Refeições com problema</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{score.blockedFoodsFound.length}</p>
          <p className="text-[10px] text-muted-foreground">Alimentos bloqueados</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-2">
          <p className="text-lg font-bold text-foreground">{score.issues.length}</p>
          <p className="text-[10px] text-muted-foreground">Problemas totais</p>
        </div>
      </div>
    </div>
  );
}
