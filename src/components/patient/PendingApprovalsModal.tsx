import { useState, useEffect, useRef } from "react";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { rejectMealPlan, transitionPlanToReview } from "@/lib/serverTransitions";
import { supabase } from "@/integrations/supabase/client";
import { finalizeGeneratedMealPlan } from "@/lib/finalizeGeneratedMealPlan";
import {
  inspectOnboardingPlan,
  resolveLatestUsableOnboardingPlan,
  syncPipelineGeneratedPlan,
} from "@/lib/onboardingPlanResolver";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertTriangle, CheckCircle2, XCircle, Loader2, User,
  Target, Sparkles, ChevronRight, Scale,
  FileText, Zap, Search, Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
// Removed EditorVersionPicker as we now handle version dispatching automatically

interface PendingPipeline {
  id: string;
  patient_id: string;
  status: string;
  generated_plan_id: string | null;
  generated_plan_data: any;
  plan_generated?: boolean;
  anamnesis_completed?: boolean;
  body_data_completed?: boolean;
  preferences_completed?: boolean;
  weight: number | null;
  height: number | null;
  meal_count: number;
  cooking_preference: string | null;
  created_at: string;
  patient_name?: string;
  patient_avatar?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PendingApprovalsModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<PendingPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<PendingPipeline | null>(null);
  
