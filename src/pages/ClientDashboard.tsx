import { useEffect, useState, useMemo } from "react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePremiumPresence } from "@/hooks/usePremiumPresence";
import { PremiumBadge, PremiumMessage, PremiumCardWrapper, PremiumAccentLine } from "@/components/premium";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import SmartTips from "@/components/patient/SmartTips";
import { BrainLoaderCard } from "@/components/common/BrainLoader";
import BehavioralTasksWidget from "@/components/patient/BehavioralTasksWidget";
import ClinicalMessagesWidget from "@/components/patient/ClinicalMessagesWidget";
import {
  Rocket, CalendarDays, Bell, TrendingUp, CheckCircle2,
  UtensilsCrossed, Trophy, Target, Dumbbell, Flame, ArrowRight, Clock, Users,
  AlertTriangle, RefreshCw, Zap, AlertCircle, MessageSquare
} from "lucide-react";
import RankingWidget from "@/components/prestige/RankingWidget";
import ExplorerProgressWidget from "@/components/dashboard/ExplorerProgressWidget";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PlanRequestButton from "@/components/patient/PlanRequestButton";
import { safeNum } from "@/lib/formatMacros";
import WorkoutRequestButton from "@/components/patient/WorkoutRequestButton";
import NutritionistStatusBanner from "@/components/chat/NutritionistStatusBanner";
import ProgramJoinRequest from "@/components/patient/ProgramJoinRequest";
import SubscriptionCard from "@/components/patient/SubscriptionCard";
import PixPaymentSection from "@/components/patient/PixPaymentSection";
import { Button } from "@/components/ui/button";
import PhaseTransitionModal from "@/components/biquini/PhaseTransitionModal";
import OnboardingProgressModal from "@/components/patient/OnboardingProgressModal";
import BiquiniEnrollmentStatus from "@/components/biquini/BiquiniEnrollmentStatus";
import BiquiniOnboardingWizard from "@/components/biquini/BiquiniOnboardingWizard";
import OnboardingExitGuard from "@/components/onboarding/OnboardingExitGuard";
import { DailyMissionsWidget } from "@/components/gamification/DailyMissionsWidget";
import { AdherenceEvolutionChart } from "@/components/gamification/AdherenceEvolutionChart";
import { JourneyTimelineFeed } from "@/components/gamification/JourneyTimelineFeed";
import ExperienceModeSwitcher from "@/components/settings/ExperienceModeSwitcher";
import { MomentumIndicator } from "@/components/gamification/MomentumIndicator";
import { usePatientLifecycleState } from "@/hooks/usePatientLifecycleState";
import { usePatientJourneyStatus, IS_FLUID_STATE } from "@/hooks/usePatientJourneyStatus";
import OnboardingGateScreen from "@/components/patient/OnboardingGateScreen";
import PatientDailyFocusHero from "@/components/patient/PatientDailyFocusHero";
import SmartChecklistWidget from "@/components/patient/SmartChecklistWidget";
import TherapeuticMomentumBar from "@/components/patient/TherapeuticMomentumBar";
import ClinicalInsightsCard from "@/components/patient/ClinicalInsightsCard";
import PatientMetabolicInsightPanel from "@/components/patient/PatientMetabolicInsightPanel";
import PatientBehaviorLearningCard from "@/components/patient/PatientBehaviorLearningCard";
import NextMealWidget from "@/components/patient/NextMealWidget";
import PatientAIInsightsWidget from "@/components/patient/PatientAIInsightsWidget";
import { PatientIntelligenceBanner } from "@/components/premium/PremiumBanners";
import MyTeamTab from "@/components/patient/MyTeamTab";
interface ProgramInfo {
  id: string;
  title: string;
  tag: string;
  start_date: string;
  current_phase: number | null;
  status: string;
}

interface AppointmentInfo {
  id: string;
  title: string;
  appointment_date: string;
  status: string;
  appointment_type: string;
}

interface NotificationInfo {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
}

interface ChecklistStats {
  total: number;
  completed: number;
}

