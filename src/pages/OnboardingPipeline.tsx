import { useState, useEffect, useCallback } from "react";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { usePatientPlanStatus } from "@/hooks/usePatientPlanStatus";
import { useConsentGuard, TERMS_VERSION } from "@/hooks/useConsentGuard";
import { logAudit } from "@/lib/auditLog";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Scale, Camera, Clock, Utensils, Sparkles,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, AlertCircle,
  ChefHat, Heart, Zap, ThumbsUp, Shield
} from "lucide-react";
import OnboardingExitGuard from "@/components/onboarding/OnboardingExitGuard";
import SmartNumericInput from "@/components/ui/SmartNumericInput";
import { normalizeHeightInput, normalizeWeightInput, type NormalizationResult } from "@/lib/normalizeInputs";

interface Pipeline {
  id: string;
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
  generated_plan_data: any;
  nutritionist_id: string;
  rejection_reason: string | null;
}

const STEPS = [
  { id: "consent", label: "Consentimento", icon: Shield, description: "Aceite o consentimento clínico (LGPD)" },
  { id: "anamnesis", label: "Anamnese", icon: ClipboardCheck, description: "Preencha seu questionário de saúde" },
  { id: "body_data", label: "Dados Corporais", icon: Scale, description: "Peso, altura e fotos" },
  { id: "preferences", label: "Preferências", icon: Utensils, description: "Horários e alimentos favoritos" },
  { id: "plan_generation", label: "Pré-Plano", icon: Sparkles, description: "Protocolo FitJourney gera seu plano" },
  { id: "approval", label: "Aprovação", icon: ThumbsUp, description: "Profissional revisa e aprova" },
];

