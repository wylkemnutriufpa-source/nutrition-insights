/**
 * Coach Retention Badge — Premium visual for athlete engagement
 */
import { Badge } from "@v1/components/ui/badge";
import { Card, CardContent } from "@v1/components/ui/card";
import { Shield, Flame, Star, TrendingUp, CheckCircle2 } from "lucide-react";

interface Props {
  totalCheckins: number;
  weekStreak: number;
  avgAdherence: number;
  compact?: boolean;
}

export default function CoachRetentionBadge({ totalCheckins, weekStreak, avgAdherence, compact = false }: Props) {
  const tier = weekStreak >= 12
    ? { label: "Elite", icon: Flame, color: "from-orange-500 to-red-600", border: "border-orange-500/30", text: "text-orange-400" }
    : weekStreak >= 8
    ? { label: "Ouro", icon: Star, color: "from-amber-500 to-orange-500", border: "border-amber-500/30", text: "text-amber-400" }
    : weekStreak >= 4
    ? { label: "Prata", icon: Shield, color: "from-slate-400 to-slate-500", border: "border-slate-400/30", text: "text-slate-400" }
    : { label: "Bronze", icon: TrendingUp, color: "from-amber-700 to-amber-800", border: "border-amber-700/30", text: "text-amber-600" };

  const Icon = tier.icon;

  if (compact) {
    return (
      <Badge className={`${tier.border} bg-gradient-to-r ${tier.color} text-white text-[10px] gap-1`}>
        <Icon className="w-3 h-3" />
        {tier.label}
      </Badge>
    );
  }

  return (
    <Card className={`${tier.border} overflow-hidden`}>
      <div className={`h-0.5 w-full bg-gradient-to-r ${tier.color}`} />
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${tier.text}`}>Selo {tier.label}</span>
              <Badge variant="outline" className="text-[9px]">Acompanhamento Premium</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalCheckins} check-ins · {weekStreak} semanas seguidas · {avgAdherence}% aderência
            </p>
          </div>
          <CheckCircle2 className={`w-5 h-5 ${tier.text} shrink-0`} />
        </div>
      </CardContent>
    </Card>
  );
}
