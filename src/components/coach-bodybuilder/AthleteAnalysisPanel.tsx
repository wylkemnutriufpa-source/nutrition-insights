import type { AnalysisResult } from "@/lib/coachAnalysisEngine";
import { PHASE_LABELS } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, Droplets, TrendingDown, BarChart3 } from "lucide-react";
import CoachCompositeScore from "./CoachCompositeScore";

interface Props {
  analysis: AnalysisResult;
  checkins: any[];
  phase: string;
}

export default function AthleteAnalysisPanel({ analysis, checkins, phase }: Props) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            IFJ Analysis Engine — {PHASE_LABELS[phase] || phase}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{analysis.analysis_summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Composite Score */}
        <CoachCompositeScore score={analysis.composite_score} />

        {/* Indicators */}
        <div className="space-y-3">
          <IndicatorCard
            icon={TrendingDown}
            title="Platô de Peso"
            label={analysis.plateau_detected ? "Detectado" : "Não detectado"}
            severity={analysis.plateau_detected ? "warning" : "ok"}
          />
          <IndicatorCard
            icon={AlertTriangle}
            title="Risco de Catabolismo"
            label={analysis.catabolism_risk === "high" ? "Alto" : analysis.catabolism_risk === "moderate" ? "Moderado" : "Baixo"}
            severity={analysis.catabolism_risk === "high" ? "danger" : analysis.catabolism_risk === "moderate" ? "warning" : "ok"}
          />
          <IndicatorCard
            icon={Droplets}
            title="Retenção Hídrica"
            label={analysis.water_retention === "severe" ? "Severa" : analysis.water_retention === "moderate" ? "Moderada" : analysis.water_retention === "mild" ? "Leve" : "Normal"}
            severity={analysis.water_retention === "severe" ? "danger" : analysis.water_retention === "moderate" ? "warning" : "ok"}
          />
          <IndicatorCard
            icon={BarChart3}
            title="Consistência"
            label={analysis.evolution_consistency === "declining" ? "Em Declínio" : analysis.evolution_consistency === "irregular" ? "Irregular" : "Consistente"}
            severity={analysis.evolution_consistency === "declining" ? "danger" : analysis.evolution_consistency === "irregular" ? "warning" : "ok"}
          />
        </div>
      </div>

      {/* Checkin history */}
      {checkins.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Últimos Check-ins</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {checkins.slice(0, 10).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">{new Date(c.checkin_date).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-3">
                    {c.weight && <span>{c.weight}kg</span>}
                    {c.energy && <span>⚡{c.energy}</span>}
                    {c.performance && <span>🏋️{c.performance}</span>}
                    {c.adherence_pct != null && <span className="text-primary">{c.adherence_pct}%</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function IndicatorCard({ icon: Icon, title, label, severity }: {
  icon: any; title: string; label: string;
  severity: "ok" | "warning" | "danger";
}) {
  const colors = {
    ok: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-red-500/30 bg-red-500/5",
  };
  const badgeColors = {
    ok: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Card className={colors[severity]}>
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${severity === "ok" ? "text-emerald-400" : severity === "warning" ? "text-amber-400" : "text-red-400"}`} />
          <span className="font-medium text-sm text-foreground">{title}</span>
        </div>
        <Badge className={badgeColors[severity]}>{label}</Badge>
      </CardContent>
    </Card>
  );
}
