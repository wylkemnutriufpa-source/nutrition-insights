import { useState, useEffect } from "react";
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
  { id: "anamnesis", label: "Anamnese", icon: ClipboardCheck, description: "Preencha seu questionário de saúde" },
  { id: "body_data", label: "Dados Corporais", icon: Scale, description: "Peso, altura e fotos" },
  { id: "preferences", label: "Preferências", icon: Utensils, description: "Horários e alimentos favoritos" },
  { id: "plan_generation", label: "Pré-Plano", icon: Sparkles, description: "Protocolo FitJourney gera seu plano" },
  { id: "approval", label: "Aprovação", icon: ThumbsUp, description: "Profissional revisa e aprova" },
];

export default function OnboardingPipeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const planStatus = usePatientPlanStatus();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Body data form
  const [bodyForm, setBodyForm] = useState({ weight: "", height: "" });
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
    const { data } = await supabase
      .from("onboarding_pipelines" as any)
      .select("*")
      .eq("patient_id", user.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
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
    if (!pipeline) return 0;
    if (!pipeline.anamnesis_completed) return 0;
    if (!pipeline.body_data_completed) return 1;
    if (!pipeline.preferences_completed) return 2;
    if (!pipeline.plan_generated) return 3;
    if (!pipeline.plan_approved) return 4;
    return 5;
  }

  async function handleGoToAnamnesis() {
    navigate("/anamnesis?pipeline=true");
  }

  async function handleSaveBodyData() {
    if (!pipeline || !user) return;
    const w = parseFloat(bodyForm.weight);
    const h = parseFloat(bodyForm.height);
    if (!w || !h || w < 30 || h < 100) {
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

      if (error) throw error;
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
  const progress = (currentStep / 5) * 100;

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

  if (currentStep >= 5) {
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

  return (
    <DashboardLayout>
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
            {/* Step 0: Anamnesis */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    Etapa 1: Anamnese
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

            {/* Step 1: Body Data */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    Etapa 2: Dados Corporais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Informe seu peso e altura atuais para calcularmos suas necessidades calóricas.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Peso (kg)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 72"
                        value={bodyForm.weight}
                        onChange={(e) => setBodyForm({ ...bodyForm, weight: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Altura (cm)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 170"
                        value={bodyForm.height}
                        onChange={(e) => setBodyForm({ ...bodyForm, height: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveBodyData} className="w-full" size="lg" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar e Continuar <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Preferences */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-primary" />
                    Etapa 3: Preferências Alimentares
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

            {/* Step 3: Plan Generation */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Etapa 4: Geração do Pré-Plano
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
                    <div className="flex justify-between text-sm"><span>Preparo:</span><span className="font-medium">{pipeline.cooking_preference}</span></div>
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

            {/* Step 4: Waiting Approval */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5 text-primary" />
                    Etapa 5: Aguardando Aprovação
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
