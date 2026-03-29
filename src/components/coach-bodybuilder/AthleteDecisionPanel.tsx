import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import type { AnalysisResult, DecisionSuggestion } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";

const DECISION_LABELS: Record<string, string> = {
  maintain_protocol: "Manter Protocolo",
  increase_carbs: "Aumentar Carbo",
  reduce_carbs: "Reduzir Carbo",
  adjust_cardio: "Ajustar Cardio",
  review_refeed: "Revisar Refeed",
  increase_protein: "Aumentar Proteína",
  reduce_volume: "Reduzir Volume",
  deload: "Semana Deload",
  other: "Outro",
};

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

  const saveMutation = useMutation({
    mutationFn: async ({ decision, status }: { decision: DecisionSuggestion; status: "accepted" | "rejected" }) => {
      // First save analysis
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
        status,
        applied_at: status === "accepted" ? new Date().toISOString() : null,
      });
      if (error) throw error;

      // Update athlete prep_score
      await supabase.from("coach_athletes" as any)
        .update({
          prep_score: analysis.overall_score,
          status: analysis.overall_score >= 70 ? "evolving" : analysis.overall_score >= 40 ? "stagnant" : "alert",
          updated_at: new Date().toISOString(),
        })
        .eq("id", athleteId);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["coach-athlete"] });
      queryClient.invalidateQueries({ queryKey: ["coach-athletes"] });
      toast.success(status === "accepted" ? "Decisão aceita e registrada!" : "Decisão rejeitada e registrada.");
    },
    onError: () => toast.error("Erro ao salvar decisão."),
  });

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Decision Engine — Sugestões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            As decisões abaixo são sugestões geradas pelo motor de análise. Toda alteração no protocolo deve ser feita manualmente pelo coach.
          </p>
        </CardContent>
      </Card>

      {decisions.map((d, i) => (
        <Card key={i} className="hover:border-primary/30 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0" />
                <h3 className="font-semibold text-foreground">
                  {DECISION_LABELS[d.decision_type] || d.decision_type}
                </h3>
              </div>
              <Badge className={CONFIDENCE_COLORS[d.confidence_level]}>
                {d.confidence_level === "high" ? "Alta" : d.confidence_level === "medium" ? "Média" : "Baixa"} confiança
              </Badge>
            </div>

            <p className="text-sm text-foreground">{d.reason}</p>
            <p className="text-xs text-muted-foreground italic">{d.data_basis}</p>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="default"
                onClick={() => saveMutation.mutate({ decision: d, status: "accepted" })}
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => saveMutation.mutate({ decision: d, status: "rejected" })}
                disabled={saveMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
