import { useState, useEffect } from "react";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { approveAndPublishPlan, rejectMealPlan, transitionPlanToReview } from "@/lib/serverTransitions";
import { supabase } from "@/integrations/supabase/client";
import { finalizeGeneratedMealPlan } from "@/lib/finalizeGeneratedMealPlan";
import { localGenerateMealPlan } from "@/lib/localMealPlanGenerator";
import {
  inspectOnboardingPlan,
  resolveLatestUsableOnboardingPlan,
  syncPipelineGeneratedPlan,
} from "@/lib/onboardingPlanResolver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Sparkles, Edit2, ChevronDown,
  Scale, Target, MessageSquare, Loader2, CalendarClock, Zap,
  ClipboardCheck, FileText, AlertTriangle
} from "lucide-react";

interface OnboardingPipeline {
  id: string;
  patient_id: string;
  status: string;
  anamnesis_completed: boolean;
  body_data_completed: boolean;
  preferences_completed: boolean;
  plan_generated: boolean;
  plan_approved: boolean;
  weight: number | null;
  height: number | null;
  wake_time: string | null;
  sleep_time: string | null;
  meal_count: number;
  cooking_preference: string | null;
  food_preferences: any;
  generated_plan_id: string | null;
  generated_plan_data: any;
  use_scheduling_criteria: boolean;
  scheduling_criteria: any;
  rejection_reason: string | null;
  created_at: string;
}

interface Props {
  patientId: string;
  patientName: string;
}

const DEFAULT_CRITERIA = {
  auto_deactivate_previous: true,
  weight_enabled: false,
  weight_loss_kg: 1,
  checklist_enabled: true,
  checklist_min_adherence: 80,
  checklist_days: 14,
  feedback_enabled: true,
  feedback_interval_days: 15,
  extension_days: 15,
  max_extensions: 2,
  current_extensions: 0,
  manual_only: false,
};

