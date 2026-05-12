import type { CompositeScore } from "@v1/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Activity, Heart, Shield, Zap, Target } from "lucide-react";

const SCORE_ITEMS = [
  { key: "physical" as const, label: "Físico", icon: Activity, desc: "Evolução corporal e peso" },
  { key: "adherence" as const, label: "Adesão", icon: Target, desc: "Aderência ao protocolo" },
  { key: "recovery" as const, label: "Recuperação", icon: Heart, desc: "Sono, digestão, libido" },
  { key: "performance" as const, label: "Performance", icon: Zap, desc: "Pump, treino, carga" },
  { key: "risk" as const, label: "Risco", icon: Shield, desc: "Segurança geral (inverso)" },
];

function scoreColor(v: number) {
  if (v >= 70) return "text-emerald-400";
  if (v >= 40) return "text-amber-400";
  return "text-red-400";
}

function barBg(v: number) {
  if (v >= 70) return "bg-emerald-500";
  if (v >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function CoachCompositeScore({ score }: { score: CompositeScore }) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          Score de Preparação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall */}
        <div className="text-center py-2">
          <span className={`text-5xl font-black ${scoreColor(score.overall)}`}>{score.overall}</span>
          <span className="text-lg text-muted-foreground">/100</span>
        </div>

        {/* Sub scores */}
        <div className="space-y-3">
          {SCORE_ITEMS.map(item => {
            const val = score[item.key];
            const Icon = item.icon;
            return (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${scoreColor(val)}`} />
                    <span className="text-foreground font-medium">{item.label}</span>
                  </div>
                  <span className={`font-bold ${scoreColor(val)}`}>{val}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barBg(val)}`}
                    style={{ width: `${Math.min(100, val)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
