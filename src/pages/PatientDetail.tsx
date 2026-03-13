import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
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
import DocumentUpload from "@/components/common/DocumentUpload";
import ClinicalDecisionSupport from "@/components/patient/ClinicalDecisionSupport";
import OnboardingApprovalQueue from "@/components/patient/OnboardingApprovalQueue";
import {
  ArrowLeft, User, Calendar, FileText, ListChecks, Play,
  Clock, Activity, Plus, MessageSquare, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Heart, Brain, BookOpen, Scale, Calculator, CalendarDays, CreditCard, Send, UtensilsCrossed, X, Maximize2, ChefHat, Upload, Power, Trash2, Stethoscope, Crown, UserCog, Pencil
} from "lucide-react";
import PrestigeBadge from "@/components/prestige/PrestigeBadge";
import PrestigeName from "@/components/prestige/PrestigeName";
import type { PrestigePlan } from "@/hooks/usePrestige";
import { usePatientDetail, useTogglePatientDetailStatus, useDeletePatientLink } from "@/hooks/queries/usePatientDetail";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { MissionCreator } from "@/components/gamification/MissionCreator";
import { SmartRecommendationsPanel } from "@/components/dashboard/SmartRecommendationsPanel";
import type { PatientSignals } from "@/components/dashboard/SmartRecommendationsPanel";

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // React Query hook
  const { data, isLoading, refetch } = usePatientDetail(patientId);
  const toggleStatusMutation = useTogglePatientDetailStatus();
  const deletePatientMutation = useDeletePatientLink();

  // Derived data from query
  const profile = data?.profile ?? null;
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
  const npId = data?.npId ?? null;
  const prestigePlans = data?.prestigePlans ?? [];
  const currentPrestigePlan = data?.currentPrestigePlan ?? null;
  const patientEmail = data?.patientEmail ?? "";

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
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Invalidation helper
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId ?? "") });
  };

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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editProfileForm.full_name.trim(),
          phone: editProfileForm.phone.trim() || null,
        })
        .eq("user_id", patientId);
      if (error) throw error;
      toast.success("Cadastro atualizado com sucesso!");
      setOpenSection(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar cadastro");
    }
    setSavingProfile(false);
  };

  const activateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;
    const { data, error } = await supabase.from("patient_protocols").insert({
      patient_id: patientId,
      protocol_id: activateForm.protocol_id,
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
    if (selectedPrestigePlanId) {
      await supabase.from("patient_prestige").delete().eq("patient_id", patientId);
      const { error: prestigeErr } = await supabase.from("patient_prestige").insert({
        patient_id: patientId,
        plan_id: selectedPrestigePlanId,
        assigned_by: user.id,
        is_active: true,
      });
      if (!prestigeErr) {
        const selectedPlan = prestigePlans.find(p => p.id === selectedPrestigePlanId);
        toast.success(`Prestígio ${selectedPlan?.name || ''} aplicado! ${selectedPlan?.badge_icon || ''}`, { duration: 3000 });
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
    });
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
        <SmartAlertsBanner patientId={patientId!} onAction={(action) => setOpenSection(action)} />
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {(profile?.full_name || "P")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {currentPrestigePlan ? (
                <PrestigeName name={profile?.full_name || "Paciente"} plan={currentPrestigePlan} className="font-display text-2xl font-bold" />
              ) : (
                <h1 className="font-display text-2xl font-bold">{profile?.full_name || "Paciente"}</h1>
              )}
              <Badge variant={patientStatus === "active" ? "default" : "secondary"}>
                {patientStatus === "active" ? "Ativo" : "Inativo"}
              </Badge>
              {currentPrestigePlan && <PrestigeBadge plan={currentPrestigePlan} allPlans={prestigePlans} size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Checklist hoje: {checklistStats.completed}/{checklistStats.total} tarefas •
              {patientProtocols.filter(p => p.status === "active").length} protocolos ativos
            </p>
          </div>
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
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/diet-templates?patientId=${patientId}`)}>
              <BookOpen className="w-4 h-4" /> Modelos de Dieta
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/anamnesis?patientId=${patientId}`)}>
              <Heart className="w-4 h-4" /> {anamnesis ? "Editar Anamnese" : "Preencher Anamnese"}
            </Button>
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
          </div>
        </div>

        {/* Section Cards Grid */}
        {(() => {
          const sections = [
            { key: "checklist", label: "Checklist", icon: ListChecks, color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
            { key: "overview", label: "Visão Geral", icon: AlertTriangle, color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
            { key: "ai-insights", label: "IA Insights", icon: Brain, color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
            { key: "assessment", label: "Avaliação Física", icon: Activity, color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
            { key: "agenda", label: "Agenda", icon: CalendarDays, color: "from-info/20 to-info/5", iconColor: "text-info" },
            { key: "calculators", label: "Calculadoras", icon: Calculator, color: "from-success/20 to-success/5", iconColor: "text-success" },
            { key: "timeline", label: "Timeline", icon: Clock, color: "from-muted-foreground/20 to-muted-foreground/5", iconColor: "text-muted-foreground" },
            { key: "plan", label: "Plano", icon: CreditCard, color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
            { key: "protocols", label: "Protocolos", icon: FileText, color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
            { key: "meal-plans", label: "Planos Alimentares", icon: UtensilsCrossed, color: "from-success/20 to-success/5", iconColor: "text-success" },
            { key: "radar", label: "Radar Metabólico", icon: TrendingUp, color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
            { key: "recipes", label: "Receitas", icon: ChefHat, color: "from-primary/20 to-accent/5", iconColor: "text-primary" },
            { key: "clinical-decision", label: "Decisão Clínica", icon: Stethoscope, color: "from-destructive/20 to-primary/5", iconColor: "text-destructive" },
            { key: "onboarding", label: "Onboarding", icon: Zap, color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
          ];

          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setOpenSection(s.key)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-gradient-to-br ${s.color} hover:shadow-md transition-all group cursor-pointer text-center`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                      <Maximize2 className="absolute top-2 right-2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Overview Modal */}
              <Dialog open={openSection === "overview"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Visão Geral</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-primary" /> Anamnese
                      </h3>
                      {anamnesis ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">TMB</span><span className="font-medium">{anamnesis.computed_tmb} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Meta calórica</span><span className="font-medium">{anamnesis.computed_kcal_target} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Proteína</span><span className="font-medium">{anamnesis.computed_protein}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Carboidratos</span><span className="font-medium">{anamnesis.computed_carbs}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Gorduras</span><span className="font-medium">{anamnesis.computed_fat}g</span></div>
                          <div className="pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Objetivo: {(anamnesis.answers as any)?.goal || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Anamnese não preenchida.</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* AI Insights Modal */}
              <Dialog open={openSection === "ai-insights"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">IA Insights</DialogTitle></DialogHeader>
                  <AnamnesisInsightsFull userId={patientId!} />
                </DialogContent>
              </Dialog>

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
                    <BodyEvolutionCard patientId={patientId!} />
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4">Comparativo entre Consultas</h3>
                      <ConsultationCompare patientId={patientId!} />
                    </div>
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-accent" /> Documentos da Avaliação
                      </h3>
                      <DocumentUpload patientId={patientId!} nutritionistId={user!.id} documentType="assessment" documents={assessmentDocs} onUploadComplete={invalidate} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Agenda Modal */}
              <Dialog open={openSection === "agenda"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Agenda</DialogTitle></DialogHeader>
                  <PatientAgenda patientId={patientId!} />
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
                  <DialogHeader><DialogTitle className="font-display">Timeline</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nota</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle className="font-display">Adicionar Nota</DialogTitle></DialogHeader>
                          <form onSubmit={addTimelineNote} className="space-y-4">
                            <div>
                              <Label>Tipo</Label>
                              <Select value={noteForm.event_type} onValueChange={(v) => setNoteForm({ ...noteForm, event_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="note">📝 Nota</SelectItem>
                                  <SelectItem value="alert">⚠️ Alerta</SelectItem>
                                  <SelectItem value="measurement">📏 Medição</SelectItem>
                                  <SelectItem value="achievement">🏆 Conquista</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Título</Label><Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} required /></div>
                            <div><Label>Descrição</Label><Textarea value={noteForm.description} onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })} /></div>
                            <Button type="submit" className="w-full gradient-primary">Salvar</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {timeline.length === 0 ? (
                      <div className="glass rounded-xl p-12 text-center">
                        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhum evento na timeline.</p>
                      </div>
                    ) : (
                      <div className="relative pl-8 space-y-4">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                        {timeline.map((event: any) => {
                          const config = eventTypeConfig[event.event_type] || eventTypeConfig.note;
                          const Icon = config.icon;
                          return (
                            <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                              <div className="absolute -left-5 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                                <Icon className={`w-3 h-3 ${config.color}`} />
                              </div>
                              <div className="glass rounded-xl p-4 ml-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{event.title}</h4>
                                  <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleDateString("pt-BR")}</span>
                                </div>
                                {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Plan Modal */}
              <Dialog open={openSection === "plan"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Plano</DialogTitle></DialogHeader>
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
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <Send className="w-5 h-5 text-primary" /> Agendar Feedback
                      </h3>
                      <form onSubmit={scheduleFeedback} className="space-y-3">
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
                          <Textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} rows={3} />
                        </div>
                        <Button type="submit" className="w-full gradient-primary gap-2">
                          <Send className="w-4 h-4" /> Agendar Feedback
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
                            const pid = selectedPrestigePlanId || currentPrestigePlan?.id || (prestigePlans.length > 0 ? prestigePlans[0].id : "");
                            if (pid) {
                              if (!selectedPrestigePlanId) setSelectedPrestigePlanId(pid);
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
                          <div><Label>Data Início</Label><Input type="date" value={planForm.started_at} onChange={(e) => setPlanForm({ ...planForm, started_at: e.target.value })} required /></div>
                          <div><Label>Data Fim</Label><Input type="date" value={planForm.expires_at} onChange={(e) => setPlanForm({ ...planForm, expires_at: e.target.value })} /></div>
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
                  <PatientChecklistView patientId={patientId!} editable={true} />
                </DialogContent>
              </Dialog>

              {/* Meal Plans Modal */}
              <Dialog open={openSection === "meal-plans"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Planos Alimentares</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center justify-end">
                      <Button onClick={() => { setOpenSection(null); navigate(`/meal-plans?patientId=${patientId}`); }} className="gradient-primary gap-2 shadow-glow">
                        <Plus className="w-4 h-4" /> Criar Plano
                      </Button>
                    </div>
                    {mealPlans.length === 0 ? (
                      <div className="glass rounded-xl p-12 text-center">
                        <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="font-display text-lg font-semibold mb-2">Nenhum plano alimentar</h3>
                        <p className="text-sm text-muted-foreground mb-4">Crie um plano alimentar para este paciente.</p>
                        <Button onClick={() => { setOpenSection(null); navigate(`/meal-plans?patientId=${patientId}`); }} className="gradient-primary">
                          <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Plano
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mealPlans.map((plan: any) => (
                          <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl overflow-hidden">
                            <div className="p-5 border-b border-border">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${plan.is_active ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                                  <div>
                                    <h3 className="font-display font-semibold">{plan.title}</h3>
                                    <p className="text-xs text-muted-foreground">
                                      {plan.is_active ? "Ativo" : "Inativo"} •
                                      Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
                                      {plan.end_date && ` • Fim: ${new Date(plan.end_date).toLocaleDateString("pt-BR")}`}
                                    </p>
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => { setOpenSection(null); navigate(`/meal-plans/${plan.id}`); }}>
                                  <FileText className="w-3.5 h-3.5 mr-1" /> Ver Plano
                                </Button>
                              </div>
                              {plan.description && <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>}
                            </div>
                            <div className="p-5 bg-secondary/20">
                              <PlanScheduler mealPlanId={plan.id} planTitle={plan.title} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-success" /> Documentos do Plano Alimentar
                      </h3>
                      <DocumentUpload patientId={patientId!} nutritionistId={user!.id} documentType="meal_plan" documents={mealPlanDocs} onUploadComplete={invalidate} />
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

              {/* Clinical Decision Support Modal */}
              <Dialog open={openSection === "clinical-decision"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Suporte à Decisão Clínica</DialogTitle></DialogHeader>
                  <ClinicalDecisionSupport patientId={patientId!} nutritionistId={user!.id} />
                  <div className="border-t border-border pt-6 space-y-4">
                    <SmartRecommendationsPanel signals={{
                      adherenceScore: 0,
                      adherenceTrend: 0,
                      streakDays: 0,
                      mealsPerDay: 0,
                      checklistPct: 0,
                    } as PatientSignals} />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Missions Modal */}
              <Dialog open={openSection === "missions"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Missões do Paciente</DialogTitle></DialogHeader>
                  <MissionCreator patientId={patientId!} patientName={profile?.full_name || undefined} />
                </DialogContent>
              </Dialog>

              {/* Onboarding Pipeline Modal */}
              <Dialog open={openSection === "onboarding"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Onboarding Automático</DialogTitle></DialogHeader>
                  <OnboardingApprovalQueue patientId={patientId!} patientName={profile?.full_name || "Paciente"} />
                </DialogContent>
              </Dialog>
            </>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