export default function OnboardingApprovalQueue({ patientId, patientName }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<OnboardingPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [useScheduling, setUseScheduling] = useState(false);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [creating, setCreating] = useState(false);
  const [openingEditor, setOpeningEditor] = useState(false);
  const [planOptions, setPlanOptions] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, [patientId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`onboarding-${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_pipelines", filter: `patient_id=eq.${patientId}` }, () => fetchPipeline())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId]);

  async function fetchPipeline() {
    const { data } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const p = data as any;
      console.log("[OnboardingApproval] Pipeline loaded:", { id: p.id, status: p.status, plan_generated: p.plan_generated, plan_approved: p.plan_approved, generated_plan_id: p.generated_plan_id });
      setPipeline(p);
      setUseScheduling(p.use_scheduling_criteria || false);
      setCriteria(p.scheduling_criteria || DEFAULT_CRITERIA);

      // Restore plan options from saved data
      if (p.generated_plan_data?.multiPlan && p.generated_plan_data?.plans?.length > 0) {
        setPlanOptions(p.generated_plan_data.plans);
        setSelectedPlanId(p.generated_plan_id || p.generated_plan_data.plans[0].mealPlanId);
      } else {
        setPlanOptions([]);
      }

      // Keep pending approval status only when the onboarding is actually complete.
      const patientStepsDone = !!p.anamnesis_completed && !!p.body_data_completed && !!p.preferences_completed;
      if (p.plan_generated && !p.plan_approved && patientStepsDone && !["pending_approval", "completed", "rejected", "review"].includes(p.status)) {
        await supabase
          .from("onboarding_pipelines" as any)
          .update({ status: "pending_approval" } as any)
          .eq("id", p.id);
        setPipeline({ ...p, status: "pending_approval" });
      }

    }
    setLoading(false);
  }

  async function handleCreatePipeline() {
    if (!user) return;
    setCreating(true);
    const { error } = await supabase
      .from("onboarding_pipelines" as any)
      .insert({
        patient_id: patientId,
        nutritionist_id: user.id,
        status: "pending_anamnesis",
      } as any);
    if (error) {
      if (error.code === "23505") toast.info("Pipeline já existe para este paciente");
      else toast.error("Erro ao criar pipeline");
    } else {
      toast.success("Onboarding ativado! Paciente receberá o fluxo automático.");
      // Notify patient
      await supabase.from("notifications").insert({
        user_id: patientId,
        title: "Onboarding Ativado! 🚀",
        message: "Seu nutricionista ativou o fluxo automático de onboarding. Complete as etapas para receber seu plano alimentar personalizado.",
        type: "success",
        action_url: "/onboarding",
      } as any);
      fetchPipeline();
    }
    setCreating(false);
  }

  async function handleApprove() {
    if (!pipeline || !user) return;

    // Use selected plan or fallback
    const planId = selectedPlanId || pipeline.generated_plan_id || pipeline.generated_plan_data?.mealPlanId;
    if (!planId) {
      toast.error("Nenhum plano encontrado. Gere o plano primeiro antes de aprovar.");
      return;
    }

    setProcessing(true);

    // Update pipeline as approved
    await supabase
      .from("onboarding_pipelines" as any)
      .update({
        plan_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        status: "completed",
        use_scheduling_criteria: useScheduling,
        scheduling_criteria: criteria,
      } as any)
      .eq("id", pipeline.id);

      // Use server-authoritative RPC to approve + publish atomically
      if (planId) {
        const result = await approveAndPublishPlan(planId, user.id);
        if (!result.success) {
          toast.error("Erro ao aprovar plano: " + (result.error || ""));
          setProcessing(false);
          return;
        }

      // Schedule criteria if enabled
      if (useScheduling) {
        const activateDate = new Date();
        activateDate.setDate(activateDate.getDate() + (criteria.checklist_days || 14));
        await supabase
          .from("plan_schedules" as any)
          .insert({
            meal_plan_id: planId,
            activate_at: activateDate.toISOString().split("T")[0],
            criteria: criteria,
            status: "scheduled",
          } as any);
      }
    }

    // Notify patient
    await supabase.from("notifications").insert({
      user_id: patientId,
      title: "Plano Alimentar Aprovado! 🎉",
      message: "Seu plano foi revisado e aprovado. Acesse em 'Minha Dieta'. Validade: 30 dias.",
      type: "success",
      action_url: "/my-diet",
    } as any);

    // Clean up non-selected plan options
    if (planOptions.length > 1) {
      const otherPlanIds = planOptions
        .filter((p: any) => p.mealPlanId !== planId)
        .map((p: any) => p.mealPlanId);
      for (const otherId of otherPlanIds) {
        await rejectMealPlan(otherId, user.id, "Opção não selecionada");
      }
    }

    toast.success("Plano aprovado e publicado com sucesso!");
    setPlanOptions([]);
    fetchPipeline();
    setProcessing(false);
  }

  async function handleReject() {
    if (!pipeline || !rejectReason.trim()) {
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
      .eq("id", pipeline.id);

    // Archive the generated plan via server-authoritative RPC
    if (pipeline.generated_plan_id) {
      await rejectMealPlan(pipeline.generated_plan_id, user.id, rejectReason);
    }

    // Notify patient
    await supabase.from("notifications").insert({
      user_id: patientId,
      title: "Plano Precisa de Ajustes",
      message: `Seu plano não foi aprovado: ${rejectReason}. Ajuste seus dados e gere um novo.`,
      type: "warning",
      action_url: "/onboarding",
    } as any);

    toast.success("Plano rejeitado. Paciente foi notificado.");
    setRejectDialog(false);
    setRejectReason("");
    fetchPipeline();
    setProcessing(false);
  }

  async function handleGenerateNewPlan() {
    if (!pipeline || !user) return;

    const patientStepsDone = !!pipeline.anamnesis_completed && !!pipeline.body_data_completed && !!pipeline.preferences_completed;
    if (!patientStepsDone) {
      toast.error("O plano só pode ser gerado após consentimento, anamnese, dados corporais e preferências completos.");
      return;
    }

    setOpeningEditor(true);
    try {
      toast.info("Gerando opções de plano (NutriCore V2)... Aguarde.");
      const data = await localGenerateMealPlan({
        patientId: pipeline.patient_id,
        nutritionistId: user.id,
        weight: pipeline.weight,
        height: pipeline.height,
        mealCount: pipeline.meal_count,
        cookingPreference: pipeline.cooking_preference,
        isPipeline: true,
        planCount: 3,
      });
      if (!data?.success) throw new Error("Falha na geração");

      if (data.multiPlan && data.plans?.length > 0) {
        // Multi-plan: show options for selection
        setPlanOptions(data.plans);
        setSelectedPlanId(data.plans[0].mealPlanId);

        // Save first plan as default in pipeline
        await supabase
          .from("onboarding_pipelines" as any)
          .update({
            generated_plan_id: data.plans[0].mealPlanId,
            generated_plan_data: { ...data, selectedIndex: 0 },
            plan_generated: true,
            status: "pending_approval" // Force status to allow approval actions
          } as any)
          .eq("id", pipeline.id);

        toast.success(`${data.plans.length} opções de plano geradas! Escolha a melhor opção.`);
        fetchPipeline();

      } else {
        // Single plan fallback
        const newPlanId = data.mealPlanId;
        await supabase
          .from("onboarding_pipelines" as any)
          .update({
            generated_plan_id: newPlanId,
            generated_plan_data: data,
            plan_generated: true,
            status: "pending_approval" // Force status
          } as any)
          .eq("id", pipeline.id);


        const finalized = await finalizeGeneratedMealPlan({
          planId: newPlanId,
          patientId: pipeline.patient_id,
          userId: user.id,
          tenantId,
        });

        const reviewPlanId = finalized.finalPlanId;
        if (reviewPlanId !== newPlanId) {
          await syncPipelineGeneratedPlan(pipeline.id, reviewPlanId);
        }

        await transitionPlanToReview(reviewPlanId, user.id);

        toast.success(
          finalized.corrected
            ? "Plano gerado, corrigido pelo motor clínico e pronto para revisão."
            : `Plano gerado com ${data.items_count} itens! Revise e aprove.`
        );
        navigate(`/meal-plans/${reviewPlanId}`);
      }
    } catch (err: any) {
      toast.error("Erro ao gerar plano: " + (err.message || "Tente novamente"));
    } finally {
      setOpeningEditor(false);
    }
  }

  async function ensurePlanReadyAndOpen(planId: string) {
    if (!pipeline || !user) return;
    setOpeningEditor(true);
    try {
      let resolvedPlanId = planId;
      let resolvedPlan = await inspectOnboardingPlan(planId);

      if (!resolvedPlan?.isUsable) {
        const fallbackPlan = await resolveLatestUsableOnboardingPlan(pipeline.patient_id, user.id);

        if (fallbackPlan?.id && fallbackPlan.id !== planId) {
          resolvedPlan = fallbackPlan;
          resolvedPlanId = fallbackPlan.id;
          toast.info("Plano válido mais recente encontrado. Abrindo plano correto...");
        } else {
          toast.info(resolvedPlan && !resolvedPlan.hasItems
            ? "Plano sem refeições detectado. Gerando itens automaticamente..."
            : "Plano sem itens detectado. Gerando uma versão nova...");

          const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
            body: {
              patientId: pipeline.patient_id,
              nutritionistId: user.id,
              weight: pipeline.weight,
              height: pipeline.height,
              mealCount: pipeline.meal_count,
              cookingPreference: pipeline.cooking_preference,
              isPipeline: true,
              ...(resolvedPlan && !resolvedPlan.hasItems ? { meal_plan_id: planId } : {}),
            },
          });

          if (error) {
            const msg = await friendlyEdgeFunctionError(error, "Falha ao regenerar plano");
            throw new Error(msg);
          }
          if (!data?.success) throw new Error(data?.error || "Falha ao regenerar plano");

          resolvedPlanId = data?.mealPlanId || planId;
          resolvedPlan = await inspectOnboardingPlan(resolvedPlanId);

          await supabase
            .from("onboarding_pipelines" as any)
            .update({
              generated_plan_id: resolvedPlanId,
              generated_plan_data: data,
              plan_generated: true,
            } as any)
            .eq("id", pipeline.id);
        }
      }

      if (!pipeline.generated_plan_id || pipeline.generated_plan_id !== resolvedPlanId) {
        await syncPipelineGeneratedPlan(pipeline.id, resolvedPlanId);
      }

      const finalized = await finalizeGeneratedMealPlan({
        planId: resolvedPlanId,
        patientId: pipeline.patient_id,
        userId: user.id,
        tenantId,
      });

      if (finalized.finalPlanId !== resolvedPlanId) {
        resolvedPlanId = finalized.finalPlanId;
        await syncPipelineGeneratedPlan(pipeline.id, resolvedPlanId);
      }

      const requiresReviewTransition = !["approved", "published_to_patient"].includes(resolvedPlan?.plan_status || "");
      if (requiresReviewTransition) {
        await transitionPlanToReview(resolvedPlanId, user.id);
      }

      if (finalized.corrected) {
        toast.success("Plano revisado pelo motor clínico. Abrindo versão corrigida...");
      }

      navigate(`/meal-plans/${resolvedPlanId}`);
    } catch (err: any) {
      toast.error("Erro ao abrir plano: " + (err.message || "Tente novamente"));
    } finally {
      setOpeningEditor(false);
    }
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  // No pipeline - show activation button
  if (!pipeline) {
    return (
      <Card>
        <CardContent className="py-6 text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-lg font-semibold">Onboarding Automático</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Ative o fluxo automático para {patientName}. O paciente preencherá anamnese, dados corporais e preferências, e o Protocolo FitJourney gerará um pré-plano determinístico para sua aprovação.
          </p>
          <Button onClick={handleCreatePipeline} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Ativar Onboarding Automático
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pipeline exists - show status
  const stepsDone = [
    pipeline.anamnesis_completed,
    pipeline.body_data_completed,
    pipeline.preferences_completed,
    pipeline.plan_generated,
    pipeline.plan_approved,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Onboarding Pipeline
          </span>
          <Badge variant={pipeline.status === "completed" ? "default" : pipeline.status === "pending_approval" ? "secondary" : "outline"}>
            {pipeline.status === "completed" ? "✅ Completo" :
             pipeline.status === "pending_approval" ? "⏳ Aguardando Aprovação" :
             pipeline.status === "rejected" ? "❌ Rejeitado" :
             `Etapa ${stepsDone}/5`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps overview */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: "Anamnese", done: pipeline.anamnesis_completed, icon: "📋", key: "anamnesis" },
            { label: "Corpo", done: pipeline.body_data_completed, icon: "⚖️", key: "body" },
            { label: "Prefs", done: pipeline.preferences_completed, icon: "🍽️", key: "prefs" },
            { label: "Plano", done: pipeline.plan_generated, icon: "✨", key: "plan" },
            { label: "Aprovado", done: pipeline.plan_approved, icon: "👍", key: "approved" },
          ].map((s, i) => {
            const isNext = !s.done && (i === 0 || [
              pipeline.anamnesis_completed,
              pipeline.body_data_completed,
              pipeline.preferences_completed,
              pipeline.plan_generated,
              pipeline.plan_approved,
            ][i - 1]);
            const isClickable = (s.key === "plan" || s.key === "approved") && pipeline.plan_generated && !pipeline.plan_approved;
            return (
              <motion.div
                key={i}
                initial={{ scale: 0.9 }}
                animate={{ scale: s.done ? 1 : isNext ? 1.05 : 0.95 }}
                onClick={() => {
                  if (isClickable) {
                    const planId = pipeline.generated_plan_id || pipeline.generated_plan_data?.mealPlanId;
                    if (planId) {
                      ensurePlanReadyAndOpen(planId);
                    } else {
                      handleGenerateNewPlan();
                    }
                  }
                }}
                className={`text-center p-2.5 rounded-lg text-xs font-semibold border-2 transition-all duration-300 ${
                  s.done
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : isNext
                    ? "bg-amber-500/15 border-amber-500/60 text-amber-400 animate-pulse"
                    : "bg-muted/50 border-muted text-muted-foreground"
                } ${isClickable ? "cursor-pointer hover:scale-105" : ""}`}
              >
                <span className="text-base">{s.done ? "✅" : isNext ? "⏳" : s.icon}</span>
                <div className="mt-1">{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Patient data summary */}
        {(pipeline.weight || pipeline.height) && (
          <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {pipeline.weight && <div><span className="text-muted-foreground">Peso:</span> <strong>{pipeline.weight}kg</strong></div>}
            {pipeline.height && <div><span className="text-muted-foreground">Altura:</span> <strong>{pipeline.height}cm</strong></div>}
            {pipeline.meal_count && <div><span className="text-muted-foreground">Refeições:</span> <strong>{pipeline.meal_count}/dia</strong></div>}
            {pipeline.cooking_preference && <div><span className="text-muted-foreground">Preparo:</span> <strong>{{ quick: "⚡ Prático", homemade: "🏠 Caseiro", gourmet: "👨‍🍳 Gourmet", any: "🤷 Tanto faz" }[pipeline.cooking_preference] || pipeline.cooking_preference}</strong></div>}
          </div>
        )}

        {/* Approval actions — show when plan is generated but not yet approved */}
        {pipeline.plan_generated && !pipeline.plan_approved && pipeline.status !== "completed" && (
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Pré-plano gerado pelo Protocolo FitJourney. Revise e decida:</p>

             {/* Explainability Panel */}
            {pipeline.generated_plan_data?.explainability && (() => {
              const ex = pipeline.generated_plan_data.explainability;
              const calc = ex.calculation || {};
              const profile = ex.patient_profile || {};
              const macros = ex.macros || {};
              const selected = ex.selected_template || {};
              const alts = ex.alternative_templates || [];
              return (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                  <p className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" /> Base da Sugestão
                  </p>
                  <div className="text-[10px] text-muted-foreground">
                    Motor v{ex.engine_version || "?"} • Protocolo {ex.protocol_version || "?"}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><span className="text-muted-foreground">Objetivo:</span> <strong>{profile.goal}</strong></div>
                    <div><span className="text-muted-foreground">Estratégia:</span> <strong>{profile.goal_strategy || "—"}</strong></div>
                    <div><span className="text-muted-foreground">Fórmula:</span> <strong>{calc.bmr_formula || "mifflin"}</strong></div>
                    <div><span className="text-muted-foreground">TMB:</span> <strong>{calc.tmb} kcal</strong></div>
                    <div><span className="text-muted-foreground">Fator TDEE:</span> <strong>×{calc.tdee_factor}</strong></div>
                    <div><span className="text-muted-foreground">TDEE:</span> <strong>{calc.tdee} kcal</strong></div>
                    <div><span className="text-muted-foreground">Ajuste:</span> <strong>{calc.goal_adjustment > 0 ? "+" : ""}{calc.goal_adjustment} kcal</strong></div>
                    <div><span className="text-muted-foreground">Meta Final:</span> <strong className="text-primary">{calc.final_kcal} kcal/dia</strong></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t pt-2">
                    <div className="text-center p-2 rounded bg-background"><span className="text-muted-foreground text-xs">Proteína</span><br/><strong>{macros.protein}g</strong></div>
                    <div className="text-center p-2 rounded bg-background"><span className="text-muted-foreground text-xs">Carboidratos</span><br/><strong>{macros.carbs}g</strong></div>
                    <div className="text-center p-2 rounded bg-background"><span className="text-muted-foreground text-xs">Gordura</span><br/><strong>{macros.fat}g</strong></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Fonte dados:</span> <strong>{calc.data_source === "physical_assessment" ? "Avaliação Física" : "Anamnese"}</strong></div>
                    <div><span className="text-muted-foreground">Nível atividade:</span> <strong>{profile.activity_level}</strong></div>
                  </div>
                  {profile.restrictions?.length > 0 && profile.restrictions[0] !== "nenhuma" && (
                    <div><span className="text-muted-foreground">Restrições:</span> <strong>{profile.restrictions.join(", ")}</strong></div>
                  )}
                  {profile.medical_conditions?.length > 0 && profile.medical_conditions[0] !== "nenhuma" && (
                    <div><span className="text-muted-foreground">Condições clínicas:</span> <strong>{profile.medical_conditions.join(", ")}</strong></div>
                  )}

                  {/* Template Selection with Score Breakdown */}
                  <div className="border-t pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground mb-1">Template selecionado:</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selected.name} ({selected.base_calories}kcal)</Badge>
                      <Badge variant="outline">Score: {selected.score}</Badge>
                    </div>
                    {selected.score_breakdown && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-[10px]">
                        <span className="bg-background rounded px-1.5 py-0.5">Objetivo: {selected.score_breakdown.goal_match}</span>
                        <span className="bg-background rounded px-1.5 py-0.5">Restrição: {selected.score_breakdown.restriction_match}</span>
                        <span className="bg-background rounded px-1.5 py-0.5">Calorias: {selected.score_breakdown.calorie_match}</span>
                        <span className="bg-background rounded px-1.5 py-0.5">Clínico: {selected.score_breakdown.clinical_match}</span>
                        <span className="bg-background rounded px-1.5 py-0.5">Preferência: {selected.score_breakdown.preference_match}</span>
                      </div>
                    )}
                    {selected.reasons?.map((r: string, i: number) => (
                      <span key={i} className="text-xs text-muted-foreground block">✓ {r}</span>
                    ))}
                  </div>

                  {/* Alternatives with score breakdown */}
                  {alts.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Alternativas ranqueadas:</p>
                      <div className="space-y-1">
                        {alts.map((t: any, i: number) => (
                          <div key={t.slug || i} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{t.name} ({t.base_calories}kcal)</Badge>
                            <span className="text-xs text-muted-foreground">{t.score}pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Plan Options Selection */}
            {planOptions.length > 1 && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Escolha a melhor opção de plano:
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {planOptions.map((opt: any, i: number) => {
                    const isSelected = selectedPlanId === opt.mealPlanId;
                    return (
                      <motion.button
                        key={opt.mealPlanId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          setSelectedPlanId(opt.mealPlanId);
                          if (pipeline) {
                            await supabase
                              .from("onboarding_pipelines" as any)
                              .update({
                                generated_plan_id: opt.mealPlanId,
                                generated_plan_data: {
                                  ...pipeline.generated_plan_data,
                                  selectedIndex: i,
                                  mealPlanId: opt.mealPlanId,
                                },
                              } as any)
                              .eq("id", pipeline.id);
                            setPipeline({ ...pipeline, generated_plan_id: opt.mealPlanId });
                          }
                        }}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(var(--primary),0.15)]"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px]">
                            {i === 0 ? "⭐ Recomendado" : `Opção ${i + 1}`}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{opt.score}pts</span>
                        </div>
                        <p className="font-semibold text-sm text-foreground truncate">{opt.templateName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{opt.baseCalories} kcal base • {opt.itemsCount} itens</p>
                        {opt.reasons?.slice(0, 2).map((r: string, j: number) => (
                          <span key={j} className="text-[10px] text-muted-foreground block mt-0.5">✓ {r}</span>
                        ))}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Link to edit */}
            {(() => {
              const planId = selectedPlanId || pipeline.generated_plan_id || pipeline.generated_plan_data?.mealPlanId;
              if (planId) {
                return (
                  <Button
                    className="w-full gap-2 gradient-primary shadow-glow"
                    disabled={openingEditor}
                    onClick={() => ensurePlanReadyAndOpen(planId)}
                  >
                    {openingEditor ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {openingEditor ? "Abrindo plano..." : "Analisar e Editar o Plano Selecionado"}
                  </Button>
                );
              }
              return (
                <Button
                  className="w-full gap-2 gradient-primary shadow-glow"
                  disabled={openingEditor}
                  onClick={() => handleGenerateNewPlan()}
                >
                  {openingEditor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {openingEditor ? "Gerando planos..." : "Gerar Opções de Plano"}
                </Button>
              );
            })()}

            {/* Scheduling Criteria - same as Biquíni Branco */}
            <Collapsible open={criteriaOpen} onOpenChange={setCriteriaOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Programar Planos (Critérios Biquíni Branco)
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${criteriaOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="flex items-center gap-3">
                  <Switch checked={useScheduling} onCheckedChange={setUseScheduling} />
                  <Label>Ativar programação automática de planos</Label>
                </div>

                {useScheduling && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3 p-3 bg-muted/50 rounded-lg"
                  >
                    {/* Weight criteria */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.weight_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, weight_enabled: v })}
                      />
                      <Scale className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Perda de peso mínima</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.weight_loss_kg}
                        onChange={(e) => setCriteria({ ...criteria, weight_loss_kg: Number(e.target.value) })}
                        disabled={!criteria.weight_enabled}
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                    </div>

                    {/* Checklist adherence */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.checklist_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, checklist_enabled: v })}
                      />
                      <ClipboardCheck className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Adesão checklist</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.checklist_min_adherence}
                        onChange={(e) => setCriteria({ ...criteria, checklist_min_adherence: Number(e.target.value) })}
                        disabled={!criteria.checklist_enabled}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>

                    {/* Checklist days */}
                    {criteria.checklist_enabled && (
                      <div className="flex items-center gap-3 pl-10">
                        <Label className="flex-1">Período de avaliação</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={criteria.checklist_days}
                          onChange={(e) => setCriteria({ ...criteria, checklist_days: Number(e.target.value) })}
                        />
                        <span className="text-xs text-muted-foreground">dias</span>
                      </div>
                    )}

                    {/* Feedback compliance */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={criteria.feedback_enabled}
                        onCheckedChange={(v) => setCriteria({ ...criteria, feedback_enabled: v })}
                      />
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <Label className="flex-1">Feedback a cada</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.feedback_interval_days}
                        onChange={(e) => setCriteria({ ...criteria, feedback_interval_days: Number(e.target.value) })}
                        disabled={!criteria.feedback_enabled}
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                    </div>

                    {/* Extension settings */}
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-muted-foreground ml-6" />
                      <Label className="flex-1">Extensão automática</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.extension_days}
                        onChange={(e) => setCriteria({ ...criteria, extension_days: Number(e.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                    </div>
                    <div className="flex items-center gap-3 pl-10">
                      <Label className="flex-1">Máx. extensões</Label>
                      <Input
                        type="number"
                        className="w-20"
                        value={criteria.max_extensions}
                        onChange={(e) => setCriteria({ ...criteria, max_extensions: Number(e.target.value) })}
                      />
                    </div>
                  </motion.div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Approve / Reject buttons */}
            <div className="flex gap-3">
              <Button onClick={handleApprove} className="flex-1" disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aprovar e Ativar Plano
              </Button>
              <Button variant="destructive" onClick={() => setRejectDialog(true)} disabled={processing}>
                <XCircle className="w-4 h-4 mr-2" /> Rejeitar
              </Button>
            </div>
          </div>
        )}

        {/* Completed state - still show options to regenerate if needed */}
        {pipeline.status === "completed" && (
          <div className="text-center py-4 space-y-4 border-t mt-4">
            <div className="space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium">Onboarding completo. Plano ativo.</p>
              {useScheduling && <Badge variant="outline"><CalendarClock className="w-3 h-3 mr-1" /> Programação automática ativa</Badge>}
            </div>
            
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  const planId = selectedPlanId || pipeline.generated_plan_id || pipeline.generated_plan_data?.mealPlanId;
                  if (planId) navigate(`/meal-plans/${planId}`);
                }}
              >
                <FileText className="w-4 h-4" />
                Abrir Plano Atual
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-primary"
                disabled={openingEditor}
                onClick={handleGenerateNewPlan}
              >
                {openingEditor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Novo Plano (Regenerar)
              </Button>
            </div>
          </div>
        )}


        {/* Dead-end recovery: all plans rejected / no active plan */}
        {pipeline.plan_generated && !pipeline.plan_approved && pipeline.status !== "completed" && !pipeline.generated_plan_data?.plans?.some((p: any) => p) && (
          <div className="text-center py-4 space-y-3 border-t">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-medium">Todos os planos foram rejeitados</p>
            <p className="text-xs text-muted-foreground">Você pode gerar novas opções de plano para este paciente.</p>
            <Button onClick={handleGenerateNewPlan} disabled={openingEditor}>
              {openingEditor ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar Novas Opções de Plano
            </Button>
          </div>
        )}
      </CardContent>

      {/* Reject dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Pré-Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motivo da rejeição</Label>
            <Textarea
              placeholder="Ex: Necessário ajustar as calorias, dados inconsistentes..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
