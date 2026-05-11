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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { PRODUCTION_URL } from "@/lib/config";
import { copyToClipboard } from "@/utils/clipboard";
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
  TrendingUp, Zap, Heart, Brain, BookOpen, Scale, Calculator, CalendarDays, CreditCard, Send, UtensilsCrossed, X, Maximize2, ChefHat, Upload, Power, Trash2, Stethoscope, Crown, UserCog, Pencil, Sparkles, Rocket, Shield, Loader2, Search, ShieldAlert, Timer, History, PencilLine, Ruler, Target, Eye
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
import Curiosidades from "./Curiosidades";
import { resolveLatestOnboardingPipeline, resolvePatientIdentity } from "@/lib/onboardingPlanResolver";
import { DeterministicAuditLog } from "@/components/patient/DeterministicAuditLog";
import { ClinicalConsentViewer } from "@/components/patient/ClinicalConsentViewer";
import PatientProfileMealPlan from "@/components/patient/PatientProfileMealPlan";



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
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync selectedPrestigePlanId when data loads asynchronously
  useEffect(() => {
    if (data?.currentPrestigePlanId) {
      setSelectedPrestigePlanId(data.currentPrestigePlanId);
    }
  }, [data?.currentPrestigePlanId]);

  useEffect(() => {
    if (profile) {
      setEditProfileForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        email: patientEmail || "",
        goal: (profile as any).goal || "",
        notes: (profile as any).notes || "",
      });
    }
  }, [profile, patientEmail]);

  // Invalidation helper — centralized
  const invalidate = () => {
    invalidateLifecycleQueries(queryClient, patientId ?? undefined);
  };

  const getMealPlanPDFData = async (plan: any) => {
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user?.id).maybeSingle();
    const profName = prof?.full_name || "Seu Nutricionista";
    
    let planItems = [];
    const isWeekly = plan.plan_mode === 'weekly';
    
    if (plan.editor_version === 'v3' && plan.payload) {
      const meals = Array.isArray(plan.payload) ? plan.payload : (plan.payload.meals || []);
      const hasVaryingDays = meals.length >= 42;
      
      if (hasVaryingDays) {
        planItems = meals.flatMap((m: any, idx) => {
          const dayIdx = Math.floor(idx / (meals.length / 7));
          const daysOrder = [1, 2, 3, 4, 5, 6, 0];
          const dayNum = daysOrder[dayIdx];
          const mType = m.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
          
          return (m.items || []).flatMap((item: any) => ({
            mealType: mType,
            title: m.name,
            description: `${item.name} — ${item.display_portion || (item.quantity + (item.unit || 'g'))}`,
            calories_target: Math.round(Number(item.kcal) || 0),
            protein_target: Math.round(Number(item.protein) || 0),
            carbs_target: Math.round(Number(item.carbs) || 0),
            fat_target: Math.round(Number(item.fat) || 0),
            is_primary: true,
            substitution_group_id: item.instanceId,
            day_of_week: dayNum
          }));
        });
      } else {
        const daysToGenerate = isWeekly ? [1, 2, 3, 4, 5, 6, 0] : [-1];
        planItems = daysToGenerate.flatMap((dayNum) => {
          return meals.flatMap((m: any) => {
            const mType = m.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
            
            return (m.items || []).flatMap((item: any) => {
              const main = {
                mealType: mType,
                title: m.name,
                description: `${item.name} — ${item.display_portion || (item.quantity + (item.unit || 'g'))}`,
                calories_target: Math.round(Number(item.kcal) || 0),
                protein_target: Math.round(Number(item.protein) || 0),
                carbs_target: Math.round(Number(item.carbs) || 0),
                fat_target: Math.round(Number(item.fat) || 0),
                is_primary: true,
                substitution_group_id: item.instanceId,
                day_of_week: dayNum
              };
              
              const subs = !isWeekly ? (item.substitutions || []).map((sub: any) => ({
                mealType: mType,
                title: sub.name,
                description: sub.name,
                calories_target: Math.round(Number(sub.kcal) || 0),
                protein_target: Math.round(Number(sub.protein) || 0),
                carbs_target: Math.round(Number(sub.carbs) || 0),
                fat_target: Math.round(Number(sub.fat) || 0),
                is_primary: false,
                substitution_group_id: item.instanceId,
                day_of_week: dayNum
              })) : [];
              
              return [main, ...subs];
            });
          });
        });
      }
    } else {
      const { data: items, error: itemsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", plan.id)
        .order("day_of_week", { ascending: true })
        .order("meal_type", { ascending: true });
        
      if (itemsError) throw itemsError;
      planItems = items.map((item: any) => ({
        mealType: item.meal_type,
        title: item.title,
        description: item.description,
        calories_target: item.calories_target,
        protein_target: item.protein_target,
        carbs_target: item.carbs_target,
        fat_target: item.fat_target,
        is_primary: item.is_primary,
        substitution_group_id: item.substitution_group_id,
        day_of_week: item.day_of_week
      }));
    }

    return {
      planTitle: plan.title || "Plano Alimentar FitJourney",
      patientName: profile?.full_name || "Paciente",
      nutritionistName: profName,
      startDate: new Date().toLocaleDateString("pt-BR"),
      items: planItems,
      targetCalories: Math.round(Number(plan.total_target_calories || plan.total_calories || 0)),
      targetProtein: Math.round(Number(plan.total_target_protein || plan.total_protein || 0)),
      targetCarbs: Math.round(Number(plan.total_target_carbs || plan.total_carbs || 0)),
      targetFat: Math.round(Number(plan.total_target_fat || plan.total_fat || 0)),
      goal: profile?.goal,
      planMode: plan.plan_mode
    };
  };

  const handlePreviewPDF = async (plan: any) => {
    if (!plan?.id || !patientId) return;
    const toastId = toast.loading("Gerando visualização do plano...");
    try {
      const pdfData = await getMealPlanPDFData(plan);
      const { generatePremiumMealPlanPDF } = await import("@/lib/pdfExportPremium");
      generatePremiumMealPlanPDF(pdfData as any);
      toast.success("Visualização aberta!", { id: toastId });
    } catch (err) {
      console.error("Preview error:", err);
      toast.error("Erro ao gerar visualização", { id: toastId });
    }
  };

  const handleSendWhatsApp = async (plan: any) => {
    if (!plan?.id || !patientId) return;
    
    setSendingWhatsAppId(plan.id);
    const toastId = toast.loading("Preparando Plano Alimentar para WhatsApp...");
    
    try {
      const pdfData = await getMealPlanPDFData(plan);
      const { buildPremiumMealPlanHTML } = await import("@/lib/pdfExportPremium");

      const html = buildPremiumMealPlanHTML(pdfData as any);
      const fileName = `meal-plan-${plan.id}-${Date.now()}.html`;
      const blob = new Blob([html], { type: "text/html" });
      
      const { error: uploadError } = await supabase.storage
        .from("shared-meal-plans")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("shared-meal-plans")
        .getPublicUrl(fileName);

      const message = `Olá ${profile?.full_name?.split(" ")[0]}! Aqui está seu plano alimentar FitJourney: ${publicUrl}`;
      
      const { buildWhatsAppUrl } = await import("@/utils/whatsappNotification");
      const whatsappUrl = buildWhatsAppUrl(profile?.phone || "", message);
      window.open(whatsappUrl, "_blank");
      
      toast.success("WhatsApp aberto com sucesso!", { id: toastId });
    } catch (err: any) {
      console.error("WhatsApp error:", err);
      toast.error("Erro ao preparar envio via WhatsApp", { id: toastId });
    } finally {
      setSendingWhatsAppId(null);
    }
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
          appUrl: `${PRODUCTION_URL}/auth`
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
          appUrl: `${PRODUCTION_URL}/auth`
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
      <div className="space-y-8 bg-[#0a0a0a] text-white min-h-screen p-4 md:p-8 rounded-3xl">
        {/* Smart Alerts */}
        <SmartAlertsBanner patientId={resolvedPatientId} onAction={(action) => setOpenSection(action)} />

        {/* SEÇÃO 1 — CABEÇALHO (DADOS VITAIS) */}
        <section className="bg-[#111] p-6 rounded-2xl border border-emerald-500/10 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} className="text-muted-foreground hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-emerald-500">
                  {((profile?.full_name || patientEmail || "P")[0]).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {profile?.full_name || patientEmail?.split("@")[0] || "Paciente"}
                  </h1>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {patientStatus === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                  {currentPrestigePlan && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500 gap-1 bg-amber-500/5">
                      <Crown className="w-3 h-3" /> {currentPrestigePlan.name}
                    </Badge>
                  )}
                </div>
                <p className="text-emerald-500/60 text-sm mt-1 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   Plano: {patientSubscription?.plan_name || "Premium"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 p-4 bg-black/40 rounded-xl border border-white/5">
              <div className="flex flex-col items-center px-4 border-r border-white/10">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">⚖️ Peso</span>
                <span className="text-lg font-bold">{(profile as any)?.current_weight_kg || (profile as any)?.weight || (anamnesis?.answers as any)?.weight || "—"} <span className="text-xs text-muted-foreground">kg</span></span>
              </div>
              <div className="flex flex-col items-center px-4 border-r border-white/10">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">📏 Altura</span>
                <span className="text-lg font-bold">{(profile as any)?.current_height_cm || (profile as any)?.height || (anamnesis?.answers as any)?.height || "—"} <span className="text-xs text-muted-foreground">cm</span></span>
              </div>
              <div className="flex flex-col items-center px-4 border-r border-white/10">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">🎯 Objetivo</span>
                <span className="text-sm font-bold text-emerald-500">{(profile as any)?.goal || (anamnesis?.answers as any)?.goal || "Emagrecimento"}</span>
              </div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">🏃 Atividade</span>
                <span className="text-sm font-bold">{(profile as any)?.activity_level || (anamnesis?.answers as any)?.activity_level || "Leve"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2 — AÇÕES RÁPIDAS (BOTÕES GRANDES, 2 COLUNAS) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-24 rounded-2xl border-emerald-500/20 bg-[#111] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-white flex items-center justify-start px-6 gap-4 group transition-all"
            onClick={() => navigate(`/editor-v3/${resolvedPatientId}`)}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold">🧬 EDITOR V3</span>
              <span className="text-xs text-muted-foreground">Prescrição Nutricional Premium</span>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 rounded-2xl border-emerald-500/20 bg-[#111] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-white flex items-center justify-start px-6 gap-4 group transition-all"
            onClick={() => navigate(`/in-office/${resolvedPatientId}`)}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Stethoscope className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold">🏥 MODO CONSULTÓRIO</span>
              <span className="text-xs text-muted-foreground">Atendimento em tempo real</span>
            </div>
          </Button>

          <Button 
            variant="outline" 
            className="h-24 rounded-2xl border-emerald-500/20 bg-[#111] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-white flex items-center justify-start px-6 gap-4 group transition-all"
            onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Activity className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold">📋 AVALIAÇÃO FÍSICA</span>
              <span className="text-xs text-muted-foreground">Antropometria e Composição</span>
            </div>
          </Button>

          <div className="h-24 rounded-2xl border border-emerald-500/20 bg-[#111] flex items-center justify-between px-6 gap-4">
             <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold text-white">📊 RELATÓRIO PDF</span>
                <span className="text-xs text-muted-foreground">Exportação completa do perfil</span>
              </div>
             </div>
             {patientId && <PatientEvolutionPDF patientId={resolvedPatientId} patientName={profile?.full_name || "Paciente"} />}
          </div>
        </section>

        {/* SEÇÃO 3 — PLANOS ALIMENTARES */}
        <section className="bg-[#111] p-6 rounded-2xl border border-emerald-500/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-500" /> PLANOS ALIMENTARES
            </h2>
            <Button 
              onClick={() => navigate(`/editor-v3/${resolvedPatientId}`)}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-9"
            >
              <Plus className="w-4 h-4 mr-2" /> NOVO PLANO
            </Button>
          </div>
          
          <div className="space-y-3">
            {mealPlans && mealPlans.length > 0 ? (
              mealPlans.slice(0, 3).map((plan: any) => (
                <div key={plan.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 transition-all gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className={`w-3 h-3 rounded-full ${plan.is_active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
                    <div>
                      <p className="font-bold text-sm">
                        {plan.title || "Plano Sem Título"}
                        {plan.is_active && <span className="ml-2 text-[10px] text-emerald-500 uppercase tracking-widest">Ativo</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {new Date(plan.created_at).toLocaleDateString("pt-BR")} • {plan.plan_mode === 'weekly' ? 'Semanal' : 'Diário'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs font-bold hover:bg-emerald-500/10 hover:text-emerald-500"
                      onClick={() => handlePreviewPDF(plan)}
                    >
                      VISUALIZAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs font-bold bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/20"
                      onClick={() => navigate(`/editor-v3/${resolvedPatientId}?planId=${plan.id}`)}
                    >
                      EDITAR NO V3
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#111] border-emerald-500/20 text-white">
                        <DropdownMenuItem onClick={() => handleSendWhatsApp(plan)} className="hover:bg-emerald-500/10">
                          <MessageSquare className="w-4 h-4 mr-2" /> Enviar WhatsApp
                        </DropdownMenuItem>
                        {plan.is_active && (
                          <DropdownMenuItem onClick={handleMarkWithoutDiet} className="text-red-500 hover:bg-red-500/10">
                            <UtensilsCrossed className="w-4 h-4 mr-2" /> Deixar sem dieta
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-black/20 rounded-xl border-2 border-dashed border-white/5">
                <p className="text-muted-foreground text-sm italic">Nenhum plano alimentar criado para este paciente.</p>
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 4 — FERRAMENTAS (BOTÕES MENORES, 3-4 COLUNAS) */}
        <section className="space-y-4">
          <h3 className="text-xs text-muted-foreground font-bold uppercase tracking-widest px-1">Ferramentas de Suporte</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {patientId && (
              <UnblockPatientDialog
                patientId={resolvedPatientId}
                patientName={profile?.full_name ?? undefined}
              />
            )}
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-white/10 bg-[#111] hover:bg-white/5 text-xs font-bold gap-2"
              onClick={() => navigate(`/diet-templates?patientId=${patientId}`)}
            >
              <ChefHat className="w-4 h-4 text-emerald-500" /> Modelos
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-white/10 bg-[#111] hover:bg-white/5 text-xs font-bold gap-2"
              onClick={() => navigate(`/anamnesis?patientId=${patientId}`)}
            >
              <Heart className="w-4 h-4 text-emerald-500" /> Anamnese
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-white/10 bg-[#111] hover:bg-white/5 text-xs font-bold gap-2"
              onClick={handleSmartReleaseOnboarding}
            >
              <Rocket className="w-4 h-4 text-emerald-500" /> Liberar Onboarding
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-xl border-white/10 bg-[#111] hover:bg-white/5 text-xs font-bold gap-2"
              onClick={() => setOpenSection("projects")}
            >
              <FileText className="w-4 h-4 text-emerald-500" /> Protocolo
            </Button>
            
            {/* Opções Secundárias em Dropdown para manter limpo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-[#111] hover:bg-white/5 text-xs font-bold gap-2">
                  <UserCog className="w-4 h-4 text-zinc-500" /> Opções
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white w-56">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <UserCog className="w-4 h-4 mr-2 text-emerald-500" /> Configuração do Paciente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenSection("audit-log")}>
                  <Shield className="w-4 h-4 mr-2" /> Auditoria Motor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActivateOpen(true)}>
                  <Play className="w-4 h-4 mr-2" /> Ativar Protocolo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlanOpen(true)}>
                  <CreditCard className="w-4 h-4 mr-2" /> Gerenciar Assinatura
                </DropdownMenuItem>
                <DropdownMenuItem onClick={togglePatientStatus}>
                  <Power className="w-4 h-4 mr-2" /> {patientStatus === "active" ? "Desativar" : "Ativar"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deletePatient} className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Paciente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </section>

        {/* SEÇÃO 5 — ABAS (NAVEGAÇÃO) */}
        <section className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
          <Tabs defaultValue="overview" className="w-full" onValueChange={(v) => setOpenSection(v)}>
            <TabsList className="w-full flex flex-wrap h-auto bg-black/40 border-b border-white/5 p-1">
              <TabsTrigger value="checklist" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <ListChecks className="w-4 h-4" /> Checklist
              </TabsTrigger>
              <TabsTrigger value="assessment" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Activity className="w-4 h-4" /> Avaliação
              </TabsTrigger>
              <TabsTrigger value="agenda" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Calendar className="w-4 h-4" /> Agenda
              </TabsTrigger>
              <TabsTrigger value="recipes" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <ChefHat className="w-4 h-4" /> Receitas
              </TabsTrigger>
              <TabsTrigger value="feedbacks" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <MessageSquare className="w-4 h-4" /> Feedbacks
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Clock className="w-4 h-4" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="protocols" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <FileText className="w-4 h-4" /> Protocolos
              </TabsTrigger>
              <TabsTrigger value="calculators" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Calculator className="w-4 h-4" /> Calculadoras
              </TabsTrigger>
              <TabsTrigger value="lab-exams" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Search className="w-4 h-4" /> Exames
              </TabsTrigger>
              <TabsTrigger value="onboarding" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Zap className="w-4 h-4" /> Onboarding
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <Eye className="w-4 h-4" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger value="plan" className="flex-1 min-w-[100px] gap-2 py-3 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                <CreditCard className="w-4 h-4" /> Plano
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="checklist">
                <PatientChecklistView patientId={resolvedPatientId} />
              </TabsContent>
              <TabsContent value="assessment">
                <BodyEvolutionCard patientId={resolvedPatientId} />
                <div className="mt-6">
                   <ConsultationCompare patientId={resolvedPatientId} />
                </div>
              </TabsContent>
              <TabsContent value="agenda">
                <PatientAgenda patientId={resolvedPatientId} />
              </TabsContent>
              <TabsContent value="recipes">
                <div className="text-center py-20 text-muted-foreground italic">Seção de receitas em construção...</div>
              </TabsContent>
              <TabsContent value="feedbacks">
                <PatientFeedbacksPanel patientId={resolvedPatientId} />
              </TabsContent>
              <TabsContent value="timeline">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-500" /> Linha do Tempo
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)} className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10">
                      Nova Nota
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {timeline && timeline.length > 0 ? (
                        timeline.map((event: any, idx: number) => {
                          const Config = eventTypeConfig[event.event_type] || eventTypeConfig.note;
                          return (
                            <div key={idx} className="relative pl-6 border-l border-emerald-500/20 py-1">
                              <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-bold text-sm">{event.title}</p>
                                  <span className="text-[10px] text-muted-foreground">{new Date(event.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-10 text-muted-foreground italic">Nenhum evento registrado na timeline.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
              <TabsContent value="overview">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MetabolicRadar anamnesis={anamnesis} />
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
                      size="lg"
                    />
                    <div className="md:col-span-2">
                       <ClinicalFlagsSummary patientId={resolvedPatientId} />
                    </div>
                    <div className="md:col-span-2 space-y-8">
                       <MealAdherenceWidget patientId={resolvedPatientId} />
                       <PatientProfileMealPlan 
                         patientId={resolvedPatientId} 
                         activeMealPlanId={activeMealPlan?.id} 
                       />
                    </div>
                 </div>
              </TabsContent>
              <TabsContent value="protocols">
                <div className="space-y-4">
                  {patientProtocols.map((pp: any) => (
                    <div key={pp.id} className="p-4 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{pp.protocol_title}</p>
                        <p className="text-xs text-muted-foreground">Início: {new Date(pp.start_date).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={pp.status === "active" ? "default" : "secondary"}>{pp.status}</Badge>
                    </div>
                  ))}
                  <Button className="w-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" onClick={() => setActivateOpen(true)}>
                    Ativar Novo Protocolo
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="calculators">
                <PatientCalculators />
              </TabsContent>
              <TabsContent value="lab-exams">
                <PatientLabExams patientId={resolvedPatientId} />
              </TabsContent>
              <TabsContent value="onboarding">
                <div className="glass p-6 rounded-xl border-warning/20">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-warning" /> Status do Onboarding</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                      <span>Status Atual:</span>
                      <Badge variant="outline" className="border-warning/50 text-warning">{journeyStatus}</Badge>
                    </div>
                    <Button variant="outline" className="w-full border-warning/30 text-warning hover:bg-warning/10" onClick={handleSmartReleaseOnboarding}>
                      Reiniciar / Liberar Onboarding
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="plan">
                <div className="glass p-6 rounded-xl border-emerald-500/20">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-500" /> Detalhes do Plano</h3>
                  <div className="space-y-4">
                    {patientSubscription ? (
                      <>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Nome do Plano:</span>
                          <span className="font-bold">{patientSubscription.plan_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Início:</span>
                          <span>{new Date(patientSubscription.started_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-muted-foreground">Expiração:</span>
                          <span>{patientSubscription.expires_at ? new Date(patientSubscription.expires_at).toLocaleDateString() : "Sem expiração"}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Nenhum plano ativo encontrado.</p>
                    )}
                    <Button className="w-full bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20" onClick={() => setPlanOpen(true)}>
                      Editar Plano / Assinatura
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </section>

        {/* MODALS & DIALOGS */}
        <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
          <DialogContent className="bg-[#111] border-emerald-500/20 text-white">
            <DialogHeader><DialogTitle className="text-white">Ativar Protocolo</DialogTitle></DialogHeader>
            <form onSubmit={activateProtocol} className="space-y-4">
              <div>
                <Label className="text-zinc-400">Protocolo</Label>
                <Select value={activateForm.protocol_id} onValueChange={(v) => setActivateForm({ ...activateForm, protocol_id: v })}>
                  <SelectTrigger className="bg-black/40 border-white/10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    {protocols.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="ghost" onClick={() => setActivateOpen(false)} className="text-zinc-400">Cancelar</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Ativar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent className="bg-[#111] border-emerald-500/20 text-white">
            <DialogHeader><DialogTitle className="text-white">Gerenciar Assinatura</DialogTitle></DialogHeader>
            <form onSubmit={savePlan} className="space-y-4">
              <div>
                <Label className="text-zinc-400">Plano</Label>
                <Input value={planForm.plan_name} onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })} className="bg-black/40 border-white/10" />
              </div>
              <div>
                <Label className="text-zinc-400">Valor (R$)</Label>
                <Input type="number" value={planForm.value} onChange={(e) => setPlanForm({ ...planForm, value: e.target.value })} className="bg-black/40 border-white/10" />
              </div>
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Salvar Alterações</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent className="bg-[#111] border-emerald-500/20 text-white">
            <DialogHeader><DialogTitle className="text-white">Adicionar Nota na Timeline</DialogTitle></DialogHeader>
            <form onSubmit={addTimelineNote} className="space-y-4">
              <Input placeholder="Título da nota" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} className="bg-black/40 border-white/10" />
              <Textarea placeholder="Descrição..." value={noteForm.description} onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })} className="bg-black/40 border-white/10 min-h-[100px]" />
              <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Salvar Nota</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Sub-modals from Sections */}
        <Dialog open={openSection === "audit-log"} onOpenChange={(v) => !v && setOpenSection(null)}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto bg-[#111] border-emerald-500/20 text-white">
            <DialogHeader><DialogTitle className="text-white">Auditoria de Decisão Clínica</DialogTitle></DialogHeader>
            {patientId && <DeterministicAuditLog patientId={resolvedPatientId} />}
          </DialogContent>
        </Dialog>

        <Dialog open={openSection === "projects"} onOpenChange={(v) => !v && setOpenSection(null)}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-[#111] border-emerald-500/20 text-white">
            <DialogHeader><DialogTitle className="text-white font-display flex items-center gap-2"><Rocket className="w-5 h-5 text-emerald-500" /> Projetos & Governança</DialogTitle></DialogHeader>
            {patientId && (
              <PatientProjectGovernance
                patientId={resolvedPatientId}
                isProfessionalView={true}
                onProtocolChanged={invalidate}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Onboarding Release Dialog */}
        {/* Patient Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-emerald-500/20 text-white p-0">
            <div className="sticky top-0 z-10 bg-[#0a0a0a] p-6 border-b border-white/5">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-emerald-500" /> Configuração do Paciente
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Dados Cadastrais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Nome Completo</Label>
                    <Input 
                      value={editProfileForm.full_name} 
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, full_name: e.target.value })} 
                      className="bg-black/40 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Telefone / WhatsApp</Label>
                    <Input 
                      value={editProfileForm.phone} 
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })} 
                      className="bg-black/40 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Objetivo</Label>
                    <Input 
                      value={editProfileForm.goal} 
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, goal: e.target.value })} 
                      className="bg-black/40 border-white/10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">E-mail</Label>
                    <Input 
                      value={editProfileForm.email} 
                      disabled 
                      className="bg-black/20 border-white/10 text-zinc-500 opacity-60 cursor-not-allowed" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Notas Internas</Label>
                  <Textarea 
                    value={editProfileForm.notes} 
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, notes: e.target.value })} 
                    className="bg-black/40 border-white/10 min-h-[100px]" 
                  />
                </div>
                <Button type="submit" disabled={savingProfile} className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                  {savingProfile ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>

              <div className="h-px bg-white/5" />

              {/* Consent Terms Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">LGPD & Consentimento</h3>
                <ClinicalConsentViewer />
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
