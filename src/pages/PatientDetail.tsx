import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExperienceUI } from "@/hooks/useExperienceUI";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { supabase } from "@/integrations/supabase/client";
import { createMealPlanDraft } from "@/lib/createMealPlanDraft";
import { createPlanRevision } from "@/lib/createPlanRevision";
import { acquireActionLock, releaseActionLock } from "@/lib/fitjourneyBible";
import { updatePatientJourneyInCache, invalidateLifecycleQueries } from "@/lib/lifecycleCache";
import { useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import MetabolicRadar from "@/components/dashboard/MetabolicRadar";
import { AnamnesisInsightsFull } from "@/components/patient/AnamnesisInsightsCard";
import PatientCalculators from "@/components/patient/PatientCalculators";
import PatientAgenda from "@/components/patient/PatientAgenda";
import BodyEvolutionCard from "@/components/patient/BodyEvolutionCard";
import HealthScoreRing, { calculateHealthScore } from "@/components/dashboard/HealthScoreRing";
import ConsultationCompare from "@/components/patient/ConsultationCompare";
import PatientCheckinsTab from "@/components/patient/PatientCheckinsTab";
import PatientChecklistView from "@/components/patient/PatientChecklistView";
import SmartAlertsBanner from "@/components/patient/SmartAlertsBanner";
import PlanScheduler from "@/components/plans/PlanScheduler";
import PatientFeedbackSummary from "@/components/patient/PatientFeedbackSummary";
import DocumentUpload from "@/components/common/DocumentUpload";
import ClinicalDecisionSupport from "@/components/patient/ClinicalDecisionSupport";
import OnboardingApprovalQueue from "@/components/patient/OnboardingApprovalQueue";
import UnblockPatientDialog from "@/components/patient/UnblockPatientDialog";
import {
  ArrowLeft, User, Calendar, FileText, ListChecks, Play,
  Clock, Activity, Plus, MessageSquare, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Heart, Brain, BookOpen, Scale, Calculator, CalendarDays, CreditCard, Send, UtensilsCrossed, X, Maximize2, ChefHat, Upload, Power, Trash2, Stethoscope, Crown, UserCog, Pencil, Sparkles, Rocket, Shield, Loader2, Search, ShieldAlert, Timer, History, PencilLine, Ruler, Target
} from "lucide-react";
import { Link2, Copy, RefreshCw } from "lucide-react";
import { WhatsAppNotifyButton } from "@/components/common/WhatsAppNotifyButton";
import { sendWhatsAppNotification } from "@/utils/whatsappNotification";
import BodyProjectionProCard from "@/components/patient/BodyProjectionProCard";
import ActiveProtocolBadge from "@/components/patient/ActiveProtocolBadge";
import PatientProjectGovernance from "@/components/patient/PatientProjectGovernance";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import PrestigeName from "@/components/prestige/PrestigeName";
import type { PrestigePlan } from "@/hooks/usePrestige";
import { usePatientDetail, useTogglePatientDetailStatus, useDeletePatientLink } from "@/hooks/queries/usePatientDetail";
import { queryKeys } from "@/hooks/queries/queryKeys";
// Gamification removed from MVP

// V2 Editor removed as per NutriCore V3 unifications
import MealAdherenceWidget from "@/components/patient/MealAdherenceWidget";
import OnboardingReleaseDialog from "@/components/patient/OnboardingReleaseDialog";
import ClinicalFlagsSummary from "@/components/patient/ClinicalFlagsSummary";
import PatientBehavioralManager from "@/components/patient/PatientBehavioralManager";
import PatientEvolutionPDF from "@/components/patient/PatientEvolutionPDF";
import FitIntelligenceToggle from "@/components/intelligence/FitIntelligenceToggle";
import PatientLabExams from "@/components/patient/PatientLabExams";
import PatientFeedbacksPanel from "@/components/patient/PatientFeedbacksPanel";
import { deactivateMealPlan } from "@/lib/serverTransitions";
import { finalizeGeneratedMealPlan } from "@/lib/finalizeGeneratedMealPlan";
import { resolveLatestOnboardingPipeline, resolvePatientIdentity } from "@/lib/onboardingPlanResolver";
import { DeterministicAuditLog } from "@/components/patient/DeterministicAuditLog";


export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const expUI = useExperienceUI();

  // React Query hook
  const { data, isLoading, refetch } = usePatientDetail(patientId);
  const toggleStatusMutation = useTogglePatientDetailStatus();
  const deletePatientMutation = useDeletePatientLink();

  // Derived data from query
  const profile = data?.profile ?? null;
  const resolvedPatientId = data?.resolvedPatientId ?? patientId!;
  const timeline = data?.timeline ?? [];
  const anamnesis = data?.anamnesis ?? null;
  const patientProtocols = data?.patientProtocols ?? [];
  const protocols = data?.protocols ?? [];
  const checklistStats = data?.checklistStats ?? { total: 0, completed: 0 };
  const patientSubscription = data?.patientSubscription ?? null;
  const pricingPlans = data?.pricingPlans ?? [];
  const mealPlans = data?.mealPlans ?? [];
  const recipes = data?.recipes ?? [];
  const mealPlanDocs = data?.mealPlanDocs ?? [];
  const assessmentDocs = data?.assessmentDocs ?? [];
  const patientStatus = data?.patientStatus ?? "active";
  const journeyStatus = data?.journeyStatus ?? "active";
  const npId = data?.npId ?? null;
  const prestigePlans = data?.prestigePlans ?? [];
  const currentPrestigePlan = data?.currentPrestigePlan ?? null;
  const patientEmail = data?.patientEmail ?? "";
  const activeMealPlan = useMemo(
    () => mealPlans.find((plan: any) => plan.is_active) ?? null,
    [mealPlans]
  );

  // Local UI state
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateForm, setActivateForm] = useState({
    protocol_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "active" as "active" | "paused" | "completed" | "cancelled",
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", event_type: "note" });
  const [planOpen, setPlanOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [selectedPrestigePlanId, setSelectedPrestigePlanId] = useState<string>(data?.currentPrestigePlanId ?? "");
  const [planForm, setPlanForm] = useState({
    plan_name: patientSubscription?.plan_name || "",
    started_at: patientSubscription?.started_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    expires_at: patientSubscription?.expires_at?.split("T")[0] || "",
    value: "",
  });
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    days: "3",
    message: "Como você está se sentindo com o plano alimentar? Gostaria de compartilhar seu progresso?",
  });
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeRole, setUpgradeRole] = useState<string>("");
  const [upgrading, setUpgrading] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    goal: "",
    notes: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [releaseOnboardingOpen, setReleaseOnboardingOpen] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [markingWithoutDiet, setMarkingWithoutDiet] = useState(false);

  // Sync selectedPrestigePlanId when data loads asynchronously
  useEffect(() => {
    if (data?.currentPrestigePlanId) {
      setSelectedPrestigePlanId(data.currentPrestigePlanId);
    }
  }, [data?.currentPrestigePlanId]);

  // Invalidation helper — centralized
  const invalidate = () => {
    invalidateLifecycleQueries(queryClient, patientId ?? undefined);
  };

  const handleMarkWithoutDiet = async () => {
    if (!user || !activeMealPlan) return;

    setMarkingWithoutDiet(true);

    try {
      const result = await deactivateMealPlan(activeMealPlan.id, user.id);

      if (!result.success) {
        throw new Error(result.error || "Erro ao remover plano ativo");
      }

      toast.success("Paciente marcado como sem dieta.");
      invalidate();
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao deixar paciente sem dieta");
    } finally {
      setMarkingWithoutDiet(false);
    }
  };

  // Confirm payment + auto-release onboarding
  const handleConfirmPayment = async () => {
    if (!user || !patientId) return;
    if (!acquireActionLock("confirm_payment", patientId)) {
      toast.info("Ação já em andamento...");
      return;
    }
    setConfirmingPayment(true);
    // ⚡ Optimistic UI
    if (patientId) updatePatientJourneyInCache(queryClient, patientId, "onboarding_active");
    try {
      const { data, error } = await supabase.rpc("confirm_patient_payment", {
        _patient_id: patientId,
        _nutritionist_id: user.id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) {
        // Rollback optimistic update
        updatePatientJourneyInCache(queryClient, patientId, "awaiting_payment");
        toast.error(result?.error || "Erro ao confirmar pagamento");
        releaseActionLock("confirm_payment", patientId);
        setConfirmingPayment(false);
        return;
      }
      toast.success("✅ Pagamento confirmado! Onboarding liberado automaticamente.");
      invalidate();
    } catch (err: any) {
      // Rollback optimistic update
      updatePatientJourneyInCache(queryClient, patientId, "awaiting_payment");
      toast.error(err.message || "Erro ao confirmar pagamento");
      releaseActionLock("confirm_payment", patientId);
    }
    setConfirmingPayment(false);
  };

  // Smart onboarding release — idempotent
  const handleSmartReleaseOnboarding = async () => {
    if (!user || !patientId) return;
    const alreadyPastOnboarding = ["onboarding_active", "onboarding_completed", "draft_ready_for_review", "plan_published", "active_followup"].includes(journeyStatus);
    if (alreadyPastOnboarding) {
      toast.info("Onboarding já foi liberado ou concluído para este paciente");
      return;
    }
    // Open the dialog for proper release flow
    setReleaseOnboardingOpen(true);
  };

  const invokeAdminIdentityAction = useCallback(async (action: string, payload: Record<string, unknown>) => {
    if (!patientId) throw new Error("Paciente inválido");

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("admin-update-user", {
      body: {
        target_user_id: patientId,
        action,
        payload,
      },
      headers: session?.access_token ? {
        Authorization: `Bearer ${session.access_token}`,
      } : undefined,
    });

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || "Erro na ação administrativa");
    }

    return data;
  }, [patientId]);

  const invokeAdminPasswordReset = useCallback(async (password: string) => {
    if (!patientId) throw new Error("Paciente inválido");

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: {
        user_id: patientId,
        new_password: password,
      },
      headers: session?.access_token ? {
        Authorization: `Bearer ${session.access_token}`,
      } : undefined,
    });

    if (error || !data?.success) {
      throw new Error(error?.message || data?.error || "Erro ao redefinir senha");
    }

    return data;
  }, [patientId]);

  const handleUpgradePatient = async () => {
    if (!patientId || !upgradeRole) return;
    setUpgrading(true);
    try {
      const { data, error } = await supabase.rpc("promote_patient_to_professional", {
        _patient_email: patientEmail,
        _target_role: upgradeRole,
      });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success(`Paciente promovido a ${upgradeRole === "nutritionist" ? "Nutricionista" : "Personal Trainer"} com sucesso!`);
        setUpgradeOpen(false);
        setUpgradeRole("");
      } else {
        toast.error(result?.error === "already_has_role" ? "Paciente já possui essa role" : result?.error || "Erro ao promover");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao promover paciente");
    }
    setUpgrading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSavingProfile(true);
    try {
      // Build update payload, only include fields that have values to prevent null overwrites
      const updatePayload: Record<string, any> = {};
      if (editProfileForm.full_name.trim()) updatePayload.full_name = editProfileForm.full_name.trim();
      if (editProfileForm.phone.trim()) updatePayload.phone = editProfileForm.phone.trim();
      else if (editProfileForm.phone === "") {
        // Only set null if user explicitly cleared the field (not if it was never loaded)
        const currentPhone = profile?.phone;
        if (currentPhone) updatePayload.phone = null; // User intentionally cleared
      }
      if (editProfileForm.goal.trim()) updatePayload.goal = editProfileForm.goal.trim();
      if (editProfileForm.notes.trim()) updatePayload.notes = editProfileForm.notes.trim();
      
      if (Object.keys(updatePayload).length === 0) {
        toast.info("Nenhum dado alterado");
        setSavingProfile(false);
        return;
      }
      
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload as any)
        .eq("user_id", patientId);
      if (error) throw error;
      toast.success("Cadastro atualizado com sucesso!");
      setOpenSection(null);
      invalidate();
      
      // Prompt for WhatsApp notification
      import("@/utils/whatsappNotification").then(({ promptWhatsAppNotification }) => {
        promptWhatsAppNotification({
          patientId: patientId!,
          patientName: profile?.full_name || "Paciente",
          professionalName: (window as any).PROFESSIONAL_NAME || "Seu Nutricionista",
          type: "registration_updated",
          appUrl: `${window.location.origin}/auth`
        });
      });

    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar cadastro");
    }
    setSavingProfile(false);
  };

  const activateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    // Get protocol_key for the selected protocol
    const selectedProto = protocols.find(p => p.id === activateForm.protocol_id);
    const { data, error } = await supabase.from("patient_protocols").insert({
      patient_id: patientId,
      protocol_id: activateForm.protocol_id,
      protocol_key: (selectedProto as any)?.protocol_key || null,
      nutritionist_id: user.id,
      status: activateForm.status,
      start_date: activateForm.start_date,
      end_date: activateForm.end_date || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (activateForm.status === "active" && data) {
      await supabase.rpc("sync_protocol_checklist", { _patient_protocol_id: data.id });
    }
    await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: "protocol",
      title: `Protocolo ${activateForm.status === "active" ? "ativado" : "programado"}`,
      description: protocols.find(p => p.id === activateForm.protocol_id)?.title,
      created_by: user.id,
    });
    toast.success(activateForm.status === "active" ? "Protocolo ativado! Checklist sincronizado." : "Protocolo programado!");
    setActivateOpen(false);
    invalidate();

    if (activateForm.status === "active") {
      import("@/utils/whatsappNotification").then(({ promptWhatsAppNotification }) => {
        promptWhatsAppNotification({
          patientId: patientId!,
          patientName: profile?.full_name || "Paciente",
          professionalName: (window as any).PROFESSIONAL_NAME || "Seu Nutricionista",
          type: "protocol_activated",
          appUrl: `${window.location.origin}/auth`
        });
      });
    } else {
      toast.success("Protocolo programado!");
    }

  };

  const addTimelineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    const { error } = await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: noteForm.event_type,
      title: noteForm.title,
      description: noteForm.description || null,
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Nota adicionada!");
      setNoteOpen(false);
      setNoteForm({ title: "", description: "", event_type: "note" });
      invalidate();
    }
  };

  const syncChecklist = async (ppId: string) => {
    const { data } = await supabase.rpc("sync_protocol_checklist", { _patient_protocol_id: ppId });
    toast.success(`${data || 0} tarefas sincronizadas para hoje!`);
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    const paymentValue = parseFloat(planForm.value) || 0;
    const patientName = profile?.full_name || "Paciente";

    if (patientSubscription) {
      const { error } = await supabase.from("subscriptions").update({
        plan_name: planForm.plan_name,
        started_at: planForm.started_at,
        expires_at: planForm.expires_at || null,
      }).eq("id", patientSubscription.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Plano atualizado!");
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        user_id: patientId,
        plan_name: planForm.plan_name,
        started_at: planForm.started_at,
        expires_at: planForm.expires_at || null,
        status: "active",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Plano atribuído!");
    }

    // Registrar transação financeira automaticamente quando valor > 0
    if (paymentValue > 0) {
      const { error: finError } = await supabase.from("financial_transactions").insert({
        nutritionist_id: user.id,
        type: "income",
        description: `Plano ${planForm.plan_name} - ${patientName}`,
        amount: paymentValue,
        date: planForm.started_at || new Date().toISOString().split("T")[0],
        status: "paid",
        category: "paciente",
      });
      if (finError) {
        console.error("Erro ao registrar transação financeira:", finError);
      } else {
        toast.success(`R$ ${paymentValue.toFixed(2)} registrado no financeiro!`, { icon: "💰" });
      }
    }

    // Apply prestige if selected
    const effectivePrestigeId = selectedPrestigePlanId || currentPrestigePlan?.id || "";
    if (effectivePrestigeId && effectivePrestigeId !== "none") {
      await supabase.from("patient_prestige").update({ is_active: false } as any).eq("patient_id", patientId).eq("is_active", true);
      const { error: prestigeErr } = await supabase.from("patient_prestige").insert({
        patient_id: patientId,
        plan_id: effectivePrestigeId,
        assigned_by: user.id,
        is_active: true,
      });
      if (!prestigeErr) {
        const selectedPlan = prestigePlans.find(p => p.id === effectivePrestigeId);
        toast.success(`Prestígio ${selectedPlan?.name || ''} aplicado! ${selectedPlan?.badge_icon || ''}`, { duration: 3000 });
      }
    } else if (selectedPrestigePlanId === "none") {
      // Remove prestige ONLY if user explicitly selected "none"
      if (currentPrestigePlan) {
        await supabase.from("patient_prestige").update({ is_active: false } as any).eq("patient_id", patientId).eq("is_active", true);
        toast.success("Prestígio removido");
      }
    }
    setPlanOpen(false);
    invalidate();
  };

  const scheduleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + parseInt(feedbackForm.days));
    const { error } = await supabase.from("notifications").insert({
      user_id: patientId,
      title: "📋 Feedback solicitado",
      message: feedbackForm.message,
      type: "feedback",
      action_url: "/feedbacks",
      metadata: { scheduled_by: user.id, scheduled_for: scheduledDate.toISOString() },
    } as any);
    if (error) { toast.error(error.message); return; }
    await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: "note",
      title: `Feedback agendado para ${scheduledDate.toLocaleDateString("pt-BR")}`,
      description: feedbackForm.message,
      created_by: user.id,
    });
    toast.success(`Feedback agendado para daqui ${feedbackForm.days} dias!`);
    setFeedbackOpen(false);
    invalidate();
  };

  const togglePatientStatus = () => {
    if (!npId) return;
    toggleStatusMutation.mutate({ npId, currentStatus: patientStatus }, {
      onSuccess: () => invalidate(),
    });
  };

  const deletePatient = () => {
    if (!npId) return;
    deletePatientMutation.mutate(npId, {
      onSuccess: () => navigate("/patients"),
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded" />
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const eventTypeConfig: Record<string, { icon: any; color: string }> = {
    protocol: { icon: FileText, color: "text-primary" },
    note: { icon: MessageSquare, color: "text-info" },
    alert: { icon: AlertTriangle, color: "text-warning" },
    achievement: { icon: CheckCircle2, color: "text-success" },
    measurement: { icon: TrendingUp, color: "text-accent" },
  };

  const riskFactors: { label: string; level: "low" | "medium" | "high" }[] = [];
  if (anamnesis?.answers) {
    const a = anamnesis.answers as any;
    if (a.health_conditions?.includes("diabetes")) riskFactors.push({ label: "Diabetes", level: "high" });
    if (a.health_conditions?.includes("hypertension")) riskFactors.push({ label: "Hipertensão", level: "high" });
    if (a.health_conditions?.includes("high_cholesterol")) riskFactors.push({ label: "Colesterol alto", level: "medium" });
    if (a.activity_level === "sedentary") riskFactors.push({ label: "Sedentarismo", level: "medium" });
    if (a.water_intake && a.water_intake < 6) riskFactors.push({ label: "Baixa hidratação", level: "medium" });
    if (a.feeling === "terrible" || a.feeling === "bad") riskFactors.push({ label: "Insatisfação alimentar", level: "medium" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Smart Alerts */}
        <SmartAlertsBanner patientId={resolvedPatientId} onAction={(action) => setOpenSection(action)} />
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {(() => {
            const displayName =
              (profile?.full_name && profile.full_name.trim()) ||
              (patientEmail && patientEmail.split("@")[0]) ||
              "Paciente sem nome";
            const initial = displayName[0]?.toUpperCase() || "P";
            return (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentPrestigePlan ? (
                      <PrestigeName name={displayName} plan={currentPrestigePlan} className="font-display text-2xl font-bold" />
                    ) : (
                      <h1 className="font-display text-2xl font-bold truncate" title={displayName}>{displayName}</h1>
                    )}
                    <Badge variant={patientStatus === "active" ? "default" : "secondary"}>
                      {patientStatus === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                    {currentPrestigePlan && <PrestigeBadge plan={currentPrestigePlan} allPlans={prestigePlans} size="sm" />}
                    {patientId && <ActiveProtocolBadge patientId={resolvedPatientId} compact />}
                    {(data as any)?.requiresMedicalReview && (
                      <Badge variant="destructive" className="gap-1 animate-pulse">
                        <ShieldAlert className="w-3 h-3" /> Revisão Médica Requerida
                      </Badge>
                    )}
                  </div>
                  {patientEmail && (
                    <p className="text-xs text-muted-foreground/80 truncate" title={patientEmail}>
                      {patientEmail}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Checklist hoje: {checklistStats.completed}/{checklistStats.total} tarefas •
                    {patientProtocols.filter(p => p.status === "active").length} protocolos ativos
                  </p>
                </div>
              </>
            );
          })()}
          <HealthScoreRing
            score={calculateHealthScore({
              hasAnamnesis: anamnesis?.status === "completed",
              checklistCompletion: checklistStats.total > 0 ? Math.round((checklistStats.completed / checklistStats.total) * 100) : 0,
              mealsLogged: 0,
              weightEntries: 0,
              currentStreak: 0,
              daysAsPatient: 30,
            })}
            label="Health Score"
            size="md"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              disabled={!resolvedPatientId}
              onClick={() => {
                if (!resolvedPatientId) return;
                navigate(`/in-office/${resolvedPatientId}`);
              }}
            >
              🏥 Modo Consultório
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              disabled={!resolvedPatientId}
              onClick={() => {
                if (!resolvedPatientId) return;
                navigate(`/editor-v3/${resolvedPatientId}`);
              }}
            >
              <Sparkles className="w-4 h-4" /> NutriCore V3 (Editor Premium)
            </Button>
            {patientId && (
              <UnblockPatientDialog
                patientId={resolvedPatientId}
                patientName={profile?.full_name ?? undefined}
              />
            )}
            {patientId && <PatientEvolutionPDF patientId={resolvedPatientId} patientName={profile?.full_name || "Paciente"} />}
            <Button
              variant={patientStatus === "active" ? "outline" : "default"}
              className="gap-2"
              onClick={togglePatientStatus}
              disabled={toggleStatusMutation.isPending}
            >
              <Power className="w-4 h-4" />
              {patientStatus === "active" ? "Desativar" : "Ativar"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover o vínculo com este paciente. Os dados do paciente não serão apagados, mas ele deixará de aparecer na sua lista.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isAdmin && (
              <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                    <UserCog className="w-4 h-4" /> Upgrade para Profissional
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Promover Paciente a Profissional</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Escolha o tipo de profissional para <strong>{profile?.full_name}</strong>:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => setUpgradeRole("nutritionist")}
                      className={`p-4 rounded-xl border-2 text-center space-y-2 transition-all ${
                        upgradeRole === "nutritionist" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <UtensilsCrossed className="w-8 h-8 mx-auto text-primary" />
                      <p className="font-semibold text-sm">Nutricionista</p>
                    </button>
                    <button
                      onClick={() => setUpgradeRole("personal")}
                      className={`p-4 rounded-xl border-2 text-center space-y-2 transition-all ${
                        upgradeRole === "personal" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Activity className="w-8 h-8 mx-auto text-primary" />
                      <p className="font-semibold text-sm">Personal Trainer</p>
                    </button>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={() => setUpgradeOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpgradePatient}
                      disabled={!upgradeRole || upgrading}
                      className="flex-1 gap-2"
                    >
                      {upgrading ? "Promovendo..." : "Confirmar Promoção"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)}>
              <Activity className="w-4 h-4" /> Avaliação Física
            </Button>
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setOpenSection("audit-log")}>
              <Shield className="w-4 h-4" /> Auditoria Motor
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/diet-templates?patientId=${patientId}`)}>

              <BookOpen className="w-4 h-4" /> Modelos de Dieta
            </Button>
            {activeMealPlan && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={markingWithoutDiet}
                  >
                    {markingWithoutDiet ? <Loader2 className="w-4 h-4 animate-spin" /> : <UtensilsCrossed className="w-4 h-4" />}
                    Estou sem dieta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deixar este paciente sem dieta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O plano ativo {activeMealPlan.title ? `“${activeMealPlan.title}”` : "deste paciente"} será removido da rotina ativa e, se já tiver sido publicado, ficará arquivado para preservar o histórico.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleMarkWithoutDiet}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/anamnesis?patientId=${patientId}`)}>
              <Heart className="w-4 h-4" /> {anamnesis ? "Editar Anamnese" : "Preencher Anamnese"}
            </Button>
            {/* Confirmar Pagamento — only if not yet paid */}
            {["invited", "awaiting_payment", "lead_created", "active"].includes(journeyStatus) && (
              <Button
                variant="outline"
                className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                onClick={handleConfirmPayment}
                disabled={confirmingPayment}
              >
                {confirmingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Confirmar Pagamento
              </Button>
            )}
            {/* Liberar Onboarding — smart/idempotent */}
            <Button variant="outline" className="gap-2 border-warning/30 text-warning hover:bg-warning/10" onClick={handleSmartReleaseOnboarding}>
              <Rocket className="w-4 h-4" /> Liberar Onboarding
            </Button>
            {/* PRO+: Ativar Protocolo */}
            {expUI.showProtocols && (
            <>
            {isAdmin && (
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => navigate("/admin/professionals")}>
                <UserCog className="w-4 h-4" /> Gerenciar Profissionais
              </Button>
            )}
            <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2 shadow-glow">
                  <Play className="w-4 h-4" /> Ativar Protocolo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Ativar Protocolo</DialogTitle>
                </DialogHeader>
                <form onSubmit={activateProtocol} className="space-y-4">
                  <div>
                    <Label>Protocolo</Label>
                    <Select value={activateForm.protocol_id} onValueChange={(v) => setActivateForm({ ...activateForm, protocol_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {protocols.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={activateForm.status} onValueChange={(v) => setActivateForm({ ...activateForm, status: v as "active" | "paused" | "completed" | "cancelled" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">🟢 Ativo agora</SelectItem>
                        <SelectItem value="scheduled">📅 Programado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Início</Label>
                      <Input type="date" value={activateForm.start_date} onChange={(e) => setActivateForm({ ...activateForm, start_date: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Fim (opcional)</Label>
                      <Input type="date" value={activateForm.end_date} onChange={(e) => setActivateForm({ ...activateForm, end_date: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={!activateForm.protocol_id}>
                    {activateForm.status === "active" ? "Ativar e Sincronizar" : "Programar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </>
            )}
          </div>
        </div>

        {/* Unified Biometric Context (Fonte Única da Verdade) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center border-primary/20 shadow-glow-sm">
            <Scale className="w-5 h-5 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Peso Atual</span>
            <span className="text-xl font-display font-bold">{(profile as any)?.current_weight_kg || (anamnesis?.answers as any)?.weight || "—"} <span className="text-xs font-normal">kg</span></span>
          </div>
          <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center border-primary/20 shadow-glow-sm">
            <Ruler className="w-5 h-5 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Altura</span>
            <span className="text-xl font-display font-bold">{(profile as any)?.current_height_cm || (anamnesis?.answers as any)?.height || "—"} <span className="text-xs font-normal">cm</span></span>
          </div>
          <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center border-primary/20 shadow-glow-sm">
            <Target className="w-5 h-5 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Objetivo</span>
            <span className="text-sm font-display font-bold">{(profile as any)?.goal || (anamnesis?.answers as any)?.goal || "Não definido"}</span>
          </div>
          <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center border-primary/20 shadow-glow-sm">
            <Activity className="w-5 h-5 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Atividade</span>
            <span className="text-sm font-display font-bold">{(profile as any)?.activity_level || (anamnesis?.answers as any)?.activity_level || "Não definido"}</span>
          </div>
          <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center border-primary/20 shadow-glow-sm md:col-span-2 lg:col-span-2">
            <Heart className="w-5 h-5 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Restrições / Alergias</span>
            <span className="text-xs font-medium truncate w-full">
              {Array.isArray((profile as any)?.restrictions) && (profile as any).restrictions.length > 0 
                ? (profile as any).restrictions.join(", ") 
                : "Nenhuma registrada"}
            </span>
          </div>
        </div>

        {/* Últimos Planos Section */}
        {mealPlans && mealPlans.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 px-1">
              <History className="w-4 h-4" /> Últimos Planos Alimentares
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mealPlans.slice(0, 2).map((plan: any) => (
                <div 
                  key={plan.id}
                  className="glass flex items-center justify-between p-4 rounded-xl border border-border/40 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <UtensilsCrossed className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {plan.title || `Plano #${plan.id.slice(0, 4)}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Criado em {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 gap-2 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      const version = plan.editor_version || "v2";
                      if (version === "v3" && resolvedPatientId) {
                        navigate(`/meal-plans/editor/v3?patientId=${resolvedPatientId}&planId=${plan.id}`);
                      } else {
                        navigate(`/meal-plans/${plan.id}`);
                      }
                    }}
                  >
                    Abrir no Editor {((profile as any)?.last_editor_version_used || "v2").toUpperCase()}
                    <Rocket className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Cards Grid */}
        {(() => {
          const allSections = [
            // BASIC: essentials
            { key: "checklist", label: "Checklist", icon: ListChecks, color: "from-warning/20 to-warning/5", iconColor: "text-warning", minMode: "basic" as const },
            { key: "meal-plans", label: "Planos Alimentares", icon: UtensilsCrossed, color: "from-success/20 to-success/5", iconColor: "text-success", minMode: "basic" as const },
            { key: "assessment", label: "Avaliação Física", icon: Activity, color: "from-accent/20 to-accent/5", iconColor: "text-accent", minMode: "basic" as const },
            { key: "agenda", label: "Agenda", icon: CalendarDays, color: "from-info/20 to-info/5", iconColor: "text-info", minMode: "basic" as const },
            { key: "recipes", label: "Receitas", icon: ChefHat, color: "from-primary/20 to-accent/5", iconColor: "text-primary", minMode: "basic" as const },
            { key: "edit-profile", label: "Editar Cadastro", icon: Pencil, color: "from-info/20 to-info/5", iconColor: "text-info", minMode: "basic" as const },
            { key: "plan", label: "Plano", icon: CreditCard, color: "from-primary/20 to-primary/5", iconColor: "text-primary", minMode: "basic" as const },
            { key: "onboarding", label: "Onboarding", icon: Zap, color: "from-warning/20 to-warning/5", iconColor: "text-warning", minMode: "basic" as const },
            // PRO: clinical intelligence
            { key: "overview", label: "Visão Geral", icon: AlertTriangle, color: "from-warning/20 to-warning/5", iconColor: "text-warning", minMode: "pro" as const },
            { key: "ai-insights", label: "IFJ Insights", icon: Brain, color: "from-primary/20 to-primary/5", iconColor: "text-primary", minMode: "pro" as const },
            { key: "timeline", label: "Timeline", icon: Clock, color: "from-muted-foreground/20 to-muted-foreground/5", iconColor: "text-muted-foreground", minMode: "pro" as const },
            { key: "protocols", label: "Protocolos", icon: FileText, color: "from-accent/20 to-accent/5", iconColor: "text-accent", minMode: "pro" as const },
            { key: "calculators", label: "Calculadoras", icon: Calculator, color: "from-success/20 to-success/5", iconColor: "text-success", minMode: "pro" as const },
            { key: "feedbacks", label: "Feedbacks", icon: MessageSquare, color: "from-amber-500/20 to-orange-500/5", iconColor: "text-amber-500", minMode: "pro" as const },
            { key: "lab-exams", label: "Exames Lab.", icon: Search, color: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500", minMode: "pro" as const },
            // ADVANCED: full IFJ engine
            { key: "radar", label: "Radar Metabólico", icon: TrendingUp, color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive", minMode: "advanced" as const },
            { key: "clinical-decision", label: "Decisão Clínica", icon: Stethoscope, color: "from-destructive/20 to-primary/5", iconColor: "text-destructive", minMode: "advanced" as const },
            { key: "body-projection", label: "Projeção Corporal", icon: Sparkles, color: "from-purple-500/20 to-violet-500/5", iconColor: "text-purple-500", minMode: "advanced" as const },
            { key: "clinical-flags", label: "Flags Clínicas", icon: Shield, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500", minMode: "advanced" as const },
            { key: "projects", label: "Projetos", icon: Rocket, color: "from-pink-500/20 to-pink-500/5", iconColor: "text-pink-500", minMode: "advanced" as const },
          ];

          const sections = allSections.filter(s => expUI.minMode(s.minMode));

          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sections.map((s) => {
                  const Icon = s.icon;
                  const pendingPlansCount = s.key === "meal-plans" ? mealPlans.filter((p: any) => ["draft_auto_generated", "under_professional_review"].includes(p.plan_status)).length : 0;
                  return (
                    <motion.button
                      key={s.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (s.key === "edit-profile") {
                          setEditProfileForm({
                            full_name: profile?.full_name || "",
                            phone: profile?.phone || "",
                            email: patientEmail || "",
                            goal: (profile as any)?.goal || "",
                            notes: (profile as any)?.notes || "",
                          });
                        }
                        if (s.key === "meal-plans") {
                          setOpenSection("meal-plans");
                          return;
                        }
                        setOpenSection(s.key);
                      }}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-gradient-to-br ${s.color} hover:shadow-md transition-all group cursor-pointer text-center`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                      <Maximize2 className="absolute top-2 right-2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      {pendingPlansCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {pendingPlansCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Overview Modal — Full Clinical Summary */}
              <Dialog open={openSection === "overview"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Visão Geral Clínica</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan & Payment Info */}
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-primary" /> Plano & Financeiro
                      </h3>
                      {patientSubscription ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-medium">{patientSubscription.plan_name}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                            <Badge className={patientSubscription.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}>
                              {patientSubscription.status === "active" ? "Ativo" : patientSubscription.status}
                            </Badge>
                          </div>
                          {patientSubscription.started_at && <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span className="font-medium">{new Date(patientSubscription.started_at).toLocaleDateString("pt-BR")}</span></div>}
                          {patientSubscription.expires_at && <div className="flex justify-between"><span className="text-muted-foreground">Expiração</span><span className="font-medium">{new Date(patientSubscription.expires_at).toLocaleDateString("pt-BR")}</span></div>}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum plano atribuído</p>
                      )}
                    </div>

                    {/* Active Protocols */}
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-accent" /> Protocolos Ativos
                      </h3>
                      {patientProtocols.filter(p => p.status === "active").length > 0 ? (
                        <div className="space-y-2">
                          {patientProtocols.filter(p => p.status === "active").map((pp: any) => (
                            <div key={pp.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-sm">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="font-medium">{pp.protocol_title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum protocolo ativo</p>
                      )}
                    </div>

                    {/* Prestige & Project */}
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <Crown className="w-5 h-5 text-amber-500" /> Prestígio & Projetos
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Prestígio</span>
                          <span className="font-medium">{currentPrestigePlan ? `${currentPrestigePlan.badge_icon || "⭐"} ${currentPrestigePlan.name}` : "Nenhum"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Onboarding & Meal Plan Status */}
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5 text-warning" /> Status do Paciente
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Anamnese</span>
                          <Badge variant={anamnesis?.status === "completed" ? "default" : "secondary"}>
                            {anamnesis?.status === "completed" ? "✅ Completa" : "Pendente"}
                          </Badge>
                        </div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Plano Alimentar</span>
                          <Badge variant={mealPlans.some((p: any) => p.is_active) ? "default" : "secondary"}>
                            {mealPlans.some((p: any) => p.is_active) ? "✅ Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Checklist</span>
                          <span className="font-medium">{checklistStats.completed}/{checklistStats.total} hoje</span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Diagnosis */}
                    <div className="glass rounded-xl p-5 md:col-span-2">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-warning" /> Diagnóstico Inteligente
                      </h3>
                      {riskFactors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem fatores de risco identificados. ✅</p>
                      ) : (
                        <div className="space-y-2">
                          {riskFactors.map((rf, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                              <div className={`w-3 h-3 rounded-full ${rf.level === "high" ? "bg-destructive" : rf.level === "medium" ? "bg-warning" : "bg-success"}`} />
                              <span className="text-sm font-medium">{rf.label}</span>
                              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${rf.level === "high" ? "bg-destructive/10 text-destructive" : rf.level === "medium" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
                                {rf.level === "high" ? "Alto" : rf.level === "medium" ? "Médio" : "Baixo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clinical Flags */}
                    <div className="glass rounded-xl p-5">
                      <ClinicalFlagsSummary patientId={resolvedPatientId} compact />
                    </div>

                    {/* Meal Adherence */}
                    <div className="md:col-span-2">
                      <MealAdherenceWidget patientId={resolvedPatientId} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* AI Insights Modal */}
              <Dialog open={openSection === "ai-insights"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">IA Insights</DialogTitle></DialogHeader>
                  <AnamnesisInsightsFull userId={resolvedPatientId} />
                </DialogContent>
              </Dialog>

              {/* Meal Plans Section */}
              <div className="md:col-span-2">
                <div className="glass rounded-xl p-6 border-emerald-500/10 shadow-glow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold flex items-center gap-2">
                      <ChefHat className="w-5 h-5 text-emerald-500" /> Planos Alimentares
                    </h3>
                    <Button 
                      size="sm" 
                      onClick={() => navigate(`/editor-v3/${resolvedPatientId}`)}
                      className="gradient-primary h-8"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Novo Plano
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {mealPlans && mealPlans.length > 0 ? (
                      mealPlans.map((plan: any) => (
                        <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-emerald-500/30 transition-all group">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm group-hover:text-emerald-500 transition-colors">{plan.title}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={plan.is_active ? "default" : "secondary"} className="text-[10px] h-4">
                                {plan.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-4 border-emerald-500/20 text-emerald-600">
                                {plan.editor_version === 'v3' ? 'V3 Premium' : 'V2 Standard'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(plan.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 hover:bg-emerald-500/10 hover:text-emerald-600"
                              onClick={() => {
                                navigate(`/v3/${resolvedPatientId}?planId=${plan.id}`);
                              }}
                            >
                              <PencilLine className="w-4 h-4 mr-1" /> Editar
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                        <UtensilsCrossed className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum plano alimentar encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assessment Modal */}
              <Dialog open={openSection === "assessment"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Avaliação Física</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" /> Evolução Física
                      </h2>
                      <Button onClick={() => { setOpenSection(null); navigate(`/physical-assessment?patientId=${patientId}`); }} className="gradient-primary gap-2 shadow-glow">
                        <Scale className="w-4 h-4" /> Nova Avaliação
                      </Button>
                    </div>
                    <BodyEvolutionCard patientId={resolvedPatientId} />
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4">Comparativo entre Consultas</h3>
                      <ConsultationCompare patientId={resolvedPatientId} />
                    </div>
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-accent" /> Documentos da Avaliação
                      </h3>
                      <DocumentUpload patientId={resolvedPatientId} nutritionistId={user!.id} documentType="assessment" documents={assessmentDocs} onUploadComplete={invalidate} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Agenda Modal */}
              <Dialog open={openSection === "agenda"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Agenda</DialogTitle></DialogHeader>
                  <PatientAgenda patientId={resolvedPatientId} />
                </DialogContent>
              </Dialog>

              {/* Calculators Modal */}
              <Dialog open={openSection === "calculators"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Calculadoras</DialogTitle></DialogHeader>
                  <PatientCalculators anamnesis={anamnesis} />
                </DialogContent>
              </Dialog>

              {/* Timeline Modal */}
              <Dialog open={openSection === "timeline"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Timeline de Jornada</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    {/* Components removed for MVP cleanup */}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Plan Modal */}
              <Dialog open={openSection === "plan"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Plano & Prestígio</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-primary" /> Plano Atual
                      </h3>
                      {patientSubscription ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Plano</span>
                            <span className="font-medium text-sm">{patientSubscription.plan_name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={
                              patientSubscription.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                              patientSubscription.status === "expired" ? "bg-red-500/10 text-red-500" :
                              "bg-muted text-muted-foreground"
                            }>
                              {patientSubscription.status === "active" ? "Ativo" :
                               patientSubscription.status === "expired" ? "Expirado" :
                               patientSubscription.status === "trial" ? "Trial" : patientSubscription.status}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setPlanOpen(true)}>
                            Editar Plano
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">Nenhum plano atribuído</p>
                          <Button size="sm" className="gradient-primary" onClick={() => setPlanOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Atribuir Plano
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* ═══ Prestige Card ═══ */}
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <Crown className="w-5 h-5 text-amber-500" /> Prestígio
                      </h3>
                      {currentPrestigePlan ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-primary/10 border border-amber-500/20">
                            <PrestigeBadge plan={currentPrestigePlan} size="md" />
                            <div>
                              <p className="font-semibold text-sm">{currentPrestigePlan.name}</p>
                              <p className="text-xs text-muted-foreground">{currentPrestigePlan.badge_label || "Ativo"}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 mb-2">
                          <Crown className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Sem prestígio ativo</p>
                        </div>
                      )}
                      <div className="mt-3 space-y-2">
                        <Label className="text-xs">Alterar Prestígio</Label>
                        <Select
                          value={selectedPrestigePlanId || currentPrestigePlan?.id || ""}
                          onValueChange={async (v) => {
                            if (!patientId || !user) return;
                            setSelectedPrestigePlanId(v);
                            // Apply immediately
                            await supabase.from("patient_prestige").update({ is_active: false }).eq("patient_id", patientId).eq("is_active", true);
                            if (v && v !== "none") {
                              await supabase.from("patient_prestige").insert({ patient_id: patientId, plan_id: v, assigned_by: user.id, is_active: true });
                              const sp = prestigePlans.find((p: any) => p.id === v);
                              toast.success(`${sp?.badge_icon || "👑"} Prestígio ${sp?.name || ""} aplicado!`);
                            } else {
                              toast.success("Prestígio removido");
                            }
                            invalidate();
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione um prestígio..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">❌ Sem Prestígio</SelectItem>
                            {prestigePlans.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.badge_icon || "⭐"} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Feedback card */}
                    <div className="glass rounded-xl p-5 md:col-span-2">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <Send className="w-5 h-5 text-primary" /> Agendar Feedback
                      </h3>
                      <form onSubmit={scheduleFeedback} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <Label>Enviar daqui a (dias)</Label>
                          <Select value={feedbackForm.days} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, days: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 dia</SelectItem>
                              <SelectItem value="2">2 dias</SelectItem>
                              <SelectItem value="3">3 dias</SelectItem>
                              <SelectItem value="5">5 dias</SelectItem>
                              <SelectItem value="7">7 dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Mensagem</Label>
                          <Textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} rows={2} />
                        </div>
                        <Button type="submit" className="gradient-primary gap-2">
                          <Send className="w-4 h-4" /> Enviar
                        </Button>
                      </form>
                    </div>
                  </div>
                  <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">{patientSubscription ? "Editar Plano" : "Atribuir Plano"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={savePlan} className="space-y-4">
                        <div>
                          <Label>Plano</Label>
                          <Select value={planForm.plan_name} onValueChange={(v) => {
                            const monthsMap: Record<string, number> = { "Mensal": 1, "Trimestral": 3, "Semestral": 6, "Anual": 12 };
                            const months = monthsMap[v];
                            let newExpires = planForm.expires_at;
                            if (months && planForm.started_at) {
                              const end = new Date(planForm.started_at);
                              end.setMonth(end.getMonth() + months);
                              newExpires = end.toISOString().split("T")[0];
                            }
                            let autoValue = planForm.value;
                            const pid = selectedPrestigePlanId && selectedPrestigePlanId !== "none" ? selectedPrestigePlanId : (currentPrestigePlan?.id || (prestigePlans.length > 0 ? prestigePlans[0].id : ""));
                            if (pid) {
                              const sp = prestigePlans.find(p => p.id === pid);
                              if (sp) {
                                const priceMap: Record<string, number | null> = { "Mensal": sp.price_monthly, "Trimestral": sp.price_quarterly, "Semestral": sp.price_semiannual, "Anual": sp.price_annual };
                                const price = priceMap[v];
                                if (price != null) autoValue = String(price);
                              }
                            }
                            setPlanForm(f => ({ ...f, plan_name: v, expires_at: newExpires, value: autoValue }));
                          }}>
                            <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mensal">Mensal</SelectItem>
                              <SelectItem value="Trimestral">Trimestral</SelectItem>
                              <SelectItem value="Semestral">Semestral</SelectItem>
                              <SelectItem value="Anual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Valor (R$)</Label>
                          <Input type="number" step="0.01" min="0" placeholder="Ex: 150.00" value={planForm.value} onChange={(e) => setPlanForm({ ...planForm, value: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Data Início</Label><Input type="date" value={planForm.started_at} onChange={(e) => {
                            const newStart = e.target.value;
                            const monthsMap: Record<string, number> = { "Mensal": 1, "Trimestral": 3, "Semestral": 6, "Anual": 12 };
                            const months = monthsMap[planForm.plan_name];
                            let newExpires = planForm.expires_at;
                            if (months && newStart) {
                              const end = new Date(newStart);
                              end.setMonth(end.getMonth() + months);
                              newExpires = end.toISOString().split("T")[0];
                            }
                            setPlanForm(f => ({ ...f, started_at: newStart, expires_at: newExpires }));
                          }} required /></div>
                          <div><Label>Data Fim</Label><Input type="date" value={planForm.expires_at} onChange={(e) => setPlanForm({ ...planForm, expires_at: e.target.value })} /></div>
                        </div>
                        {/* Prestígio inline */}
                        <div>
                          <Label>Prestígio</Label>
                          <Select
                            value={selectedPrestigePlanId || currentPrestigePlan?.id || "none"}
                            onValueChange={(v) => setSelectedPrestigePlanId(v)}
                          >
                            <SelectTrigger><SelectValue placeholder="Selecione um prestígio..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">❌ Sem Prestígio</SelectItem>
                              {prestigePlans.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.badge_icon || "⭐"} {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full gradient-primary" disabled={!planForm.plan_name}>
                          {patientSubscription ? "Atualizar Plano" : "Atribuir Plano"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </DialogContent>
              </Dialog>

              {/* Protocols Modal */}
              <Dialog open={openSection === "protocols"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Protocolos</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    {patientProtocols.length === 0 ? (
                      <div className="glass rounded-xl p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhum protocolo ativado.</p>
                      </div>
                    ) : (
                      patientProtocols.map((pp: any) => (
                        <div key={pp.id} className="glass rounded-xl p-4 flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${pp.status === "active" ? "bg-success" : pp.status === "scheduled" ? "bg-warning" : "bg-muted-foreground"}`} />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{pp.protocol_title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {pp.status === "active" ? "Ativo" : pp.status === "scheduled" ? "Programado" : pp.status} •
                              Início: {new Date(pp.start_date).toLocaleDateString("pt-BR")}
                              {pp.end_date && ` • Fim: ${new Date(pp.end_date).toLocaleDateString("pt-BR")}`}
                            </p>
                          </div>
                          {pp.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => syncChecklist(pp.id)} className="gap-1">
                              <Zap className="w-3 h-3" /> Sync
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Checklist Modal */}
              <Dialog open={openSection === "checklist"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Checklist Diário</DialogTitle></DialogHeader>
                  <PatientChecklistView patientId={resolvedPatientId} editable={true} />
                </DialogContent>
              </Dialog>

              {/* Editor Matrix Modal Removed */}

              {/* Meal Plans Modal */}
              <Dialog open={openSection === "meal-plans"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Planos Alimentares</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    {/* Fast Plan Actions Panel */}
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-xs font-medium text-muted-foreground self-center mr-2">Ações Rápidas:</span>
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={async () => {
                        setOpenSection(null);
                        // Try to find existing onboarding plan, or create new and open builder
                        try {
                          if (!patientId) return;
                          const patientIdentity = await resolvePatientIdentity(patientId);
                          const pd = await resolveLatestOnboardingPipeline(patientId);
                          if (pd?.generated_plan_id && pd?.plan_generated) {
                            const { data: planData } = await supabase.from("meal_plans").select("editor_version").eq("id", pd.generated_plan_id).single();
                            const isV3 = planData?.editor_version === "v3";
                            const path = `/editor-v3/${patientIdentity.canonicalId}?planId=${pd.generated_plan_id}`;
                            navigate(path);
                            return;
                          }
                          // No onboarding plan — generate one
                          toast.info("Gerando plano a partir do onboarding...");
                          const { data: genData, error: genError } = await supabase.functions.invoke("generate-meal-plan", {
                            body: { patientId: patientIdentity.canonicalId, nutritionistId: user?.id, isPipeline: true },
                          });
                          if (genError || !genData?.success) {
                            toast.error(genData?.error || "Erro ao gerar plano");
                            return;
                          }
                          if (genData.mealPlanId) {
                            const { data: planData } = await supabase.from("meal_plans").select("editor_version").eq("id", genData.mealPlanId).single();
                            const isV3 = planData?.editor_version === "v3";
                            const path = `/editor-v3/${patientIdentity.canonicalId}?planId=${genData.mealPlanId}`;
                            
                            if (genData.is_fallback_template) {
                              toast.info(`Nota: Usamos template padrão como fallback.`);
                            }
                            toast.success("Plano gerado com sucesso!");
                            navigate(path);
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Erro ao processar onboarding");
                        }
                      }}>
                        <Zap className="w-3 h-3" /> A partir do Onboarding
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => { setOpenSection(null); navigate(`/diet-templates?patientId=${patientId}`); }}>
                        <BookOpen className="w-3 h-3" /> A partir de Template
                      </Button>
                      <Button size="sm" className="gap-1 text-xs h-7 gradient-primary" onClick={async () => {
                        if (!resolvedPatientId) {
                          toast.error("ID do paciente não resolvido");
                          return;
                        }
                        setOpenSection(null);
                        // Create plan directly then open builder
                        try {
                          const { data: newPlan, error } = await createMealPlanDraft({
                            nutritionistId: user!.id,
                            patientId: resolvedPatientId,
                            tenantId,
                          });
                          if (error) throw error;
                          if (!newPlan?.id) throw new Error("ID do novo plano não retornado");
                          if (newPlan?.id && resolvedPatientId) {
                            toast.success("Plano criado! Abrindo Builder...");
                            const isV3 = newPlan.editor_version === "v3";
                            const path = `/editor-v3/${encodeURIComponent(resolvedPatientId)}?planId=${newPlan.id}`;
                            navigate(path, { replace: true });
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Erro ao criar plano");
                        }
                      }}>
                        <Plus className="w-3 h-3" /> Do Zero
                      </Button>
                      {mealPlans.some((p: any) => p.is_active) && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={async () => {
                            const activePlan = mealPlans.find((p: any) => p.is_active);
                            if (!activePlan) return;
                            setOpenSection(null);
                            const isV3 = activePlan.editor_version === "v3";
                            const path = `/editor-v3/${patientId}?planId=${activePlan.id}`;
                            navigate(path);
                          }}>
                            <Pencil className="w-3 h-3" /> Editar Ativo
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="gap-1 text-xs h-7">
                                <Trash2 className="w-3 h-3" /> Excluir Ativo
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir plano ativo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso irá excluir permanentemente o plano alimentar ativo deste paciente. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                  const activePlan = mealPlans.find((p: any) => p.is_active);
                                  if (!activePlan) return;
                                  try {
                                    // Server-authoritative: archive → delete items → delete plan
                                    const { error: archErr } = await supabase.from("meal_plans").update({ is_active: false, plan_status: "archived" }).eq("id", activePlan.id);
                                    if (archErr) throw archErr;
                                    if (!activePlan?.id || typeof activePlan.id !== 'string' || activePlan.id.trim() === "") {
                                      console.error("[CRITICAL] DELETE bloqueado: activePlan.id inválido em PatientDetail");
                                      throw new Error("DELETE bloqueado: planId inválido");
                                    }
                                    
                                    console.info("[DELETE] Excluindo itens do plano em PatientDetail", { meal_plan_id: activePlan.id, operation: "deletePlanPatientDetail", timestamp: Date.now() });
                                    
                                    const { error: itemsErr } = await supabase.from("meal_plan_items").delete().eq("meal_plan_id", activePlan.id);
                                    if (itemsErr) throw itemsErr;
                                    
                                    const { error: delErr } = await supabase.from("meal_plans").delete().eq("id", activePlan.id);
                                    if (delErr) throw delErr;
                                    toast.success("Plano alimentar excluído!");
                                  } catch (e: any) {
                                    console.error("[PatientDetail] Delete plan error:", e);
                                    toast.error("Erro ao excluir plano: " + (e.message || "erro desconhecido"));
                                    return;
                                  }
                                  // Invalidate all caches
                                  const { invalidateCriticalQueries } = await import("@/lib/queryInvalidation");
                                  const qc = (window as any).__REACT_QUERY_CLIENT__;
                                  if (qc) invalidateCriticalQueries(qc, activePlan.patient_id);
                                  invalidate();
                                }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir Permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                    {mealPlans.length === 0 ? (
                      <div className="glass rounded-xl p-12 text-center">
                        <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="font-display text-lg font-semibold mb-2">Nenhum plano alimentar</h3>
                        <p className="text-sm text-muted-foreground mb-4">Crie um plano alimentar para este paciente.</p>
                        <Button onClick={async () => {
                          setOpenSection(null);
                          try {
                            const { data: newPlan, error } = await createMealPlanDraft({
                              nutritionistId: user!.id,
                              patientId: resolvedPatientId,
                              tenantId,
                            });
                            if (error) throw error;
                            toast.success("Plano criado! Abrindo Builder...");
                            // Navigate to the editor matching the plan version
                            const editorPath = newPlan.editor_version === "v3" && resolvedPatientId ? `/v3/${resolvedPatientId}?planId=${newPlan.id}` : `/meal-plans/${newPlan.id}`;
                            navigate(editorPath, { replace: true });
                          } catch (err: any) {
                            toast.error(err.message || "Erro ao criar plano");
                          }
                        }} className="gradient-primary">
                          <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Plano
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mealPlans.map((plan: any) => {
                          const statusConfig: Record<string, { label: string; color: string; action?: string }> = {
                            draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
                            draft_auto_generated: { label: "Pré-plano Gerado", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400", action: "edit" },
                            under_professional_review: { label: "⏳ Aguardando Aprovação", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse", action: "edit" },
                            approved: { label: "✅ Aprovado", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                            published_to_patient: { label: "✅ Publicado", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                            rejected: { label: "❌ Rejeitado", color: "bg-destructive/20 text-destructive" },
                            archived: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
                          };
                          const st = statusConfig[plan.plan_status] || { label: plan.plan_status || "—", color: "bg-muted text-muted-foreground" };
                          const isPending = ["draft", "draft_auto_generated", "draft_auto_corrected", "under_professional_review", "revision_requested"].includes(plan.plan_status);

                          // Engine version governance
                          const planEngineV = plan.generation_metadata?.engine_version || plan.engine_version || null;
                          const isOutdatedEngine = planEngineV && planEngineV < "4.0.0";

                          return (
                          <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-xl overflow-hidden ${isPending ? "ring-2 ring-amber-500/40" : ""}`}>
                            <div className="p-5 border-b border-border">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${plan.is_active ? "bg-success animate-pulse" : isPending ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"}`} />
                                  <div>
                                    <h3 className="font-display font-semibold">{plan.title}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                                      {isOutdatedEngine && (
                                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                          ⚠ Motor v{planEngineV} (atual: v4.0.0)
                                        </Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
                                        {plan.end_date && ` • Fim: ${new Date(plan.end_date).toLocaleDateString("pt-BR")}`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isPending && (
                                    <Button
                                      size="sm"
                                      className="gradient-primary shadow-glow gap-1.5"
                                      onClick={() => {
                                        setOpenSection(null);
                                        const path = `/editor-v3/${resolvedPatientId}?planId=${plan.id}`;
                                        navigate(path);
                                      }}
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Revisar e Aprovar
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => {
                                      setOpenSection(null);
                                      const path = plan.editor_version === "v3" 
                                        ? `/meal-plans/editor/v3?patientId=${resolvedPatientId}&planId=${plan.id}`
                                        : `/meal-plans/${plan.id}`;
                                      navigate(path);
                                    }}
                                  >
                                    <FileText className="w-3.5 h-3.5" /> {isPending ? "Ver" : "Ver Plano"}
                                  </Button>
                                </div>
                              </div>
                              {plan.description && <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>}
                            </div>
                            {!isPending && (
                              <div className="p-5 bg-secondary/20">
                                <PlanScheduler mealPlanId={plan.id} planTitle={plan.title} />
                                <PatientFeedbackSummary mealPlanId={plan.id} />
                              </div>
                            )}
                          </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-success" /> Documentos do Plano Alimentar
                      </h3>
                      <DocumentUpload patientId={resolvedPatientId} nutritionistId={user!.id} documentType="meal_plan" documents={mealPlanDocs} onUploadComplete={invalidate} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Radar Modal */}
              <Dialog open={openSection === "radar"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Radar Metabólico</DialogTitle></DialogHeader>
                  <MetabolicRadar anamnesis={anamnesis} />
                </DialogContent>
              </Dialog>

              {/* Recipes Modal */}
              <Dialog open={openSection === "recipes"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Receitas Compartilhadas</DialogTitle></DialogHeader>
                  {recipes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nenhuma receita compartilhada ainda.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recipes.map((recipe: any) => (
                        <div key={recipe.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                          {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
                          <h4 className="font-semibold text-sm">{recipe.title}</h4>
                          {recipe.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            {recipe.calories_per_serving && <span>{recipe.calories_per_serving} kcal</span>}
                            {recipe.prep_time_minutes && <span>{recipe.prep_time_minutes} min preparo</span>}
                            {recipe.difficulty && <Badge variant="secondary" className="text-[10px]">{recipe.difficulty}</Badge>}
                          </div>
                          {recipe.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {recipe.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Clinical Decision Support Modal (Cleaned up for MVP) */}
              <Dialog open={openSection === "clinical-decision"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Suporte à Decisão Clínica</DialogTitle></DialogHeader>
                  <ClinicalDecisionSupport patientId={resolvedPatientId} nutritionistId={user!.id} />
                </DialogContent>
              </Dialog>

              {/* Clinical Flags Modal */}
              <Dialog open={openSection === "clinical-flags"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Flags Clínicas do Paciente</DialogTitle></DialogHeader>
                  <ClinicalFlagsSummary patientId={resolvedPatientId} />
                  <div className="mt-6 pt-6 border-t border-border">
                    <PatientBehavioralManager patientId={resolvedPatientId} />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Lab Exams Modal */}
              <Dialog open={openSection === "lab-exams"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Exames Laboratoriais</DialogTitle></DialogHeader>
                  <PatientLabExams patientId={resolvedPatientId} />
                </DialogContent>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Missões (removido para MVP)</DialogTitle></DialogHeader>
                </DialogContent>
              </Dialog>

              {/* Body Projection Modal */}
              <Dialog open={openSection === "body-projection"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Projeção Corporal</DialogTitle></DialogHeader>
                  <BodyProjectionProCard patientId={resolvedPatientId} isAdmin={isAdmin} />
                </DialogContent>
              </Dialog>

              {/* Onboarding Pipeline Modal */}
              <Dialog open={openSection === "onboarding"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Onboarding Automático</DialogTitle></DialogHeader>
                  
                  {/* Onboarding Management Controls */}
                  <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg bg-muted/30 border border-border">
                    <span className="text-xs font-medium text-muted-foreground self-center mr-2">Gerenciar:</span>
                    {/* Official Reset + Generate Link */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7 border-warning/30 text-warning hover:bg-warning/10">
                          <RefreshCw className="w-3 h-3" /> Resetar & Gerar Link
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resetar Onboarding e Gerar Novo Link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá arquivar o pipeline anterior, criar um novo do zero e gerar um link seguro para o paciente preencher a anamnese. O histórico será mantido.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            if (!patientId || !user) return;
                            try {
                              const { data, error } = await supabase.rpc("reset_onboarding_pipeline" as any, {
                                _patient_id: patientId,
                                _nutritionist_id: user.id,
                                _tenant_id: tenantId || null,
                              });
                              if (error) throw error;
                              const result = data as any;
                              if (result?.success && result?.token) {
                                const link = `${window.location.origin}/cadastro?nutri=${user.id}&code=${result.token}`;
                                await navigator.clipboard.writeText(link);
                                toast.success("Onboarding resetado! Link copiado para a área de transferência 📋");
                              } else {
                                toast.success("Onboarding resetado com sucesso!");
                              }
                              invalidate();
                            } catch (err: any) {
                              toast.error("Erro ao resetar: " + (err.message || "Tente novamente"));
                            }
                          }} className="bg-warning text-warning-foreground hover:bg-warning/90">
                            Confirmar Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Generate Link Only (without reset) */}
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={async () => {
                      if (!patientId || !user) return;
                      try {
                        // Check for existing active token
                        const { data: existingTokens } = await supabase
                          .from("onboarding_tokens" as any)
                          .select("token, expires_at")
                          .eq("patient_id", patientId)
                          .eq("status", "active")
                          .gt("expires_at", new Date().toISOString())
                          .order("created_at", { ascending: false })
                          .limit(1);

                        let tokenValue: string;
                        if (existingTokens && (existingTokens as any[]).length > 0) {
                          tokenValue = (existingTokens as any[])[0].token;
                        } else {
                          // Create new token
                          const { data: newToken, error } = await supabase
                            .from("onboarding_tokens" as any)
                            .insert({
                              patient_id: patientId,
                              nutritionist_id: user.id,
                              tenant_id: tenantId || null,
                            } as any)
                            .select("token")
                            .single();
                          if (error) throw error;
                          tokenValue = (newToken as any).token;
                        }

                        const link = `${window.location.origin}/cadastro?nutri=${user.id}&code=${tokenValue}`;
                        await navigator.clipboard.writeText(link);
                        toast.success("Link de onboarding copiado! 📋");
                      } catch (err: any) {
                        toast.error("Erro ao gerar link: " + (err.message || "Tente novamente"));
                      }
                    }}>
                      <Copy className="w-3 h-3" /> Copiar Link
                    </Button>

                    {/* Send Link via notification */}
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={async () => {
                      if (!patientId || !user) return;
                      try {
                        // Get or create token
                        const { data: existingTokens } = await supabase
                          .from("onboarding_tokens" as any)
                          .select("token")
                          .eq("patient_id", patientId)
                          .eq("status", "active")
                          .gt("expires_at", new Date().toISOString())
                          .order("created_at", { ascending: false })
                          .limit(1);

                        let tokenValue: string;
                        if (existingTokens && (existingTokens as any[]).length > 0) {
                          tokenValue = (existingTokens as any[])[0].token;
                        } else {
                          const { data: newToken, error } = await supabase
                            .from("onboarding_tokens" as any)
                            .insert({
                              patient_id: patientId,
                              nutritionist_id: user.id,
                              tenant_id: tenantId || null,
                            } as any)
                            .select("token")
                            .single();
                          if (error) throw error;
                          tokenValue = (newToken as any).token;
                        }

                        const link = `${window.location.origin}/cadastro?nutri=${user.id}&code=${tokenValue}`;

                        // Send notification to patient
                        await supabase.from("notifications").insert({
                          user_id: patientId,
                          title: "📋 Link de Anamnese",
                          message: `Seu profissional enviou um link para iniciar o onboarding. Acesse: ${link}`,
                          type: "info",
                          action_url: `/cadastro?nutri=${user.id}&code=${tokenValue}`,
                        } as any);

                        toast.success("Link enviado como notificação ao paciente! 📩");
                      } catch (err: any) {
                        toast.error("Erro ao enviar: " + (err.message || "Tente novamente"));
                      }
                    }}>
                      <Send className="w-3 h-3" /> Enviar Link
                    </Button>
                  </div>
                  
                  <OnboardingApprovalQueue patientId={resolvedPatientId} patientName={profile?.full_name || "Paciente"} />
                </DialogContent>
              </Dialog>

              {/* Edit Profile Modal */}
              <Dialog open={openSection === "edit-profile"} onOpenChange={(v) => {
                if (!v) setOpenSection(null);
                else {
                  setEditProfileForm({
                    full_name: profile?.full_name || "",
                    phone: profile?.phone || "",
                    email: patientEmail || "",
                    goal: (profile as any)?.goal || "",
                    notes: (profile as any)?.notes || "",
                  });
                }
              }}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-info" /> Editar Cadastro do Paciente
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <Label>Nome Completo</Label>
                      <Input
                        value={editProfileForm.full_name}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, full_name: e.target.value })}
                        placeholder="Nome do paciente"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <Label>Email (autenticação)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={editProfileForm.email}
                          onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          type="email"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingProfile || editProfileForm.email === patientEmail}
                          onClick={async () => {
                            const normalizedEmail = editProfileForm.email.trim().toLowerCase();
                            if (!patientId || normalizedEmail === patientEmail) return;
                            if (!confirm(`Alterar email de autenticação para ${normalizedEmail}?`)) return;
                            try {
                              await invokeAdminIdentityAction("update_email", { email: normalizedEmail });
                              setEditProfileForm((prev) => ({ ...prev, email: normalizedEmail }));
                              toast.success("Email atualizado com sucesso");
                              invalidate();
                            } catch (e: any) { toast.error(e?.message || "Erro ao atualizar email"); }
                          }}
                        >
                          Salvar Email
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alterar o email atualiza o login do paciente. Use com cuidado.
                      </p>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={editProfileForm.phone}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                        placeholder="(99) 99999-9999"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <Label>Objetivo Principal</Label>
                      <Input
                        value={editProfileForm.goal}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, goal: e.target.value })}
                        placeholder="Ex: Emagrecimento, Hipertrofia..."
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={editProfileForm.notes}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, notes: e.target.value })}
                        placeholder="Anotações sobre o paciente..."
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingProfile || !editProfileForm.full_name.trim()}>
                      {savingProfile ? "Salvando..." : "Salvar Nome, Telefone e Dados"}
                    </Button>

                    {/* FitJourney Intelligence Toggle */}
                    <div className="border-t pt-3">
                      <FitIntelligenceToggle
                        patientId={resolvedPatientId}
                        enabled={(profile as any)?.fit_intelligence_enabled || false}
                        onboarded={(profile as any)?.fit_intelligence_onboarded || false}
                        expiresAt={(profile as any)?.fit_intelligence_expires_at || null}
                        accessMode={(profile as any)?.fit_intelligence_access_mode || "unlimited"}
                        onToggle={() => invalidate()}
                      />
                    </div>

                    {/* Marmita Mode Toggles */}
                    <div className="border-t pt-3 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <ChefHat className="w-4 h-4 text-primary" />
                            Modo Paciente Marmita
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Gera planos usando apenas receitas de marmita cadastradas.
                          </p>
                        </div>
                        <Switch
                          checked={(profile as any)?.marmita_mode || false}
                          onCheckedChange={async (checked) => {
                            try {
                              const { error } = await supabase
                                .from("profiles")
                                .update({ marmita_mode: checked } as any)
                                .eq("user_id", resolvedPatientId);
                              if (error) throw error;
                              toast.success(`Modo Marmita ${checked ? "ativado" : "desativado"}!`);
                              invalidate();
                            } catch (e: any) {
                              toast.error("Erro ao atualizar modo marmita");
                            }
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Timer className="w-4 h-4 text-amber-500" />
                            Modo Marmita Rápida
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Prioriza receitas com menor tempo de preparo e instruções otimizadas.
                          </p>
                        </div>
                        <Switch
                          checked={(profile as any)?.fast_marmita_mode || false}
                          onCheckedChange={async (checked) => {
                            try {
                              const { error } = await supabase
                                .from("profiles")
                                .update({ fast_marmita_mode: checked } as any)
                                .eq("user_id", resolvedPatientId);
                              if (error) throw error;
                              toast.success(`Modo Marmita Rápida ${checked ? "ativado" : "desativado"}!`);
                              invalidate();
                            } catch (e: any) {
                              toast.error("Erro ao atualizar modo marmita rápida");
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ações de Identidade (Admin)</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 border-warning/30 text-warning hover:bg-warning/10"
                        onClick={async () => {
                          if (!patientId) return;
                          const tempPassword = "Fit@2026!";
                          if (!confirm(`Redefinir senha do paciente para ${tempPassword}?`)) return;
                          try {
                            try {
                              await invokeAdminIdentityAction("reset_password", { password: tempPassword });
                            } catch {
                              await invokeAdminPasswordReset(tempPassword);
                            }

                            toast.success(`Senha redefinida para ${tempPassword}`);
                          } catch (e: any) {
                            toast.error(e?.message || "Erro ao redefinir senha");
                          }
                        }}
                      >
                        🔑 Redefinir Senha (Fit@2026!)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 border-info/30 text-info hover:bg-info/10"
                        onClick={async () => {
                          if (!patientId) return;
                          try {
                            await invokeAdminIdentityAction("resend_invite", {});
                            toast.success("Convite reenviado com sucesso");
                          } catch (e: any) {
                            toast.error(e?.message || "Erro ao reenviar convite");
                          }
                        }}
                      >
                        📩 Reenviar Convite / Acesso
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Feedbacks Modal */}
              <Dialog open={openSection === "feedbacks"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><MessageSquare className="w-5 h-5 text-amber-500" /> Feedbacks do Paciente</DialogTitle></DialogHeader>
                  {patientId && <PatientFeedbacksPanel patientId={resolvedPatientId} />}
                </DialogContent>
              </Dialog>

              {/* Projects / Governance Modal */}
              <Dialog open={openSection === "projects"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> Projetos & Governança</DialogTitle></DialogHeader>
                  {patientId && (
                    <PatientProjectGovernance
                      patientId={resolvedPatientId}
                      isProfessionalView={true}
                      onProtocolChanged={invalidate}
                    />
                  )}
                </DialogContent>
              </Dialog>

              {/* Deterministic Audit Modal */}
              <Dialog open={openSection === "audit-log"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" /> Auditoria de Decisão Clínica
                    </DialogTitle>
                  </DialogHeader>
                  {patientId && <DeterministicAuditLog patientId={resolvedPatientId} />}
                </DialogContent>
              </Dialog>
            </>

          );
        })()}

        {/* Onboarding Release Dialog */}
        <OnboardingReleaseDialog
          patientId={resolvedPatientId}
          patientName={profile?.full_name || "Paciente"}
          open={releaseOnboardingOpen}
          onOpenChange={setReleaseOnboardingOpen}
          onReleased={invalidate}
        />
      </div>
    </DashboardLayout>
  );
}