interface WorkoutInfo {
  planTitle: string;
  routineCount: number;
  recentCompletions: Array<{
    id: string;
    routine_name: string;
    completed_at: string;
    perceived_effort: number | null;
  }>;
  hasPersonal: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface BiquiniEnrollment {
  id: string;
  program_id: string;
  status: string;
  current_phase: number;
  blocked_reason: string | null;
  next_weight_due_at: string | null;
  next_full_review_due_at: string | null;
  initial_weight: number | null;
  initial_kcal_target: number | null;
  onboarding_completed_at: string | null;
  started_at: string;
}

export default function ClientDashboard() {
  const { user, profile, isPatient } = useAuth();
  
  const handleSupabaseError = (error: any, context: string) => {
    console.error(`[Dashboard Error] ${context}:`, error);
    if (error.code === 'PGRST116' || error.message?.includes('Permission denied')) {
      toast.error(`Acesso negado ao carregar ${context}. Verifique seu vínculo profissional.`);
    }
  };
  const { mode, isLoading, failedMode, retryLastMode } = useExperienceMode();
  const premium = usePremiumPresence();
  const lifecycle = usePatientLifecycleState();
  const { status: journeyStatus, loading: journeyLoading, canAccessOnboarding } = usePatientJourneyStatus();
  const navigate = useNavigate();
  const [programJoinOpen, setProgramJoinOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Schema consistency check: detect plans with missing/zero macros
  const hasInconsistentPlan = lifecycle.showPlan && 
    (safeNum(lifecycle.plan?.total_calories) === 0 && (lifecycle.planId));

  // Single React Query for all dashboard data — cached, deduped, auto-refreshed
  const { data: dashData, isLoading: loading } = useQuery({
    queryKey: ["client-dashboard", user?.id],
    enabled: !!user,
    staleTime: 30 * 1000, // 30s cache — prevents re-fetch on tab switch
    refetchInterval: 3 * 60 * 1000, // refresh every 3 min
    queryFn: async () => {
      const userId = user!.id;
      const today = format(new Date(), "yyyy-MM-dd");

      const fetchSafe = async (query: any, context: string) => {
        try {
          const { data, error } = await query;
          if (error) throw error;
          return { data };
        } catch (e) {
          handleSupabaseError(e, context);
          return { data: null };
        }
      };

      const [programsRes, appointmentsRes, notificationsRes, checklistRes] = await Promise.all([
        fetchSafe(supabase
          .from("program_patients")
          .select("program_id, current_phase, status, enrolled_at, joined_at, programs(id, title, tag, start_date)")
          .eq("patient_id", userId)
          .eq("status", "active"), "programas"),
        fetchSafe(supabase
          .from("patient_appointments")
          .select("id, title, appointment_date, status, appointment_type, created_at")
          .eq("patient_id", userId)
          .gte("appointment_date", new Date().toISOString())
          .order("appointment_date", { ascending: true })
          .limit(5), "agendamentos"),
        fetchSafe(supabase
          .from("notifications")
          .select("id, title, message, created_at, is_read, type")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8), "notificações"),
        fetchSafe(supabase
          .from("checklist_tasks")
          .select("id, completed, date, created_at")
          .eq("patient_id", userId)
          .eq("date", today), "checklist"),
      ]);

      const programs = (programsRes.data || []).map((p: any) => ({
        id: p.programs?.id || p.program_id,
        title: p.programs?.title || "Programa",
        tag: p.programs?.tag || "",
        start_date: p.programs?.start_date || "",
        current_phase: p.current_phase,
        status: p.status,
      }));

      // Fetch Biquíni enrollment
      const { data: enrollmentData } = await (supabase as any)
        .from("program_enrollments")
        .select("*")
        .eq("patient_id", userId)
        .not("status", "eq", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      // Fetch workout data
      let workoutInfo: WorkoutInfo = { planTitle: "", routineCount: 0, recentCompletions: [], hasPersonal: false };
      const { data: pts } = await supabase
        .from("personal_trainer_students")
        .select("id")
        .eq("student_id", userId)
        .eq("status", "active")
        .limit(1);
      if (pts && pts.length > 0) {
        const [plansRes, completionsRes] = await Promise.all([
          supabase
            .from("workout_plans")
            .select("title, workout_routines(id)")
            .eq("student_id", userId)
            .eq("is_active", true)
            .limit(1),
          supabase
            .from("workout_completions")
            .select("id, completed_at, perceived_effort, workout_routines(name)")
            .eq("student_id", userId)
            .order("completed_at", { ascending: false })
            .limit(3),
        ]);
        const plan = plansRes.data?.[0];
        workoutInfo = {
          hasPersonal: true,
          planTitle: plan?.title || "Treino",
          routineCount: (plan as any)?.workout_routines?.length || 0,
          recentCompletions: (completionsRes.data || []).map((c: any) => ({
            id: c.id,
            routine_name: c.workout_routines?.name || "Treino",
            completed_at: c.completed_at,
            perceived_effort: c.perceived_effort,
          })),
        };
      }

      const checklistData = checklistRes.data || [];
      return {
        programs,
        appointments: appointmentsRes.data || [],
        notifications: notificationsRes.data || [],
        checklistStats: {
          total: checklistData.length,
          completed: checklistData.filter((t: any) => t.completed).length,
        },
        biquiniEnrollment: enrollmentData?.[0] || null,
        workoutInfo,
      };
    },
  });

  const programs = dashData?.programs || [];
  const appointments = dashData?.appointments || [];
  const notifications = dashData?.notifications || [];
  const checklistStats = dashData?.checklistStats || { total: 0, completed: 0 };
  const biquiniEnrollment = dashData?.biquiniEnrollment || null;
  const workoutInfo = dashData?.workoutInfo || { planTitle: "", routineCount: 0, recentCompletions: [], hasPersonal: false };

  useEffect(() => {
    if (biquiniEnrollment?.status === "pending_onboarding") {
      setShowOnboarding(true);
    }
  }, [biquiniEnrollment]);

  const checklistPercent = checklistStats.total > 0
    ? Math.round((checklistStats.completed / checklistStats.total) * 100)
    : 0;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Telemetry: Log journey state to detect divergence and persist for debugging
  useEffect(() => {
    if (journeyStatus && !journeyLoading && user?.id) {
      const msg = `[Dashboard:Telemetry] Journey Status: ${journeyStatus} | canAccess: ${canAccessOnboarding}`;
      console.log(msg);
      
      // Persist telemetry in localized state for rapid debugging
      try {
        const key = `fj_journey_telemetry_${user.id}`;
        const history = JSON.parse(localStorage.getItem(key) || "[]");
        const entry = { status: journeyStatus, canAccess: canAccessOnboarding, at: new Date().toISOString() };
        // Keep last 10 events
        const newHistory = [entry, ...history].slice(0, 10);
        localStorage.setItem(key, JSON.stringify(newHistory));
      } catch (e) { /* ignore storage errors */ }
    }
  }, [journeyStatus, journeyLoading, canAccessOnboarding, user?.id]);

  // Mandatory block states only - using centralized logic
  const isFluid = IS_FLUID_STATE(journeyStatus!);
  
  // REDIRECT logic for non-fluid onboarding states (at-rest states that need gating)
  if (!journeyLoading && journeyStatus && !isFluid) {
    return <OnboardingGateScreen status={journeyStatus} />;
  }

  // AUTOMATIC REDIRECT: Ensure lead_created and awaiting_consent land on /consent immediately
  // avoiding any dashboard render in-between.
  useEffect(() => {
    if (!journeyLoading && journeyStatus && (journeyStatus === "lead_created" || journeyStatus === "awaiting_consent")) {
      console.log(`[Dashboard:AutoRedirect] Directing early onboarding state (${journeyStatus}) to /consent`);
      // Use window.location to force a clean break and avoid any potential React state zombie issues
      window.location.href = "/consent";
    }
  }, [journeyStatus, journeyLoading]);

  // Telemetry extraction helper for diagnostics
  const getTelemetryLogs = () => {
    try { return JSON.parse(localStorage.getItem(`fj_journey_telemetry_${user?.id}`) || "[]"); }
    catch { return []; }
  };

  if (loading || journeyLoading) {
    return (
      <DashboardLayout>
        <BrainLoaderCard text="Carregando seu painel clínico…" />
      </DashboardLayout>
    );
  }

    return (
    <DashboardLayout>
      {/* Telemetry Debug View (Only in Preview/Dev) */}
      {(window.location.hostname.includes("lovable") || window.location.hostname.includes("localhost")) && (
        <div className="hidden" data-testid="journey-telemetry">
           {JSON.stringify(getTelemetryLogs())}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ExperienceModeSwitcher />
      </div>
      <OnboardingProgressModal />
      <OnboardingExitGuard />
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 md:space-y-6 px-1 md:px-0 overflow-hidden">
        {/* Experience Mode Status Banner */}
        <motion.div variants={item}>
          <div className="flex flex-col gap-3">
            {isLoading && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-primary">Salvando suas preferências de experiência...</span>
              </div>
            )}
            
            {failedMode && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Não foi possível aplicar o modo {failedMode === 'pro' ? 'Completo' : failedMode === 'advanced' ? 'Avançado' : 'Simples'}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={retryLastMode}
                  className="h-8 text-[11px] border-destructive/30 hover:bg-destructive/10"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}

            {profile?.experience_mode_locked && profile?.experience_mode === 'basic' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-amber-700">Modo Restrito</p>
                    <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-700 px-1.5 py-0.5 rounded">
                      Básico
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sua conta está em modo de segurança. {profile?.unlock_date ? `A liberação do acesso completo está prevista para ${new Date(profile.unlock_date as string).toLocaleDateString()}.` : "Complete as atualizações pendentes para liberar outros modos."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Schema Inconsistency Alert */}
        {hasInconsistentPlan && (
          <motion.div variants={item}>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-600">Sincronização do plano pendente</p>
                <p className="text-xs text-amber-600/80 mt-0.5">
                  Seu plano alimentar foi gerado, mas os valores nutricionais ainda estão sendo calculados. 
                  Isso pode levar alguns instantes.
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-xs text-amber-600 font-bold mt-2"
                  onClick={() => lifecycle.refetch()}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Atualizar agora
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* WhatsApp Reminder Banner */}
        {isPatient && !profile?.whatsapp && (
          <motion.div variants={item}>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Adicione seu WhatsApp!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receba atualizações importantes e facilite o contato com seu profissional.
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="gradient-primary gap-2"
                onClick={() => navigate("/settings")}
              >
                Adicionar Agora
              </Button>
            </div>
          </motion.div>
        )}

        {/* Premium Header */}
        <motion.div variants={item}>
          <PremiumCardWrapper className="relative overflow-hidden rounded-2xl gradient-border particles-bg" enableShimmer>
            <div className="glass-premium rounded-2xl p-4 md:p-6 shimmer-sweep">
              <div className="flex items-center justify-between">
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-muted-foreground mb-1"
                  >
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </motion.p>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">
                      Olá, {profile?.full_name?.split(" ")[0] || "Paciente"} 👋
                    </h1>
                    <PremiumBadge />
                  </div>
                  <PremiumAccentLine />
                  <p className="text-muted-foreground text-sm mt-1">
                    Acompanhe seu progresso e mantenha seus hábitos em dia.
                  </p>
                  <PremiumMessage className="mt-1" />
                </div>
              </div>
            </div>
          </PremiumCardWrapper>
        </motion.div>

        {/* Biquíni Branco Enrollment */}
        {biquiniEnrollment && !showOnboarding && (
          <motion.div variants={item}>
            <BiquiniEnrollmentStatus
              enrollment={biquiniEnrollment}
              onSendWeight={() => {
                // TODO: open weight modal
              }}
              onSendPhotos={() => {
                // TODO: open photos modal
              }}
            />
          </motion.div>
        )}

        {/* Biquíni Branco Onboarding */}
        {showOnboarding && biquiniEnrollment && (
          <motion.div variants={item}>
            <Card className="glass shadow-card overflow-hidden border-pink-500/30">
              <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 p-4 text-white">
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  👙 Onboarding — Projeto Biquíni Branco
                </h3>
                <p className="text-sm text-white/80">Complete as etapas para ativar seu primeiro protocolo.</p>
              </div>
              <CardContent className="p-5">
                <BiquiniOnboardingWizard
                  programId={biquiniEnrollment.program_id}
                  enrollmentId={biquiniEnrollment.id}
                  onComplete={() => {
                    setShowOnboarding(false);
                    // Refresh enrollment
                    (supabase as any)
                      .from("program_enrollments")
                      .select("*")
                      .eq("id", biquiniEnrollment.id)
                      .maybeSingle()
                      .then(() => {
                        // Data will be refreshed on next query refetch
                      });
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 1️⃣ Daily Focus Hero — Top Priority */}
        <motion.div variants={item}>
          <PatientDailyFocusHero />
        </motion.div>

        {/* 2️⃣ Próxima Refeição */}
        <motion.div variants={item}>
          <NextMealWidget />
        </motion.div>

        {/* 3️⃣ Smart Checklist */}
        <motion.div variants={item}>
          <SmartChecklistWidget />
        </motion.div>

        {/* 4️⃣ Metabolic Insight Panel */}
        <motion.div variants={item}>
          <PatientMetabolicInsightPanel />
        </motion.div>

        {/* 5️⃣ Therapeutic Momentum */}
        <motion.div variants={item}>
          <TherapeuticMomentumBar />
        </motion.div>

        {/* Momentum Indicator */}
        <motion.div variants={item}>
          <MomentumIndicator variant="card" />
        </motion.div>

        {/* Nutritionist Status Banner */}
        <motion.div variants={item}>
          <NutritionistStatusBanner patientId={user?.id} />
        </motion.div>

        {/* Plan Status Banner — SSoT driven */}
        {lifecycle.showPlan && (
          <motion.div variants={item}>
            <Link to="/my-diet">
              <div className="glass-premium rounded-xl p-4 border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    ✅ Seu plano alimentar está disponível
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lifecycle.planTitle || "Plano personalizado"} • Toque para visualizar
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </Link>
          </motion.div>
        )}

        {lifecycle.showWaitingApproval && (
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  ⏳ Plano em revisão
                </p>
                <p className="text-xs text-muted-foreground">
                  Seu profissional está finalizando seu plano alimentar. Você será notificado assim que estiver pronto.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Subscription & Payment */}
        <motion.div variants={item} className="space-y-3">
          <SubscriptionCard />
          <PixPaymentSection />
        </motion.div>

        {/* Action Buttons — Hidden during early onboarding for fluid flow */}
        {journeyStatus !== "lead_created" && journeyStatus !== "awaiting_consent" && journeyStatus !== "onboarding_active" && (
          <motion.div variants={item} className="flex flex-wrap gap-2">
            <PlanRequestButton />
            <WorkoutRequestButton />
          </motion.div>
        )}
        <ProgramJoinRequest open={programJoinOpen} onOpenChange={setProgramJoinOpen} />
        <PhaseTransitionModal />

        {/* Quick Stats */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 overflow-hidden">
          {/* Ranking Widget */}
          <RankingWidget />

          {/* Participar de Projetos — destaque estilo Ranking */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProgramJoinOpen(true)}
            className="relative glass-premium rounded-xl p-4 cursor-pointer metric-glow h-full transition-all duration-300 shimmer-sweep"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">✨ Projetos</p>
                <p className="text-lg font-display font-bold">Participar</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </motion.button>

          <Link to="/checklist">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Checklist Hoje</p>
                  <p className="text-lg font-display font-bold counter-animate">{checklistStats.completed}/{checklistStats.total}</p>
                </div>
              </div>
              <Progress value={checklistPercent} className="mt-3 h-1.5" />
            </motion.div>
          </Link>

          <Link to="/my-diet">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Minha Dieta</p>
                  <p className="text-sm font-medium">Ver plano</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link to="/achievements">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Conquistas</p>
                  <p className="text-sm font-medium">Ver todas</p>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link to="/journey">
            <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info/15 to-info/5 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Progresso</p>
                  <p className="text-sm font-medium">Jornada</p>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Workout card - only if has personal trainer */}
          {workoutInfo.hasPersonal && (
            <Link to="/my-workouts">
              <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} className="glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep h-full border border-orange-500/20 hover:border-orange-400/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Meus Treinos</p>
                    <p className="text-sm font-medium">{workoutInfo.routineCount} rotinas</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}
        </motion.div>

        {/* Hero: Top Priority Task + Message */}
        <motion.div variants={item}>
          <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
            <div className="p-5 pb-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <Target className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base">Seu Foco Agora</h3>
                <p className="text-xs text-muted-foreground">Tarefas prioritárias para hoje</p>
              </div>
            </div>
            <div className="px-5 pb-4">
              <BehavioralTasksWidget compact />
            </div>
            <div className="px-5 pb-5">
              <ClinicalMessagesWidget channel="dashboard_highlight" limit={2} compact />
            </div>
          </div>
        </motion.div>

        {/* Daily Missions & Adherence Score */}
        <motion.div variants={item}>
          <DailyMissionsWidget />
        </motion.div>

        {/* Adherence Evolution Chart */}
        <motion.div variants={item}>
          <AdherenceEvolutionChart />
        </motion.div>

        {/* AI Insights Widget */}
        <motion.div variants={item}>
          <PatientAIInsightsWidget />
        </motion.div>

        {/* Patient Intelligence Banner */}
        <motion.div variants={item}>
          <PatientIntelligenceBanner />
        </motion.div>

        {/* Clinical Insights from Learning Engine */}
        <motion.div variants={item}>
          <ClinicalInsightsCard />
        </motion.div>

        {/* Behavior Learning */}
        <motion.div variants={item}>
          <PatientBehaviorLearningCard />
        </motion.div>

        {/* Journey Timeline Feed */}
        <motion.div variants={item}>
          <JourneyTimelineFeed compact />
        </motion.div>

        {/* Workout Section - integrated when patient has personal trainer */}
        {workoutInfo.hasPersonal && workoutInfo.recentCompletions.length > 0 && (
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center">
                    <Dumbbell className="w-4.5 h-4.5 text-orange-500" />
                  </div>
                  <h3 className="font-display font-semibold text-base">Treinos Recentes</h3>
                </div>
                <Link to="/my-workouts" className="text-xs text-primary hover:underline font-medium">
                  Ver todos →
                </Link>
              </div>
              <div className="px-5 pb-5 space-y-2">
                {workoutInfo.recentCompletions.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.routine_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.completed_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {c.perceived_effort && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        c.perceived_effort >= 8 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>
                        <Flame className="w-3 h-3" /> {c.perceived_effort}/10
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Meu Time - Multi-professional team */}
        <motion.div variants={item}>
          <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
            <div className="p-5 pb-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-base">Meu Time</h3>
            </div>
            <div className="px-5 pb-5">
              <MyTeamTab />
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Programs */}
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Rocket className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base">Projetos Ativos</h3>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum programa ativo no momento.</p>
                ) : (
                  programs.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-all"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.tag} • Fase {p.current_phase || 1}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Upcoming Appointments */}
          <motion.div variants={item}>
            <Link to="/appointments" className="block">
              <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep hover:border-accent/30 transition-all cursor-pointer">
                <div className="p-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                      <CalendarDays className="w-4.5 h-4.5 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold text-base">Próximas Consultas</h3>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="px-5 pb-5 space-y-3">
                  {appointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma consulta agendada. Toque para ver sua agenda.</p>
                  ) : (
                    appointments.slice(0, 4).map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-accent/20 transition-all"
                      >
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <CalendarDays className="w-4 h-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(a.appointment_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === "confirmed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {a.status === "confirmed" ? "Confirmada" : a.status === "scheduled" ? "Agendada" : a.status}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Explorer Progress */}
          <motion.div variants={item}>
            <ExplorerProgressWidget />
          </motion.div>

          {/* Smart Tips */}
          <motion.div variants={item}>
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success/15 to-success/5 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-success" />
                </div>
                <h3 className="font-display font-semibold text-base">Dicas Inteligentes</h3>
              </div>
              <div className="px-5 pb-5">
                <SmartTips />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item} className="md:col-span-2">
            <div className="glass-premium rounded-xl overflow-hidden shimmer-sweep">
              <div className="p-5 pb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 flex items-center justify-center">
                  <Bell className="w-4.5 h-4.5 text-warning" />
                </div>
                <h3 className="font-display font-semibold text-base">Notificações</h3>
                {unreadCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning/10 text-warning font-semibold">
                    {unreadCount} novas
                  </span>
                )}
              </div>
              <div className="px-5 pb-5 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {notifications.slice(0, 6).map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${
                          n.is_read ? "border-border/50 bg-muted/20 opacity-60" : "border-primary/20 bg-primary/5"
                        }`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "dd/MM 'às' HH:mm")}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
                {notifications.length > 6 && (
                  <Link to="/notifications" className="block text-xs text-primary text-center pt-2 hover:underline font-medium">
                    Ver todas as notificações
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
