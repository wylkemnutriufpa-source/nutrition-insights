import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { applyTherapeuticAdjustment } from "@/lib/applyTherapeuticAdjustment";
import {
  Zap, AlertTriangle, TrendingDown, ArrowUpRight, ArrowDownRight,
  Pause, RefreshCw, Check, X, Eye, ChevronDown, ChevronUp,
  Activity, Brain, Flame, Scale, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface Intervention {
  id: string;
  patient_id: string;
  plan_id: string;
  intervention_type: string;
  caloric_adjustment_percent: number | null;
  clinical_reason: string;
  cluster_origin: string | null;
  risk_at_moment: string | null;
  efficacy_score: number | null;
  engine_version: string;
  status: string;
  metadata: any;
  created_at: string;
  patient_name?: string;
}

const interventionTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  reduzir_leve: { label: "Redução Leve", icon: ArrowDownRight, color: "text-warning" },
  reduzir_moderado: { label: "Redução Moderada", icon: ArrowDownRight, color: "text-destructive" },
  aumentar_leve: { label: "Aumento Leve", icon: ArrowUpRight, color: "text-success" },
  diet_break_controlado: { label: "Diet Break", icon: Pause, color: "text-primary" },
  troca_estrategia: { label: "Troca de Estratégia", icon: RefreshCw, color: "text-accent-foreground" },
  simplificar_plano: { label: "Simplificar Plano", icon: Zap, color: "text-warning" },
  aumentar_estrutura: { label: "Mais Estrutura", icon: Activity, color: "text-primary" },
  estrategia_metabolica: { label: "Estratégia Metabólica", icon: Brain, color: "text-accent-foreground" },
};

const clusterLabels: Record<string, { label: string; color: string }> = {
  metabolic_responder: { label: "Respondedor", color: "text-success" },
  metabolic_adaptive: { label: "Adaptativo", color: "text-warning" },
  behavioral_struggler: { label: "Luta Comportamental", color: "text-destructive" },
  resistant_profile: { label: "Resistente", color: "text-destructive" },
  disengaging_patient: { label: "Desengajando", color: "text-destructive" },
  unknown: { label: "—", color: "text-muted-foreground" },
};