  const [processing, setProcessing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && user) fetchPending();
  }, [open, user]);

  // Realtime — only refetch when modal is actually open to prevent background noise
  useEffect(() => {
    if (!user || !open) return;
    const ch = supabase
      .channel("pending-approvals-modal")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "onboarding_pipelines",
        filter: `nutritionist_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.status === "pending_approval") {
          fetchPending();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, open]);

  async function fetchPending() {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("nutritionist_id", user.id)
      .in("status", ["pending_approval", "pending_plan_generation"]);

    const items = (data || []) as any[];
    if (items.length === 0) {
      setPipelines([]);
      setLoading(false);
      return;
    }

    const patientIds = items.map((p: any) => p.patient_id);

    // Fetch profiles + active links + already-published plans
    const [{ data: profiles }, { data: activeLinks }, { data: publishedPlans }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", patientIds),
      supabase
        .from("nutritionist_patients")
        .select("patient_id, status")
        .eq("nutritionist_id", user.id)
        .in("patient_id", patientIds)
        .eq("status", "active"),
      supabase
        .from("meal_plans")
        .select("patient_id")
        .in("patient_id", patientIds)
        .in("plan_status", ["approved", "published_to_patient"])
        .eq("is_active", true),
    ]);

    const activeLinkMap = new Map((activeLinks || []).map((l: any) => [l.patient_id, l]));
    const patientsWithActivePlan = new Set((publishedPlans || []).map((p: any) => p.patient_id));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // BUSINESS RULES:
    // 1. Must have active nutritionist link
    // 2. Patient must NOT already have an active published plan
    // 3. Pipeline must be less than 30 days old
    const eligibleItems = items.filter((pipeline: any) => {
      const link = activeLinkMap.get(pipeline.patient_id);
      if (!link) return false;
      if (patientsWithActivePlan.has(pipeline.patient_id)) return false;
      if (new Date(pipeline.created_at) < thirtyDaysAgo) return false;
      return true;
    });

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const enriched = eligibleItems.map((p: any) => ({
      ...p,
      patient_name: profileMap.get(p.patient_id)?.full_name || "Paciente",
      patient_avatar: profileMap.get(p.patient_id)?.avatar_url,
    }));

    setPipelines(enriched);
    setLoading(false);
  }

  function getAlternatives(pipeline: PendingPipeline) {
    const ex = pipeline.generated_plan_data?.explainability;
    if (!ex) return [];
    return ex.alternative_templates || [];
  }

  function getSelectedTemplate(pipeline: PendingPipeline) {
    const ex = pipeline.generated_plan_data?.explainability;
    if (!ex) return null;
    return ex.selected_template || null;
  }

  async function generateOrRegeneratePlan(targetPlanId?: string, pipelineOverride?: PendingPipeline) {
    const pip = pipelineOverride || selectedPipeline;
    if (!pip || !user) throw new Error("Pipeline inválido");

    const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
      body: {
        patientId: pip.patient_id,
        nutritionistId: user.id,
        weight: pip.weight,
        height: pip.height,
        mealCount: pip.meal_count,
        cookingPreference: pip.cooking_preference,
        isPipeline: true,
        planCount: 3,
        ...(targetPlanId ? { meal_plan_id: targetPlanId } : {}),
      },
    });

    if (error) {
      const msg = await friendlyEdgeFunctionError(error, "Falha na geração do plano");
      throw new Error(msg);
    }
    if (!data?.success) throw new Error(data?.error || "Falha na geração do plano");

    const planId = data?.mealPlanId || targetPlanId;
    if (!planId) throw new Error("ID do plano não retornado pela geração");

    const patientStepsDone = !!pip.anamnesis_completed && !!pip.body_data_completed && !!pip.preferences_completed;
    if (!patientStepsDone) {
      throw new Error("Pipeline incompleto: o paciente precisa concluir anamnese, dados corporais e preferências antes da geração.");
    }

    await supabase
      .from("onboarding_pipelines" as any)
      .update({
        generated_plan_id: planId,
        generated_plan_data: data,
        plan_generated: true,
        status: "pending_approval",
      } as any)
      .eq("id", pip.id);

    return { planId, data };
  }



  async function handleBatchGenerate() {
    if (!user) return;
    const pendingGen = pipelines.filter(p => p.status === "pending_plan_generation" || (!p.generated_plan_id && !p.plan_generated));
    if (pendingGen.length === 0) {
      toast.info("Todos os pipelines já possuem planos gerados.");
      return;
    }
    setBatchGenerating(true);
    let success = 0;
    let failed = 0;
    for (const pip of pendingGen) {
      try {
        await generateOrRegeneratePlan(undefined, pip);
        success++;
      } catch (err: any) {
        console.error(`Erro ao gerar plano para ${pip.patient_name}:`, err);
        failed++;
      }
    }
    setBatchGenerating(false);
    toast.success(`${success} planos gerados com 3 opções cada!${failed > 0 ? ` ${failed} falharam.` : ""}`);
    fetchPending();
  }

  async function handleCreateAndEdit() {
    if (!selectedPipeline || !user) return;
    setProcessing(true);
    try {
      toast.info("Gerando plano completo com itens... Aguarde.");
      const { planId, data } = await generateOrRegeneratePlan();

      const finalized = await finalizeGeneratedMealPlan({
        planId,
        patientId: selectedPipeline.patient_id,
        userId: user.id,
        tenantId,
      });

      const reviewPlanId = finalized.finalPlanId;
      if (reviewPlanId !== planId) {
        await syncPipelineGeneratedPlan(selectedPipeline.id, reviewPlanId);
      }

      await transitionPlanToReview(reviewPlanId, user.id);

      // Fetch version to decide editor
      const { data: planData } = await supabase.from("meal_plans").select("editor_version").eq("id", reviewPlanId).single();
      const isV3 = planData?.editor_version === "v3";
      const path = isV3 ? `/v3/${selectedPipeline.patient_id}?planId=${reviewPlanId}` : `/meal-plans/${reviewPlanId}`;

      onOpenChange(false);
      navigate(path);
      toast.success(
        finalized.corrected
          ? "Plano gerado e corrigido pelo motor clínico antes da revisão."
          : `Plano gerado com ${data.items_count} itens! Revise e aprove.`
      );
    } catch (err: any) {
      toast.error("Erro ao gerar plano: " + (err.message || "Tente novamente"));
    } finally {
      setProcessing(false);
    }
  }

  async function handleOpenPlanForReview(planId: string) {
    if (!selectedPipeline || !user) return;
    setProcessing(true);
    try {
      let resolvedPlanId = planId;
      let resolvedPlan = await inspectOnboardingPlan(planId);

      if (!resolvedPlan?.isUsable) {
        const fallbackPlan = await resolveLatestUsableOnboardingPlan(selectedPipeline.patient_id, user.id);

        if (fallbackPlan?.id && fallbackPlan.id !== planId) {
          resolvedPlan = fallbackPlan;
          resolvedPlanId = fallbackPlan.id;
          toast.info("Plano válido mais recente encontrado. Abrindo plano correto...");
        } else {
          toast.info(resolvedPlan && !resolvedPlan.hasItems
            ? "Plano sem refeições detectado. Gerando itens automaticamente..."
            : "Plano sem itens detectado. Gerando uma versão nova...");
          const regenerated = await generateOrRegeneratePlan(resolvedPlan && !resolvedPlan.hasItems ? planId : undefined);
          resolvedPlanId = regenerated.planId;
          resolvedPlan = await inspectOnboardingPlan(resolvedPlanId);
        }
      }

      if (!selectedPipeline.generated_plan_id || selectedPipeline.generated_plan_id !== resolvedPlanId) {
        await syncPipelineGeneratedPlan(selectedPipeline.id, resolvedPlanId);
      }

      const finalized = await finalizeGeneratedMealPlan({
        planId: resolvedPlanId,
        patientId: selectedPipeline.patient_id,
        userId: user.id,
        tenantId,
      });

      if (finalized.finalPlanId !== resolvedPlanId) {
        resolvedPlanId = finalized.finalPlanId;
        await syncPipelineGeneratedPlan(selectedPipeline.id, resolvedPlanId);
      }

      const requiresReviewTransition = !["approved", "published_to_patient"].includes(resolvedPlan?.plan_status || "");
      if (requiresReviewTransition) {
        await transitionPlanToReview(resolvedPlanId, user.id);
      }

      if (finalized.corrected) {
        toast.success("Plano revisado pelo motor clínico. Abrindo versão corrigida...");
      }

      // Fetch version to decide editor
      const { data: planData } = await supabase.from("meal_plans").select("editor_version").eq("id", resolvedPlanId).single();
      const isV3 = planData?.editor_version === "v3";
      const path = isV3 ? `/v3/${selectedPipeline.patient_id}?planId=${resolvedPlanId}` : `/meal-plans/${resolvedPlanId}`;

      onOpenChange(false);
      navigate(path);
    } catch (err: any) {
      toast.error("Erro ao abrir plano: " + (err.message || "Tente novamente"));
    } finally {
      setProcessing(false);
    }
  }



  async function handleReject() {
    if (!selectedPipeline || !rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    setProcessing(true);

    await supabase
      .from("onboarding_pipelines" as any)
      .update({
        status: "rejected",
        rejection_reason: rejectReason,
        plan_generated: false,
      } as any)
      .eq("id", selectedPipeline.id);

    // Archive the generated plan instead of deleting (protect approved plans)
    if (selectedPipeline.generated_plan_id && user) {
      await rejectMealPlan(selectedPipeline.generated_plan_id, user.id, rejectReason);
    }

    await supabase.from("notifications").insert({
      user_id: selectedPipeline.patient_id,
      title: "Plano Precisa de Ajustes",
      message: `Seu plano não foi aprovado: ${rejectReason}. Ajuste seus dados e gere um novo.`,
      type: "warning",
      action_url: "/onboarding",
    } as any);

    toast.success(`Plano de ${selectedPipeline.patient_name} rejeitado.`);
    setPipelines((prev) => prev.filter((p) => p.id !== selectedPipeline.id));
    setSelectedPipeline(null);
    setRejectMode(false);
    setRejectReason("");
    setProcessing(false);

    if (pipelines.length <= 1) onOpenChange(false);
  }

  async function handleDismissPipeline(pipelineId: string, patientName: string) {
    if (!user) return;
    try {
      await supabase
        .from("onboarding_pipelines" as any)
        .update({ status: "dismissed" } as any)
        .eq("id", pipelineId);

      setPipelines((prev) => prev.filter((p) => p.id !== pipelineId));
      toast.success(`Pipeline de ${patientName} removido.`);
      if (pipelines.length <= 1) onOpenChange(false);
    } catch {
      toast.error("Erro ao remover pipeline");
    }
  }

  const pendingCount = pipelines.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Planos Pendentes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Batch generate button - outside scroll area */}
        {!selectedPipeline && !loading && pipelines.some(p => p.status === "pending_plan_generation" || (!p.generated_plan_id && !p.plan_generated)) && (
          <div className="px-1 pb-2">
            <Button 
              className="w-full" 
              variant="default"
              disabled={batchGenerating}
              onClick={handleBatchGenerate}
            >
              {batchGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {batchGenerating ? "Gerando planos..." : `Gerar 3 Opções para Todos (${pipelines.filter(p => p.status === "pending_plan_generation" || (!p.generated_plan_id && !p.plan_generated)).length} pendentes)`}
            </Button>
          </div>
        )}

        <ScrollArea type="always" className="flex-1 min-h-0 -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pipelines.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-muted-foreground">Nenhum plano pendente de aprovação!</p>
            </div>
          ) : !selectedPipeline ? (
            /* ── List view ── */
            <div className="space-y-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              {pipelines.filter((p) => p.patient_name?.toLowerCase().includes(search.toLowerCase())).map((p) => {
                const template = getSelectedTemplate(p);
                const altCount = getAlternatives(p).length;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="py-4 flex items-center gap-4"
                        onClick={() => { setSelectedPipeline(p); setRejectMode(false); }}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{p.patient_name}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {p.status === "pending_plan_generation" ? (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                ⏳ Aguardando geração
                              </Badge>
                            ) : template ? (
                              <Badge variant="secondary" className="text-xs">
                                {template.name} • {template.base_calories}kcal
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-warning text-warning">
                                ⏳ Em produção
                              </Badge>
                            )}
                            {altCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                +{altCount} alternativa{altCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {p.weight && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Scale className="w-3 h-3" /> {p.weight}kg
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissPipeline(p.id, p.patient_name || "Paciente");
                            }}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remover pipeline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* ── Detail view ── */
            <div className="space-y-5 py-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPipeline(null); setRejectMode(false); }}>
                ← Voltar à lista
              </Button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedPipeline.patient_name}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {selectedPipeline.weight && <span>Peso: {selectedPipeline.weight}kg</span>}
                    {selectedPipeline.height && <span>• Altura: {selectedPipeline.height}cm</span>}
                    {selectedPipeline.meal_count && <span>• {selectedPipeline.meal_count} refeições/dia</span>}
                  </div>
                </div>
              </div>

              {/* Explainability summary */}
              {(() => {
                const ex = selectedPipeline.generated_plan_data?.explainability;
                if (!ex) return null;
                const calc = ex.calculation || {};
                const profile = ex.patient_profile || {};
                const macros = ex.macros || {};
                return (
                  <Card className="bg-muted/30">
                    <CardContent className="py-3 space-y-2 text-sm">
                      <p className="font-semibold flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <Target className="w-4 h-4" /> Análise do Protocolo
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Objetivo:</span> <strong>{profile.goal}</strong></div>
                        <div><span className="text-muted-foreground">TMB:</span> <strong>{calc.tmb} kcal</strong></div>
                        <div><span className="text-muted-foreground">TDEE:</span> <strong>{calc.tdee} kcal</strong></div>
                        <div><span className="text-muted-foreground">Meta:</span> <strong className="text-primary">{calc.final_kcal} kcal/dia</strong></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">P:</span> <strong>{macros.protein}g</strong></div>
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">C:</span> <strong>{macros.carbs}g</strong></div>
                        <div className="text-center p-1.5 rounded bg-background"><span className="text-muted-foreground">G:</span> <strong>{macros.fat}g</strong></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {!rejectMode ? (
                <>
                  {/* Info card */}
                  {selectedPipeline.generated_plan_id ? (
                    <Card className="border-dashed border-primary/40 bg-primary/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground space-y-1">
                        <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                        Plano gerado com sucesso. Clique em <strong>"Analisar e Editar"</strong> para revisar, fazer ajustes e depois aprovar diretamente no editor.
                      </CardContent>
                    </Card>
                  ) : selectedPipeline.generated_plan_data ? (
                    <Card className="border-dashed border-primary/40 bg-primary/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground space-y-1">
                        <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
                        Dados do protocolo disponíveis. Clique em <strong>"Gerar e Editar Plano"</strong> para criar o plano completo com refeições e editá-lo.
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
                      <CardContent className="py-3 text-center text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                        Plano ainda não foi gerado. Clique em <strong>"Gerar Plano"</strong> para gerar com base na anamnese do paciente.
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                /* Reject form */
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-destructive">Rejeitar plano de {selectedPipeline.patient_name}</p>
                  <div className="space-y-2">
                    <Label>Motivo da rejeição</Label>
                    <Textarea
                      placeholder="Ex: Necessário ajustar calorias, dados inconsistentes..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setRejectMode(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectReason.trim()} className="flex-1">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Confirmar Rejeição
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ── Sticky action buttons at bottom ── */}
        {selectedPipeline && !rejectMode && (
          <div className="border-t pt-4 -mx-6 px-6 flex gap-3">
            {(() => {
              const planId = selectedPipeline.generated_plan_id || selectedPipeline.generated_plan_data?.mealPlanId;
              if (planId) {
                return (
                  <Button
                    className="flex-1 gradient-primary shadow-glow"
                    disabled={processing}
                    onClick={() => handleOpenPlanForReview(planId)}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                    {processing ? "Preparando plano..." : "Analisar e Editar o Plano"}
                  </Button>
                );
              }
              if (selectedPipeline.generated_plan_data || selectedPipeline.status === 'pending_approval' || selectedPipeline.status === 'pending_plan_generation') {
                return (
                  <Button
                    className="flex-1 gradient-primary shadow-glow"
                    disabled={processing}
                    onClick={handleCreateAndEdit}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {processing ? "Gerando plano..." : "Gerar e Editar Plano"}
                  </Button>
                );
              }
              return (
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Nenhum plano detectado para este paciente. O paciente precisa completar as etapas de onboarding primeiro.</span>
                </div>
              );
            })()}
            <Button variant="destructive" onClick={() => setRejectMode(true)} disabled={processing}>
              <XCircle className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Hook to check for pending approvals count — lightweight, only counts eligible patients */
export function usePendingApprovals() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: pipelines } = await supabase
        .from("onboarding_pipelines" as any)
        .select("id, patient_id")
        .eq("nutritionist_id", user.id)
        .in("status", ["pending_approval", "pending_plan_generation"]);

      if (!pipelines || pipelines.length === 0) {
        setCount(0);
        return;
      }

      const patientIds = (pipelines as any[]).map((p: any) => p.patient_id);
      const [{ data: activeLinks }, { data: publishedPlans }] = await Promise.all([
        supabase
          .from("nutritionist_patients")
          .select("patient_id")
          .eq("nutritionist_id", user.id)
          .in("patient_id", patientIds)
          .eq("status", "active"),
        supabase
          .from("meal_plans")
          .select("patient_id")
          .in("patient_id", patientIds)
          .in("plan_status", ["approved", "published_to_patient"])
          .eq("is_active", true),
      ]);

      const activeSet = new Set((activeLinks || []).map((l: any) => l.patient_id));
      const publishedSet = new Set((publishedPlans || []).map((p: any) => p.patient_id));
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const validPipelines = (pipelines as any[]).filter((p: any) =>
        activeSet.has(p.patient_id) &&
        !publishedSet.has(p.patient_id) &&
        new Date(p.created_at) >= thirtyDaysAgo
      );
      setCount(validPipelines.length);
    };

    // Only check once on mount, then on explicit realtime events
    if (!checkedRef.current) {
      check();
      checkedRef.current = true;
    }

    // Realtime: only listen for relevant updates, throttle re-checks
    let timeout: ReturnType<typeof setTimeout>;
    const ch = supabase
      .channel("pending-count-v2")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "onboarding_pipelines",
        filter: `nutritionist_id=eq.${user.id}`,
      }, () => {
        // Debounce to avoid rapid-fire recalculations
        clearTimeout(timeout);
        timeout = setTimeout(check, 2000);
      })
      .subscribe();
    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(ch);
    };
  }, [user]);

  return count;
}
