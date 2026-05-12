import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import type { AnalysisResult, DecisionSuggestion } from "@v1/lib/coachAnalysisEngine";
import { DECISION_LABELS } from "@v1/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Textarea } from "@v1/components/ui/textarea";
import { Zap, CheckCircle, XCircle, Lightbulb, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface Props {
  decisions: DecisionSuggestion[];
  athleteId: string;
  analysis: AnalysisResult;
}

export default function AthleteDecisionPanel({ decisions, athleteId, analysis }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [coachReason, setCoachReason] = useState("");

  const saveMutation = useMutation({
    mutationFn: async ({ decision, status }: { decision: DecisionSuggestion; status: "accepted" | "rejected" }) => {
      // Save analysis
      const { data: analysisRow } = await supabase.from("coach_athlete_analysis" as any).insert({
        athlete_id: athleteId,
        coach_id: user!.id,
        tenant_id: tenantId,
        plateau_detected: analysis.plateau_detected,
        catabolism_risk: analysis.catabolism_risk,
        water_retention: analysis.water_retention,
        evolution_consistency: analysis.evolution_consistency,
        overall_score: analysis.overall_score,
        analysis_summary: analysis.analysis_summary,
      }).select("id").single();

      const { error } = await supabase.from("coach_decisions" as any).insert({
        athlete_id: athleteId,
        analysis_id: (analysisRow as any)?.id || null,
        coach_id: user!.id,
        tenant_id: tenantId,
        decision_type: decision.decision_type,
        reason: decision.reason,
        data_basis: decision.data_basis,
        confidence_level: decision.confidence_level,
        expected_impact: decision.expected_impact || null,
        coach_reason: coachReason.trim() || null,
        status,
        applied_at: status === "accepted" ? new Date().toISOString() : null,
      });
      if (error) throw error;

      // Timeline event
      await supabase.from("coach_timeline" as any).insert({
        athlete_id: athleteId,
        coach_id: user!.id,
        tenant_id: tenantId,
        event_type: status === "accepted" ? "decision_accepted" : "decision_rejected",
        title: `${status === "accepted" ? "Aceita" : "Rejeitada"}: ${DECISION_LABELS[decision.decision_type] || decision.decision_type}`,
        description: coachReason.trim() || decision.reason,
        metadata: { decision_type: decision.decision_type, confidence: decision.confidence_level },
      });

      // Update athlete scores
      await supabase.from("coach_athletes" as any)
        .update({
          prep_score: analysis.overall_score,
          score_physical: analysis.composite_score.physical,
          score_adherence: analysis.composite_score.adherence,
          score_recovery: analysis.composite_score.recovery,
          score_performance: analysis.composite_score.performance,
          score_risk: analysis.composite_score.risk,
          status: analysis.overall_score >= 70 ? "evolving" : analysis.overall_score >= 40 ? "stagnant" : "alert",
          updated_at: new Date().toISOString(),
        })
        .eq("id", athleteId);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["coach-athlete"] });
      queryClient.invalidateQueries({ queryKey: ["coach-athletes"] });
      queryClient.invalidateQueries({ queryKey: ["coach-timeline"] });
      setCoachReason("");
      setExpandedIdx(null);
      toast.success(status === "accepted" ? "Decisão aceita e registrada!" : "Decisão rejeitada e registrada.");
    },
    onError: () => toast.error("Erro ao salvar decisão."),
  });

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Decision Engine v2 — Sugestões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Decisões geradas pelo motor de análise. Toda alteração no protocolo deve ser feita manualmente pelo coach.
          </p>
        </CardContent>
      </Card>

      {decisions.map((d, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <Card key={i} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400 shrink-0" />
                  <h3 className="font-semibold text-sm text-foreground">
                    {DECISION_LABELS[d.decision_type] || d.decision_type}
                  </h3>
                </div>
                <Badge className={CONFIDENCE_COLORS[d.confidence_level]}>
                  {d.confidence_level === "high" ? "Alta" : d.confidence_level === "medium" ? "Média" : "Baixa"}
                </Badge>
              </div>

              <p className="text-sm text-foreground">{d.reason}</p>
              <p className="text-xs text-muted-foreground italic">{d.data_basis}</p>

              {d.expected_impact && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <TrendingUp className="h-3 w-3" />
                  <span>Impacto esperado: {d.expected_impact}</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="text-xs"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {isExpanded ? "Fechar" : "Responder"}
              </Button>

              {isExpanded && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <Textarea
                    placeholder="Motivo do coach (opcional)..."
                    value={coachReason}
                    onChange={e => setCoachReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate({ decision: d, status: "accepted" })}
                      disabled={saveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveMutation.mutate({ decision: d, status: "rejected" })}
                      disabled={saveMutation.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