export default function TherapeuticSuggestionsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [confirmAction, setConfirmAction] = useState<"apply" | "ignore" | null>(null);
  const [expanded, setExpanded] = useState(true);

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ["therapeutic-interventions", user?.id],
    queryFn: async () => {
      // Get patient IDs for this nutritionist
      const { data: rels } = await supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", user!.id)
        .eq("status", "active");

      if (!rels || rels.length === 0) return [];
      const pids = rels.map((r) => r.patient_id);

      // Get pending interventions
      const { data: suggestions, error } = await supabase
        .from("nutritional_intervention_suggestions")
        .select("*")
        .in("patient_id", pids)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get patient names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", pids);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

      return (suggestions || []).map((s: any) => ({
        ...s,
        patient_name: nameMap[s.patient_id] || "Paciente",
      })) as Intervention[];
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, intervention }: { id: string; status: string; intervention?: Intervention }) => {
      // 1. Update the suggestion status
      const { error } = await supabase
        .from("nutritional_intervention_suggestions")
        .update({
          status,
          applied_at: status === "applied" ? new Date().toISOString() : null,
          applied_by: status === "applied" ? user?.id : null,
        })
        .eq("id", id);
      if (error) throw error;

      // 2. If applied, MATERIALLY ALTER the meal plan
      if (status === "applied" && intervention) {
        const adjustPercent = intervention.caloric_adjustment_percent ?? 0;

        if (intervention.plan_id && adjustPercent !== 0) {
          // Apply real caloric/macro adjustment to meal_plan_items + plan totals
          const result = await applyTherapeuticAdjustment({
            planId: intervention.plan_id,
            patientId: intervention.patient_id,
            interventionId: id,
            interventionType: intervention.intervention_type,
            caloricAdjustmentPercent: adjustPercent,
            clinicalReason: intervention.clinical_reason,
            appliedBy: user!.id,
            metadata: {
              efficacy_score: intervention.efficacy_score,
              cluster_origin: intervention.cluster_origin,
              ...intervention.metadata,
            },
          });

          if (!result.success) {
            throw new Error(result.error || "Falha ao aplicar ajuste no plano");
          }

          // Store result for feedback
          (intervention as any)._adjustmentResult = result;
        } else if (intervention.plan_id) {
          // Non-caloric interventions — update therapeutic fields only
          await supabase.from("meal_plans").update({
            therapeutic_effectiveness_status: intervention.intervention_type,
            therapeutic_efficacy_score: intervention.efficacy_score,
          }).eq("id", intervention.plan_id);
        }

        // Create notification for the nutritionist
        const adjustResult = (intervention as any)._adjustmentResult;
        const notifMessage = adjustResult
          ? `${interventionTypeConfig[intervention.intervention_type]?.label || intervention.intervention_type} — ${adjustResult.beforeCalories} → ${adjustResult.afterCalories} kcal`
          : `${interventionTypeConfig[intervention.intervention_type]?.label || intervention.intervention_type} — ${intervention.clinical_reason?.slice(0, 80)}`;

        await supabase.from("notifications").insert({
          user_id: user!.id,
          title: `Ajuste aplicado ao plano: ${intervention.patient_name}`,
          message: notifMessage,
          type: "progress",
          entity_type: "intervention",
          entity_id: id,
          target_route: `/patients/${intervention.patient_id}`,
        } as any);
      }

      return intervention;
    },
    onSuccess: (intervention, variables) => {
      queryClient.invalidateQueries({ queryKey: ["therapeutic-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      // V2 editor hydration bypassed as V3 is the unified system standard

      if (variables.status === "applied") {
        const result = (intervention as any)?._adjustmentResult;
        if (result?.success) {
          toast.success(
            `Plano alimentar ajustado: ${result.beforeCalories} → ${result.afterCalories} kcal`,
            { description: `Versão anterior salva para auditoria. Campos alterados: ${result.changedFields.join(", ")}`, duration: 6000 }
          );
        } else {
          toast.success("Intervenção aplicada e registrada!");
        }
      } else {
        toast.info("Intervenção ignorada");
      }
      setSelectedIntervention(null);
      setConfirmAction(null);
    },
    onError: (err) => {
      console.error("Intervention update error:", err);
      toast.error("Erro ao aplicar intervenção no plano alimentar");
    },
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (interventions.length === 0) return null;

  return (
    <>
      <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-warning" />
              Sugestões Terapêuticas Inteligentes
              <Badge variant="secondary" className="text-xs">{interventions.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <CardContent className="pt-0">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {interventions.map((intervention) => {
                      const config = interventionTypeConfig[intervention.intervention_type] || {
                        label: intervention.intervention_type,
                        icon: Zap,
                        color: "text-muted-foreground",
                      };
                      const IconComp = config.icon;
                      const cluster = clusterLabels[intervention.cluster_origin || "unknown"] || clusterLabels.unknown;
                      const meta = intervention.metadata || {};

                      return (
                        <motion.div
                          key={intervention.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-border/50 rounded-lg p-3 hover:border-warning/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Avatar className="w-8 h-8 shrink-0">
                                <AvatarFallback className="text-xs">
                                  {(intervention.patient_name || "P").charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate">{intervention.patient_name}</span>
                                  <Badge variant="outline" className={`text-xs ${cluster.color}`}>
                                    {cluster.label}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1.5 mt-1">
                                  <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
                                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                                  {intervention.caloric_adjustment_percent != null && intervention.caloric_adjustment_percent !== 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {intervention.caloric_adjustment_percent > 0 ? "+" : ""}
                                      {intervention.caloric_adjustment_percent}%
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {intervention.clinical_reason}
                                </p>

                                {meta.suggested_calories && meta.current_calories && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                      {meta.current_calories} → {meta.suggested_calories} kcal
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                  {intervention.efficacy_score != null && (
                                    <span className="flex items-center gap-1">
                                      <Activity className="w-3 h-3" />
                                      Eficácia: {intervention.efficacy_score}/100
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    Risco: {intervention.risk_at_moment || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  setSelectedIntervention(intervention);
                                  setConfirmAction("apply");
                                }}
                              >
                                <Check className="w-3 h-3" /> Aplicar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs gap-1"
                                onClick={() => {
                                  setSelectedIntervention(intervention);
                                  setConfirmAction("ignore");
                                }}
                              >
                                <X className="w-3 h-3" /> Ignorar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setSelectedIntervention(intervention)}
                              >
                                <Eye className="w-3 h-3" /> Detalhes
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Detail / Confirm Dialog */}
      <Dialog
        open={!!selectedIntervention}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIntervention(null);
            setConfirmAction(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "apply"
                ? "Confirmar Aplicação"
                : confirmAction === "ignore"
                ? "Confirmar Ignorar"
                : "Detalhes da Intervenção"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction ? "Esta ação será registrada no histórico clínico." : "Análise completa da sugestão terapêutica."}
            </DialogDescription>
          </DialogHeader>

          {selectedIntervention && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Paciente</span>
                  <p className="font-medium">{selectedIntervention.patient_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cluster</span>
                  <p className="font-medium">{clusterLabels[selectedIntervention.cluster_origin || "unknown"]?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p className="font-medium">
                    {interventionTypeConfig[selectedIntervention.intervention_type]?.label || selectedIntervention.intervention_type}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ajuste Calórico</span>
                  <p className="font-medium">
                    {selectedIntervention.caloric_adjustment_percent != null && selectedIntervention.caloric_adjustment_percent !== 0
                      ? `${selectedIntervention.caloric_adjustment_percent > 0 ? "+" : ""}${selectedIntervention.caloric_adjustment_percent}%`
                      : "Nenhum"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Score de Eficácia</span>
                  <p className="font-medium">{selectedIntervention.efficacy_score ?? "—"}/100</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Risco Atual</span>
                  <p className="font-medium">{selectedIntervention.risk_at_moment || "—"}</p>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Motivo Clínico</span>
                <p className="text-sm mt-1">{selectedIntervention.clinical_reason}</p>
              </div>

              {selectedIntervention.metadata?.suggested_calories && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-sm font-medium">Impacto Esperado</span>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span>{selectedIntervention.metadata.current_calories} kcal</span>
                    <span>→</span>
                    <span className="font-bold">{selectedIntervention.metadata.suggested_calories} kcal</span>
                    {selectedIntervention.metadata.duration_days && (
                      <Badge variant="outline" className="text-xs">
                        {selectedIntervention.metadata.duration_days} dias
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Motor: v{selectedIntervention.engine_version} • {new Date(selectedIntervention.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          )}

          <DialogFooter>
            {confirmAction ? (
              <>
                <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancelar</Button>
                <Button
                  variant={confirmAction === "apply" ? "default" : "outline"}
                  onClick={() => {
                    if (selectedIntervention) {
                      updateMutation.mutate({
                        id: selectedIntervention.id,
                        status: confirmAction === "apply" ? "applied" : "ignored",
                        intervention: confirmAction === "apply" ? selectedIntervention : undefined,
                      });
                    }
                  }}
                  disabled={updateMutation.isPending}
                >
                  {confirmAction === "apply" ? "Confirmar Aplicação" : "Confirmar Ignorar"}
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setConfirmAction("apply")}
                >
                  <Check className="w-4 h-4 mr-1" /> Aplicar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction("ignore")}
                >
                  <X className="w-4 h-4 mr-1" /> Ignorar
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
