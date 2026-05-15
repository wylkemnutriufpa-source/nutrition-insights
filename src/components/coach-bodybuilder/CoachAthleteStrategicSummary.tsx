/**
 * Athlete Strategic Summary — Premium executive block
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
type AnalysisResult = any;
type CoachAlert = any;
type DecisionSuggestion = any;
const PHASE_LABELS: any = {};
const DECISION_LABELS: any = {};
// coachPriorityEngine removed
type PriorityLevel = any;
const PRIORITY_CONFIG: any = {};
import {
  Brain, Target, AlertTriangle, Zap, Eye, PenLine, Activity, Shield, Flame
} from "lucide-react";

interface Props {
  athleteName: string;
  phase: string;
  analysis: AnalysisResult;
  alerts: CoachAlert[];
  decisions: DecisionSuggestion[];
  priorityLevel: PriorityLevel;
  lastVisualObservation?: string | null;
  lastManualDecision?: string | null;
}

export default function CoachAthleteStrategicSummary({
  athleteName,
  phase,
  analysis,
  alerts,
  decisions,
  priorityLevel,
  lastVisualObservation,
  lastManualDecision,
}: Props) {
  const pc = PRIORITY_CONFIG[priorityLevel];
  const primaryAlert = alerts[0];
  const primaryDecision = decisions[0];

  const overallStatus = analysis.overall_score >= 70
    ? { label: "Excelente", color: "text-emerald-400", bg: "bg-emerald-500/10" }
    : analysis.overall_score >= 50
    ? { label: "Adequado", color: "text-amber-400", bg: "bg-amber-500/10" }
    : analysis.overall_score >= 30
    ? { label: "Atenção", color: "text-orange-400", bg: "bg-orange-500/10" }
    : { label: "Crítico", color: "text-red-400", bg: "bg-red-500/10" };

  return (
    <Card className="border-orange-500/20 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          Resumo Estratégico
          <Badge className={`ml-auto ${pc.bgColor} ${pc.color} ${pc.borderColor}`}>
            Prioridade {pc.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Phase */}
          <SummaryItem
            icon={Flame}
            label="Fase"
            value={PHASE_LABELS[phase] || phase}
            iconColor="text-orange-400"
          />

          {/* Score */}
          <SummaryItem
            icon={Target}
            label="Score Geral"
            value={`${analysis.overall_score}/100`}
            iconColor={analysis.overall_score >= 70 ? "text-emerald-400" : analysis.overall_score >= 40 ? "text-amber-400" : "text-red-400"}
          />

          {/* Status */}
          <SummaryItem
            icon={Activity}
            label="Status"
            value={overallStatus.label}
            iconColor={overallStatus.color}
          />

          {/* Primary alert */}
          <SummaryItem
            icon={AlertTriangle}
            label="Alerta Principal"
            value={primaryAlert?.title || "Nenhum"}
            iconColor={primaryAlert ? "text-red-400" : "text-emerald-400"}
          />

          {/* Primary decision */}
          <SummaryItem
            icon={Zap}
            label="Decisão Sugerida"
            value={primaryDecision ? (DECISION_LABELS[primaryDecision.decision_type] || primaryDecision.decision_type) : "Manter"}
            iconColor="text-amber-400"
          />

          {/* Last visual */}
          <SummaryItem
            icon={Eye}
            label="Última Observação"
            value={lastVisualObservation ? (lastVisualObservation.length > 40 ? lastVisualObservation.slice(0, 40) + "…" : lastVisualObservation) : "—"}
            iconColor="text-cyan-400"
          />
        </div>

        {/* Last manual decision */}
        {lastManualDecision && (
          <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/30 flex items-start gap-2">
            <PenLine className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Última Decisão Manual</p>
              <p className="text-xs text-foreground mt-0.5">{lastManualDecision}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryItem({ icon: Icon, label, value, iconColor }: {
  icon: any; label: string; value: string; iconColor: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/20">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${iconColor}`} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
