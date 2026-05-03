import { useState, useEffect, useCallback, useRef } from "react";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { invokeWithRetry, isTransientNetworkError } from "@/lib/api/edgeFunctions";
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
import { useNavigate, Link } from "react-router-dom";
import { usePatientPlanStatus } from "@/hooks/usePatientPlanStatus";
import { useConsentGuard, TERMS_VERSION } from "@/hooks/useConsentGuard";
import { logAudit } from "@/lib/auditLog";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Scale, Camera, Clock, Utensils, Sparkles,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, AlertCircle,
  ChefHat, Heart, Zap, ThumbsUp, Shield, RefreshCw
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
  // Persisted sync state — survives page reloads even without re-detection
  sync_pending?: boolean | null;
  sync_error?: string | null;
  sync_last_attempt_at?: string | null;
  sync_attempts?: number | null;
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
  const [activeJob, setActiveJob] = useState<any>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  // Sync fallback state — quando RPC de finalização falha mesmo com plano gerado
  const [syncError, setSyncError] = useState<string | null>(null);

  const [syncRetrying, setSyncRetrying] = useState(false);
  // Auto-retry com backoff exponencial: 5s, 10s, 20s, 40s, 80s, 160s (max)
  const [autoRetryAttempt, setAutoRetryAttempt] = useState(0);
  const [autoRetryNextAt, setAutoRetryNextAt] = useState<number | null>(null); // epoch ms do próximo retry
  const [autoRetryCancelled, setAutoRetryCancelled] = useState(false);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number>(0); // segundos restantes
  // Refs para evitar execuções concorrentes e permitir cancelamento limpo
  const syncInFlightRef = useRef(false);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_AUTO_RETRY_ATTEMPTS = 6;
  const BASE_RETRY_DELAY_MS = 5_000;
  const MAX_RETRY_DELAY_MS = 160_000;

  const clearAutoRetryTimers = useCallback(() => {
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

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

  // Realtime for meal-plan-jobs
  useEffect(() => {
    if (!user) return;
    
    // Fetch active job on mount
    supabase
      .from("meal_plan_jobs")
      .select("*")
      .eq("patient_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveJob(data);
      });

    const ch = supabase
      .channel("meal-plan-jobs")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "meal_plan_jobs", 
        filter: `patient_id=eq.${user.id}` 
      }, (payload: any) => {
        const job = payload.new;
        setActiveJob(job);
        
        if (job.status === "completed") {
          fetchPipeline();
          setGenerating(false);
          queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
        } else if (job.status === "failed") {
          setJobError(job.error || "Ocorreu um erro durante o processamento.");
          setGenerating(false);
        }
      })
      .subscribe();
      
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-detect inconsistent state on mount/reload: if the pipeline has
  // `plan_generated=true` but `plan_approved=false`, the lifecycle sync
  // SHOULD have already happened. We re-attempt it silently — if it fails
  // again, `syncError` is set and the "Sincronização pendente" banner
  // re-appears, keeping the UI coherent across reloads until the backend
  // finally confirms the transition.
  useEffect(() => {
    if (!pipeline) return;
    if (!pipeline.plan_generated) return;
    if (pipeline.plan_approved) return;
    // Run once per pipeline-id load — ignore the resolved boolean here;
    // success silently clears `syncError`, failure surfaces the banner.
    void runLifecycleSync(pipeline.id);
    
    // REDIRECT PROTECTION: Se o plano já foi gerado mas o paciente ainda está em 'awaiting_consent' ou 'lead_created'
    // forçamos a transição atômica para o dashboard através de invalidação de query
    if (pipeline.plan_generated) {
      console.log("[OnboardingPipeline] Plan generated, forcing state refresh");
      queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline?.id, pipeline?.plan_generated, pipeline?.plan_approved]);

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

      // Auto-sync only when there is a completed anamnesis record.
      const hasFreshCompletedAnamnesis = !!anamnesisRes.data && (anamnesisRes.data as any).status === "completed";

      if (hasFreshCompletedAnamnesis && !d.anamnesis_completed) {
        await supabase
          .from("onboarding_pipelines" as any)
          .update({ anamnesis_completed: true, status: "in_progress" } as any)
          .eq("id", d.id);
        d.anamnesis_completed = true;
        d.status = "in_progress";
      }

      setPipeline(d);

      // Hydrate persisted sync state — keeps the "Sincronização pendente"
      // banner visible across reloads even before the re-detection effect
      // runs, ensuring UI coherence with the database.
      if (d.sync_pending) {
        setSyncError(d.sync_error || "Sincronização pendente. Tente novamente.");
      } else {
        setSyncError(null);
      }

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
    
    // Fallback: Se não tem consentimento e não está carregando, passo 0 é obrigatório
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

  // NOTE: Anamnese é parte do mesmo onboarding (não rota separada conceitualmente).
  // Usamos <Link> real para garantir transição atômica sem rebote.
  // Pipeline + Anamnese = UMA jornada com mesmo OnboardingExitGuard e progresso.

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
      const { data, error } = await invokeWithRetry("generate-meal-plan", {
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
        // Após retries, se ainda for erro transitório de rede, mantemos o
        // botão em "Gerando..." e NÃO exibimos toast falso. O usuário pode
        // tentar novamente — o estado segue consistente.
        if (isTransientNetworkError(error)) {
          console.warn("[OnboardingPipeline] Transient network error after retries — silencing toast", error);
          // Mantém generating=true brevemente para não piscar erro falso, depois libera.
          setTimeout(() => setGenerating(false), 300);
          return;
        }
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

      // Transition lifecycle: pipeline → draft_ready_for_review (Plano em Revisão)
      const syncOk = await runLifecycleSync(pipeline.id);

      await queryClient.invalidateQueries({ queryKey: ["patient-lifecycle-state"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
      await queryClient.invalidateQueries({ queryKey: ["nutritionist_patients"] });

      if (syncOk) {
        toast.success(data.multiPlan
          ? `${data.plans.length} opções de plano geradas! Aguardando aprovação do profissional.`
          : "Pré-plano gerado! Aguardando aprovação do profissional."
        );
      } else {
        toast.warning(
          "Plano gerado, mas a sincronização final está pendente. Use o botão de tentar novamente abaixo.",
          { duration: 8000 }
        );
      }
      fetchPipeline();
    } catch (err: any) {
      // Última rede de proteção: se chegou um erro transitório aqui, não polua a UI.
      if (isTransientNetworkError(err)) {
        console.warn("[OnboardingPipeline] Transient network error caught — silencing toast", err);
      } else {
        toast.error("Erro ao gerar plano: " + (err.message || "Tente novamente"));
      }
    }
    setGenerating(false);
  }

  /**
   * Executa a RPC de finalização do onboarding com tratamento robusto.
   * Persiste o resultado no banco (sync_pending / sync_error) para que o
   * banner sobreviva a reloads sem depender da redetecção do front.
   * Retorna true se sucesso, false caso contrário (e seta syncError).
   */
  async function runLifecycleSync(pipelineId: string): Promise<boolean> {
    if (!user) return false;
    // Mutex em memória — impede execuções concorrentes (auto-retry vs manual vs efeito de mount).
    if (syncInFlightRef.current) {
      console.debug("runLifecycleSync skipped: another attempt in flight");
      return false;
    }
    syncInFlightRef.current = true;
    const persistFailure = async (msg: string) => {
      setSyncError(msg);
      try {
        await supabase.rpc("mark_onboarding_sync_pending" as any, {
          _patient_id: user.id,
          _error_message: msg,
        });
      } catch (e) {
        console.warn("Failed to persist sync_pending flag:", e);
      }
    };
    const persistSuccess = async () => {
      setSyncError(null);
      try {
        await supabase.rpc("clear_onboarding_sync_pending" as any, {
          _patient_id: user.id,
        });
      } catch (e) {
        console.warn("Failed to clear sync_pending flag:", e);
      }
    };
    try {
      const { data: completionData, error: completionError } = await supabase.rpc(
        "complete_patient_onboarding_by_patient" as any,
        { _patient_id: user.id, _pipeline_id: pipelineId },
      );
      if (completionError) {
        console.error("complete_patient_onboarding_by_patient error:", completionError);
        await persistFailure(completionError.message || "Falha ao sincronizar estado do onboarding.");
        return false;
      }
      if (completionData && (completionData as any).success === false) {
        const reason = (completionData as any).error || "Sincronização rejeitada pelo servidor.";
        console.warn("Onboarding completion warning:", reason);
        await persistFailure(reason);
        return false;
      }
      await persistSuccess();
      // Sucesso → reseta auto-retry e cancela timers pendentes
      setAutoRetryAttempt(0);
      setAutoRetryNextAt(null);
      setAutoRetryCountdown(0);
      setAutoRetryCancelled(false);
      clearAutoRetryTimers();
      // Invalidar caches após sucesso na sincronização para garantir fluidez no dashboard
      await queryClient.invalidateQueries({ queryKey: ["patient-lifecycle-state"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
      return true;
    } catch (err: any) {
      console.error("Lifecycle sync exception:", err);
      await persistFailure(err?.message || "Falha de rede ao sincronizar onboarding.");
      return false;
    } finally {
      syncInFlightRef.current = false;
    }
  }

  async function handleRetrySync() {
    if (!pipeline) return;
    // Reativa o ciclo de auto-retry caso o usuário tenha cancelado anteriormente.
    setAutoRetryCancelled(false);
    clearAutoRetryTimers();
    setSyncRetrying(true);
    const ok = await runLifecycleSync(pipeline.id);
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: ["patient-lifecycle-state"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
      await queryClient.invalidateQueries({ queryKey: ["nutritionist_patients"] });
      toast.success("Sincronização concluída! Seu plano está em revisão.");
      fetchPipeline();
    } else {
      // Incrementa attempt para que o effect de auto-retry agende a próxima janela
      setAutoRetryAttempt((n) => n + 1);
      toast.error("Ainda não foi possível sincronizar. Tentaremos novamente automaticamente.");
    }
    setSyncRetrying(false);
  }

  function handleCancelAutoRetry() {
    setAutoRetryCancelled(true);
    setAutoRetryNextAt(null);
    setAutoRetryCountdown(0);
    clearAutoRetryTimers();
    toast.info("Tentativas automáticas pausadas. Use o botão para tentar manualmente.");
  }

  // Auto-retry com backoff exponencial — só roda quando há sync_pending persistido,
  // o usuário não cancelou e nenhuma execução está em andamento.
  useEffect(() => {
    // Limpa qualquer timer existente antes de reagendar
    clearAutoRetryTimers();

    if (!pipeline || !syncError || !pipeline.plan_generated) return;
    if (autoRetryCancelled) return;
    if (autoRetryAttempt >= MAX_AUTO_RETRY_ATTEMPTS) return;
    if (syncRetrying || syncInFlightRef.current) return;

    // delay = base * 2^attempt, com teto
    const delay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, autoRetryAttempt),
      MAX_RETRY_DELAY_MS,
    );
    const targetAt = Date.now() + delay;
    setAutoRetryNextAt(targetAt);
    setAutoRetryCountdown(Math.ceil(delay / 1000));

    countdownTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((targetAt - Date.now()) / 1000));
      setAutoRetryCountdown(remaining);
      if (remaining <= 0 && countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }, 1000);

    autoRetryTimerRef.current = setTimeout(async () => {
      if (autoRetryCancelled || syncInFlightRef.current || !pipeline) return;
      const ok = await runLifecycleSync(pipeline.id);
      if (ok) {
        await queryClient.invalidateQueries({ queryKey: ["patient-lifecycle-state"] });
        await queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
        await queryClient.invalidateQueries({ queryKey: ["nutritionist_patients"] });
        toast.success("Sincronização concluída automaticamente!");
        fetchPipeline();
      } else {
        // Falha → incrementa attempt e o próprio effect agenda a próxima janela
        setAutoRetryAttempt((n) => n + 1);
      }
    }, delay);

    return () => clearAutoRetryTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncError, pipeline?.id, pipeline?.plan_generated, autoRetryAttempt, autoRetryCancelled, syncRetrying]);

  // Cleanup ao desmontar
  useEffect(() => () => clearAutoRetryTimers(), [clearAutoRetryTimers]);

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
        <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold">Nenhum onboarding ativo</h2>
          <p className="text-muted-foreground">
            Seu profissional ainda não ativou o fluxo automático de onboarding ou seu vínculo ainda está sendo processado.
          </p>
          <div className="flex flex-col gap-2 pt-4 max-w-xs mx-auto">
            <Button asChild variant="outline">
              <Link to="/status">Verificar status do meu cadastro</Link>
            </Button>
            <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
              <RefreshCw className="w-3 h-3 mr-2" /> Tentar novamente
            </Button>
          </div>
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
      <OnboardingExitGuard enabled={exitGuardEnabled} />
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

        {/* Sync Fallback Banner — RPC de finalização falhou mesmo com plano gerado */}
        {syncError && pipeline.plan_generated && (
          <Card className="border-warning/40 bg-warning/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-semibold text-warning">
                      Sincronização pendente
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Seu plano foi gerado com sucesso, mas a sincronização final com o painel
                      ainda não foi confirmada. Isso pode acontecer por instabilidade momentânea.
                      Seus dados estão salvos — basta tentar novamente.
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1 italic">
                      Detalhe técnico: {syncError}
                    </p>
                  </div>
                  {/* Status do auto-retry */}
                  {!autoRetryCancelled && autoRetryAttempt < MAX_AUTO_RETRY_ATTEMPTS && autoRetryCountdown > 0 && !syncRetrying && (
                    <p className="text-xs text-warning/90" data-testid="auto-retry-countdown">
                      Tentativa automática {autoRetryAttempt + 1} de {MAX_AUTO_RETRY_ATTEMPTS} em {autoRetryCountdown}s…
                    </p>
                  )}
                  {autoRetryCancelled && (
                    <p className="text-xs text-muted-foreground" data-testid="auto-retry-cancelled">
                      Tentativas automáticas pausadas.
                    </p>
                  )}
                  {autoRetryAttempt >= MAX_AUTO_RETRY_ATTEMPTS && !syncRetrying && (
                    <p className="text-xs text-destructive" data-testid="auto-retry-exhausted">
                      Limite de tentativas automáticas atingido. Tente manualmente ou contate o suporte.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetrySync}
                      disabled={syncRetrying}
                      className="border-warning/40 hover:bg-warning/10"
                    >
                      {syncRetrying ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Sincronizando…</>
                      ) : (
                        <>Tentar novamente agora</>
                      )}
                    </Button>
                    {!autoRetryCancelled && autoRetryCountdown > 0 && !syncRetrying && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelAutoRetry}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid="cancel-auto-retry"
                      >
                        Cancelar tentativas automáticas
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

            {/* Step 1: Anamnesis — auto-redirect (sem botão para evitar travas no iOS) */}
            {currentStep === 1 && (
              <AnamnesisAutoRedirect />
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

            {/* FALLBACK DE SEGURANÇA: Botão para forçar saída se estiver preso */}
            {(pipeline.anamnesis_completed || pipeline.plan_generated) && (
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[10px] text-slate-400 text-center max-w-xs uppercase tracking-wider font-medium">
                    Suporte Técnico
                  </p>
                  <p className="text-xs text-slate-500 text-center max-w-xs">
                    Se você já completou as etapas e continua vendo esta tela, clique no botão abaixo para forçar a sincronização.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full sm:w-auto gap-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300"
                    onClick={async () => {
                      const loadingToast = toast.loading("Sincronizando seu acesso...");
                      try {
                        console.log("[FJ:HardFix] Triggering manual state sync for patient:", user?.id);
                        
                        // 1. Tenta forçar a transição atômica via RPC
                        const { data: fixResult, error: fixError } = await supabase.rpc('run_patient_realtime_fix' as any, { _patient_id: user?.id });
                        if (fixError) throw fixError;
                        
                        console.log("[FJ:HardFix] RPC Result:", fixResult);

                        // 2. Garante que nutritionist_patients tenha status active se houver link
                        const { error: updateError } = await supabase
                          .from("nutritionist_patients")
                          .update({ journey_status: 'active' } as any)
                          .eq("patient_id", user?.id)
                          .eq("status", "active");
                        
                        if (updateError) console.warn("[FJ:HardFix] NP update error (might be ignored):", updateError);

                        // 3. Invalida caches para o Governance liberar o acesso
                        await queryClient.invalidateQueries({ queryKey: ["patient-journey-status"] });
                        
                        toast.success("Sincronização concluída! Redirecionando...", { id: loadingToast });
                        
                        // Pequeno delay para o state atualizar e o governance re-avaliar
                        setTimeout(() => navigate("/"), 1000);
                      } catch (err) {
                        console.error("Force sync error:", err);
                        toast.error("Erro na sincronização. Tente novamente.", { id: loadingToast });
                      }
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span className="text-xs font-semibold">Forçar Acesso ao Dashboard</span>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

/**
 * AnamnesisAutoRedirect — neutralizado.
 * Redirects automáticos foram removidos. SystemStateGuard observa
 * patient_state e move o paciente para a próxima etapa quando o estado muda.
 * Mantemos apenas um link manual como fallback para o usuário.
 */
function AnamnesisAutoRedirect() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Etapa 2: Anamnese
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          Aguardando liberação da anamnese...
        </p>
        <p className="text-xs text-muted-foreground">
          Se a página não avançar em alguns segundos, toque no botão abaixo:
        </p>
        <Button asChild variant="outline" className="w-full">
          <a href="/anamnesis?pipeline=true">
            Abrir Anamnese <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