export default function OnboardingPipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planStatus = usePatientPlanStatus();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);

  // Body data form
  const [bodyForm, setBodyForm] = useState({ weight: "", height: "" });
  const [bodyNormalized, setBodyNormalized] = useState<{ weight: NormalizationResult | null; height: NormalizationResult | null }>({ weight: null, height: null });

  const handleWeightChange = useCallback((raw: string, result: NormalizationResult) => {
    setBodyForm(prev => ({ ...prev, weight: raw }));
    setBodyNormalized(prev => ({ ...prev, weight: result }));
  }, []);

  const handleHeightChange = useCallback((raw: string, result: NormalizationResult) => {
    setBodyForm(prev => ({ ...prev, height: raw }));
    setBodyNormalized(prev => ({ ...prev, height: result }));
  }, []);
  // Preferences form
  const [prefForm, setPrefForm] = useState({
    wake_time: "06:30",
    sleep_time: "23:00",
    meal_count: 5,
    cooking_preference: "homemade",
    favorite_foods: "",
    disliked_foods: "",
  });

  useEffect(() => {
    if (user) fetchPipeline();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("onboarding-pipeline")
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_pipelines", filter: `patient_id=eq.${user.id}` }, () => fetchPipeline())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function fetchPipeline() {
    if (!user) return;
    const [pipelineRes, anamnesisRes] = await Promise.all([
      supabase
        .from("onboarding_pipelines" as any)
        .select("*")
        .eq("patient_id", user.id)
        .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan","superseded_by_reset")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("patient_anamnesis")
        .select("id, status, created_at, updated_at") 
        .eq("user_id", user.id)
        .in("status", ["completed", "draft"])
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .maybeSingle(),
    ]);

    if (pipelineRes.data) {
      const d = pipelineRes.data as any;

      // Auto-sync only when the completed anamnesis is newer than the latest pipeline reset.
      const pipelineTouchedAt = new Date(d.updated_at || d.created_at || 0).getTime();
      const anamnesisTouchedAt = anamnesisRes.data
        ? new Date((anamnesisRes.data as any).updated_at || (anamnesisRes.data as any).created_at || 0).getTime()
        : 0;
      const hasFreshCompletedAnamnesis = !!anamnesisRes.data && anamnesisTouchedAt >= pipelineTouchedAt;

      if (hasFreshCompletedAnamnesis && !d.anamnesis_completed) {
        await supabase
          .from("onboarding_pipelines" as any)
          .update({ anamnesis_completed: true, status: "in_progress" } as any)
          .eq("id", d.id);
        d.anamnesis_completed = true;
        d.status = "in_progress";
      }

      setPipeline(d);
      if (d.weight) setBodyForm({ weight: String(d.weight), height: String(d.height || "") });
      if (d.cooking_preference) {
        setPrefForm({
          wake_time: d.wake_time || "06:30",
          sleep_time: d.sleep_time || "23:00",
          meal_count: d.meal_count || 5,
          cooking_preference: d.cooking_preference || "homemade",
          favorite_foods: d.food_preferences?.favorites || "",
          disliked_foods: d.food_preferences?.disliked || "",
        });
      }
    }
    setLoading(false);
  }

  function getCurrentStep(): number {
    // Step 0: Consent
    if (!hasConsent && !consentLoading) return 0;
    if (!pipeline) return 0;
    if (!pipeline.anamnesis_completed) return 1;
    if (!pipeline.body_data_completed) return 2;
    if (!pipeline.preferences_completed) return 3;
    if (!pipeline.plan_generated) return 4;
    if (!pipeline.plan_approved) return 5;
    return 6;
  }

  async function handleAcceptConsent() {
    if (!consentAccepted || !user) return;
    setConsentSubmitting(true);
    try {
      const deviceInfo = `${navigator.userAgent.slice(0, 200)}`;
      const { error } = await (supabase as any)
        .from("clinical_consents")
        .insert({
          patient_id: user.id,
          accepted_terms_version: TERMS_VERSION,
          device_info: deviceInfo,
        });
      if (error) throw error;

      await supabase.rpc("accept_patient_consent" as any, { _patient_id: user.id });

      logAudit("consent_accepted", "clinical_consents", user.id, { version: TERMS_VERSION });

      await queryClient.invalidateQueries({ queryKey: ["clinical-consent"] });
      toast.success("Consentimento registrado! Vamos continuar.");
    } catch (err) {
      console.error("Consent error:", err);
      toast.error("Erro ao registrar consentimento. Tente novamente.");
    } finally {
      setConsentSubmitting(false);
    }
  }

  async function handleGoToAnamnesis() {
    // Use SPA navigation. Hard reload routes through Lovable's auth-bridge,
    // which lands the patient on /client/dashboard and triggers a guard loop.
    navigate("/anamnesis?pipeline=true");
  }

  async function handleSaveBodyData() {
    if (!pipeline || !user) return;
    const w = bodyNormalized.weight?.value;
    const h = bodyNormalized.height?.value;
    if (!w || !h || !bodyNormalized.weight?.isValid || !bodyNormalized.height?.isValid) {
      toast.error("Preencha peso e altura válidos");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_pipelines" as any)
      .update({
        weight: w,
        height: h,
        body_data_completed: true,
        status: "pending_preferences",
      } as any)
      .eq("id", pipeline.id);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Dados corporais salvos!");
      fetchPipeline();
    }
    setSaving(false);
  }

  async function handleSavePreferences() {
    if (!pipeline || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("onboarding_pipelines" as any)
      .update({
        wake_time: prefForm.wake_time,
        sleep_time: prefForm.sleep_time,
        meal_count: prefForm.meal_count,
        cooking_preference: prefForm.cooking_preference,
        food_preferences: {
          favorites: prefForm.favorite_foods,
          disliked: prefForm.disliked_foods,
        },
        preferences_completed: true,
        status: "pending_plan_generation",
      } as any)
      .eq("id", pipeline.id);
    if (error) {
      toast.error("Erro ao salvar");
      setSaving(false);
      return;
    }

    toast.success("Preferências salvas! Gerando plano automaticamente...");
    fetchPipeline();
    setSaving(false);

    // Auto-trigger plan generation after preferences are completed
    setTimeout(() => handleGeneratePlan(), 500);
  }

  async function handleGeneratePlan() {
    if (!pipeline || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          patientId: user.id,
          nutritionistId: pipeline.nutritionist_id,
          weight: pipeline.weight,
          height: pipeline.height,
          wakeTime: pipeline.wake_time,
          sleepTime: pipeline.sleep_time,
          mealCount: pipeline.meal_count,
          cookingPreference: pipeline.cooking_preference,
          foodPreferences: pipeline.food_preferences,
          isPipeline: true,
          planCount: 3,
        },
      });

      if (error) {
        const msg = await friendlyEdgeFunctionError(error, "Falha na geração do plano");
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || "Falha na geração");

      // Update pipeline — handle both multi-plan and single-plan responses
      const resolvedPlanId = data.multiPlan && data.plans?.length > 0
        ? data.plans[0].mealPlanId
        : data.mealPlanId || null;

      await supabase
        .from("onboarding_pipelines" as any)
        .update({
          plan_generated: true,
          generated_plan_id: resolvedPlanId,
          generated_plan_data: data,
          status: "pending_approval",
        } as any)
        .eq("id", pipeline.id);

      // Notify nutritionist
      const planCountMsg = data.multiPlan ? `${data.plans.length} opções de plano` : "Pré-plano";
      const patientName = (await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle()).data?.full_name || "Paciente";
      await supabase.from("notifications").insert({
        user_id: pipeline.nutritionist_id,
        title: "🔔 Plano Aguardando Aprovação",
        message: `${patientName} completou o onboarding. ${planCountMsg} de ${data.explainability?.calculation?.final_kcal || ''}kcal gerado(s) via Protocolo FitJourney.`,
        type: "warning",
        action_url: `/patients/${user.id}?tab=onboarding`,
      } as any);

      // Transition lifecycle: onboarding_active → draft_ready_for_review
      await supabase.rpc("complete_patient_onboarding_by_patient" as any, {
        _patient_id: user.id,
        _pipeline_id: pipeline.id,
      });

      toast.success(data.multiPlan 
        ? `${data.plans.length} opções de plano geradas! Aguardando aprovação do profissional.`
        : "Pré-plano gerado! Aguardando aprovação do profissional."
      );
      fetchPipeline();
    } catch (err: any) {
      toast.error("Erro ao gerar plano: " + (err.message || "Tente novamente"));
    }
    setGenerating(false);
  }

  const currentStep = getCurrentStep();
  const progress = (currentStep / 6) * 100;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (planStatus.status === "plan_delivered") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="text-2xl font-bold">Seu plano já foi entregue ✅</h2>
          <p className="text-muted-foreground">
            O onboarding anterior foi encerrado automaticamente porque seu plano já está disponível no painel.
          </p>
          <Button onClick={() => navigate("/my-diet")} className="gradient-primary">
            Ver meu plano
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!pipeline) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Nenhum onboarding ativo</h2>
          <p className="text-muted-foreground">
            Seu profissional ainda não ativou o fluxo automático de onboarding.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (currentStep >= 6) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="text-2xl font-bold">Onboarding Completo! 🎉</h2>
          <p className="text-muted-foreground">
            Seu plano alimentar foi aprovado e está ativo. Acesse pelo menu "Minha Dieta".
          </p>
          <Button onClick={() => navigate("/my-diet")}>
            Ver Meu Plano <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const exitGuardEnabled = !loading && !!pipeline && currentStep < 5;
  const hasStartedFilling = currentStep > 0 || !!pipeline?.anamnesis_completed;

  return (
    <DashboardLayout>
      <OnboardingExitGuard enabled={exitGuardEnabled} hasStartedFilling={hasStartedFilling} />
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Onboarding Automatizado</h1>
          <p className="text-muted-foreground">Complete as etapas para receber seu plano alimentar personalizado</p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <motion.div
                  key={step.id}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: done ? 1 : active ? 1.08 : 0.95 }}
                  className={`flex flex-col items-center gap-1 ${active ? "text-primary" : done ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      : active
                      ? "border-primary bg-primary/10 animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                      : "border-muted bg-muted/30"
                  }`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-center">{step.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Rejection Banner */}
        {pipeline.rejection_reason && pipeline.status === "rejected" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Plano não aprovado</p>
                  <p className="text-sm text-muted-foreground">{pipeline.rejection_reason}</p>
                  <p className="text-sm mt-1">Ajuste seus dados e gere um novo plano.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Step 0: Consent (LGPD) */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Etapa 1: Consentimento Clínico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Antes de iniciar, precisamos do seu consentimento para o tratamento seguro dos seus dados de saúde conforme a LGPD.
                  </p>
                  <div className="bg-muted/30 border border-border/30 rounded-xl p-4 space-y-3 text-sm text-muted-foreground">
                    <p>• Seus dados serão processados para gerar insights e recomendações personalizadas.</p>
                    <p>• Todos os dados são criptografados e acessíveis apenas ao seu profissional.</p>
                    <p>• Você pode visualizar, exportar ou solicitar exclusão a qualquer momento.</p>
                    <p className="text-xs"><strong>Base Legal:</strong> Art. 7º e Art. 11 da LGPD (Lei nº 13.709/2018). Versão: {TERMS_VERSION}</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={consentAccepted}
                      onCheckedChange={(v) => setConsentAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      Li e compreendi. <strong>Autorizo o tratamento dos meus dados clínicos</strong> para fins de acompanhamento nutricional personalizado.
                    </span>
                  </label>
                  <Button onClick={handleAcceptConsent} className="w-full" size="lg" disabled={!consentAccepted || consentSubmitting}>
                    {consentSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Aceitar e Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Anamnesis */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    Etapa 2: Anamnese
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Preencha o questionário completo de anamnese para que possamos entender seu perfil de saúde, objetivos e rotina.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Heart, label: "Saúde geral" },
                      { icon: Scale, label: "Composição corporal" },
                      { icon: Clock, label: "Rotina diária" },
                      { icon: Utensils, label: "Hábitos alimentares" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <item.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleGoToAnamnesis} className="w-full" size="lg">
                    Iniciar Anamnese <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Body Data */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    Etapa 3: Dados Corporais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Informe seu peso e altura atuais para calcularmos suas necessidades calóricas.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <SmartNumericInput
                      label="Peso (kg)"
                      placeholder="Ex: 72 ou 72,5"
                      normalizer={normalizeWeightInput}
                      value={bodyForm.weight}
                      onChange={handleWeightChange}
                    />
                    <SmartNumericInput
                      label="Altura (cm)"
                      placeholder="Ex: 158 ou 1,58"
                      normalizer={normalizeHeightInput}
                      value={bodyForm.height}
                      onChange={handleHeightChange}
                    />
                  </div>
                  <Button
                    onClick={handleSaveBodyData}
                    className="w-full"
                    size="lg"
                    disabled={saving || !bodyNormalized.weight?.isValid || !bodyNormalized.height?.isValid}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar e Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Preferences */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-primary" />
                    Etapa 4: Preferências Alimentares
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Horário de acordar</Label>
                      <Input type="time" value={prefForm.wake_time} onChange={(e) => setPrefForm({ ...prefForm, wake_time: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário de dormir</Label>
                      <Input type="time" value={prefForm.sleep_time} onChange={(e) => setPrefForm({ ...prefForm, sleep_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nº de refeições por dia</Label>
                    <div className="flex gap-2">
                      {[3, 4, 5, 6].map((n) => (
                        <Button
                          key={n}
                          variant={prefForm.meal_count === n ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPrefForm({ ...prefForm, meal_count: n })}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferência de preparo</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { value: "quick", label: "⚡ Prático" },
                        { value: "homemade", label: "🏠 Caseiro" },
                        { value: "gourmet", label: "👨‍🍳 Gourmet" },
                        { value: "any", label: "🤷 Tanto faz" },
                      ].map((opt) => (
                        <Button
                          key={opt.value}
                          variant={prefForm.cooking_preference === opt.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPrefForm({ ...prefForm, cooking_preference: opt.value })}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Alimentos favoritos</Label>
                    <Input placeholder="Ex: frango, arroz, banana..." value={prefForm.favorite_foods} onChange={(e) => setPrefForm({ ...prefForm, favorite_foods: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Alimentos que não gosta</Label>
                    <Input placeholder="Ex: berinjela, jiló..." value={prefForm.disliked_foods} onChange={(e) => setPrefForm({ ...prefForm, disliked_foods: e.target.value })} />
                  </div>
                  <Button onClick={handleSavePreferences} className="w-full" size="lg" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar e Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Plan Generation */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Etapa 5: Geração do Pré-Plano
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Com base nos seus dados, o Protocolo FitJourney vai calcular TMB, TDEE e gerar um plano alimentar 100% personalizado. Após a geração, o profissional revisará e aprovará.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>Peso:</span><span className="font-medium">{pipeline.weight} kg</span></div>
                    <div className="flex justify-between text-sm"><span>Altura:</span><span className="font-medium">{pipeline.height} cm</span></div>
                    <div className="flex justify-between text-sm"><span>Refeições/dia:</span><span className="font-medium">{pipeline.meal_count}</span></div>
                    <div className="flex justify-between text-sm"><span>Preparo:</span><span className="font-medium">{{ quick: "⚡ Prático", homemade: "🏠 Caseiro", gourmet: "👨‍🍳 Gourmet", any: "🤷 Tanto faz" }[pipeline.cooking_preference] || pipeline.cooking_preference}</span></div>
                  </div>
                  <Button onClick={handleGeneratePlan} className="w-full" size="lg" disabled={generating}>
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Gerando plano...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar Meu Pré-Plano
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Waiting Approval */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-primary" />
                    Etapa 6: Aguardando Aprovação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <div className="py-8">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <Clock className="w-10 h-10 text-primary" />
                    </motion.div>
                  </div>
                  <h3 className="text-lg font-semibold">Seu plano foi gerado!</h3>
                  <p className="text-muted-foreground">
                    O profissional está revisando seu pré-plano alimentar. Você receberá uma notificação assim que ele for aprovado.
                  </p>
                  <Badge variant="secondary" className="text-sm">
                    ⏳ Aguardando revisão do profissional
                  </Badge>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
