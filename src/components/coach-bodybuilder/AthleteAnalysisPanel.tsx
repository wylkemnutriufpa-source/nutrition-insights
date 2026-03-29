import type { AnalysisResult } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, Droplets, TrendingDown, BarChart3 } from "lucide-react";

const PHASE_LABELS: Record<string, string> = {
  cutting: "Cutting", bulking: "Bulking", peak_week: "Peak Week",
  reverse: "Reverse Diet", maintenance: "Manutenção",
};

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            IFJ Analysis Engine — {PHASE_LABELS[phase]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{analysis.analysis_summary}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score Geral:</span>
            <span className={`text-2xl font-bold ${
              analysis.overall_score >= 70 ? "text-emerald-400" :
              analysis.overall_score >= 40 ? "text-amber-400" : "text-red-400"
            }`}>{analysis.overall_score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </CardContent>
      </Card>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndicatorCard
          icon={TrendingDown}
          title="Platô de Peso"
          detected={analysis.plateau_detected}
          label={analysis.plateau_detected ? "Detectado" : "Não detectado"}
          severity={analysis.plateau_detected ? "warning" : "ok"}
        />
        <IndicatorCard
          icon={AlertTriangle}
          title="Risco de Catabolismo"
          detected={analysis.catabolism_risk !== "low"}
          label={analysis.catabolism_risk === "high" ? "Alto" : analysis.catabolism_risk === "moderate" ? "Moderado" : "Baixo"}
          severity={analysis.catabolism_risk === "high" ? "danger" : analysis.catabolism_risk === "moderate" ? "warning" : "ok"}
        />
        <IndicatorCard
          icon={Droplets}
          title="Retenção Hídrica"
          detected={analysis.water_retention !== "normal"}
          label={analysis.water_retention === "severe" ? "Severa" : analysis.water_retention === "moderate" ? "Moderada" : analysis.water_retention === "mild" ? "Leve" : "Normal"}
          severity={analysis.water_retention === "severe" ? "danger" : analysis.water_retention === "moderate" ? "warning" : "ok"}
        />
        <IndicatorCard
          icon={BarChart3}
          title="Consistência de Evolução"
          detected={analysis.evolution_consistency !== "consistent"}
          label={analysis.evolution_consistency === "declining" ? "Em Declínio" : analysis.evolution_consistency === "irregular" ? "Irregular" : "Consistente"}
          severity={analysis.evolution_consistency === "declining" ? "danger" : analysis.evolution_consistency === "irregular" ? "warning" : "ok"}
        />
      </div>

      {/* Checkin history mini */}
      {checkins.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Últimos Check-ins</CardTitle></CardHeader>
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
  icon: any; title: string; detected: boolean; label: string;
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
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${severity === "ok" ? "text-emerald-400" : severity === "warning" ? "text-amber-400" : "text-red-400"}`} />
          <span className="font-medium text-sm text-foreground">{title}</span>
        </div>
        <Badge className={badgeColors[severity]}>{label}</Badge>
      </CardContent>
    </Card>
  );
}
