import { useEffect, useState, useMemo, useCallback } from "react";
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
import ExperienceModeStatusSection from "@/components/dashboard/ExperienceModeStatusSection";
import ClinicalMessagesWidget from "@/components/patient/ClinicalMessagesWidget";
import {
  Rocket, CalendarDays, Bell, TrendingUp, CheckCircle2,
  UtensilsCrossed, Trophy, Target as TargetIcon, Dumbbell, Flame, ArrowRight, Clock, Users,
  AlertTriangle, RefreshCw, Zap, AlertCircle, MessageSquare, ChevronRight
} from "lucide-react";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PlanRequestButton from "@/components/patient/PlanRequestButton";
import { safeNum, fmtMacro } from "@/lib/formatMacros";
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
import ExperienceModeSwitcher from "@/components/settings/ExperienceModeSwitcher";
import { usePatientLifecycleState } from "@/hooks/usePatientLifecycleState";
import { usePatientJourneyStatus, IS_FLUID_STATE } from "@/hooks/usePatientJourneyStatus";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import OnboardingGateScreen from "@/components/patient/OnboardingGateScreen";
import PatientDailyFocusHero from "@/components/patient/PatientDailyFocusHero";
import TherapeuticMomentumBar from "@/components/patient/TherapeuticMomentumBar";
import ClinicalInsightsCard from "@/components/patient/ClinicalInsightsCard";
import PatientMetabolicInsightPanel from "@/components/patient/PatientMetabolicInsightPanel";
import PatientBehaviorLearningCard from "@/components/patient/PatientBehaviorLearningCard";
import NextMealWidget from "@/components/patient/NextMealWidget";
import PatientAIInsightsWidget from "@/components/patient/PatientAIInsightsWidget";
import { PatientIntelligenceBanner } from "@/components/premium/PremiumBanners";
import MyTeamTab from "@/components/patient/MyTeamTab";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { usePageState } from "@/hooks/usePageState";
import { SafeRender } from "@/components/common/SafeRender";
import { StabilityZone } from "@/components/common/StabilityZone";
import { useEngagement } from "@/hooks/useEngagement";
import DailyEngagementProgress from "@/components/patient/engagement/DailyEngagementProgress";
import AdherenceStats from "@/components/patient/engagement/AdherenceStats";
import MealCheckinCard from "@/components/patient/engagement/MealCheckinCard";
import RetentionAlert from "@/components/patient/engagement/RetentionAlert";
import AchievementBadges from "@/components/patient/engagement/AchievementBadges";

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

export default function ClientDashboard() {
  const { user, profile, isPatient } = useAuth();
  const page = usePageState({ initialStatus: "loading" });
  
  const handleSupabaseError = (error: any, context: string) => {
    console.error(`[Dashboard Error] ${context}:`, error);
    if (error.code === 'PGRST116' || error.message?.includes('Permission denied')) {
      toast.error(`Acesso negado ao carregar ${context}. Verifique seu vínculo profissional.`);
    }
  };
  const { mode, isLoading, failedMode, retryLastMode } = useExperienceMode();
  const lifecycle = usePatientLifecycleState();
  const { stats, checkins } = useEngagement();
  const { status: journeyStatus, loading: journeyLoading, canAccessOnboarding } = usePatientJourneyStatus();
  const navigate = useNavigate();
  const [programJoinOpen, setProgramJoinOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Schema consistency check: detect plans with missing/zero macros
  const hasInconsistentPlan = lifecycle.showPlan && 
    (safeNum(lifecycle.plan?.total_calories) === 0 && (lifecycle.planId));

  const { data: dashData, isLoading: queryLoading, isError: queryError, error: queryErrorObj } = useQuery({
    queryKey: ["client-dashboard", user?.id],
    enabled: !!user,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const today = format(new Date(), "yyyy-MM-dd");

      const [programsRes, biquiniRes, workoutRes] = await Promise.all([
        supabase
          .from("program_patients")
          .select("program_id, current_phase, status, enrolled_at, joined_at, programs(id, title, tag, start_date)")
          .eq("patient_id", userId)
          .eq("status", "active"),
        supabase
          .from("program_enrollments")
          .select("*")
          .eq("patient_id", userId)
          .not("status", "eq", "completed")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("personal_trainer_students")
          .select("id")
          .eq("student_id", userId)
          .eq("status", "active")
          .limit(1)
      ]);

      let workoutInfo: WorkoutInfo = { planTitle: "", routineCount: 0, recentCompletions: [], hasPersonal: false };
      if (workoutRes.data && workoutRes.data.length > 0) {
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

      return {
        programs: (programsRes.data || []).map((p: any) => ({
          id: p.programs?.id || p.program_id,
          title: p.programs?.title || "Programa",
          tag: p.programs?.tag || "",
          current_phase: p.current_phase,
        })),
        biquiniEnrollment: biquiniRes.data?.[0] || null,
        workoutInfo,
      };
    },
  });

  const programs = dashData?.programs || [];
  const biquiniEnrollment = dashData?.biquiniEnrollment || null;
  const workoutInfo = dashData?.workoutInfo || { planTitle: "", routineCount: 0, recentCompletions: [], hasPersonal: false };

  useEffect(() => {
    if (!queryLoading && !journeyLoading && !isLoading) {
      if (queryError) page.setPageError(queryErrorObj);
      else page.setReady();
    }
  }, [queryLoading, journeyLoading, isLoading, queryError, queryErrorObj, page]);

  useEffect(() => {
    if (biquiniEnrollment?.status === "pending_onboarding") setShowOnboarding(true);
  }, [biquiniEnrollment]);

  const onboarding = useOnboardingGuard();
  const isFluid = journeyStatus ? IS_FLUID_STATE(journeyStatus) : true;
  const shouldBlock = isPatient && !journeyLoading && journeyStatus && !isFluid;

  if (page.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <BrainLoaderCard text="Carregando seu painel clínico…" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SafeRender name="Conteúdo do Dashboard" data={[user, profile, dashData]}>
        {shouldBlock ? (
          <div className="max-w-7xl mx-auto px-4 py-12">
            <OnboardingGateScreen status={journeyStatus!} />
          </div>
        ) : (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <ExperienceModeSwitcher />
            </div>
            <OnboardingProgressModal />
            <OnboardingExitGuard />
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 md:space-y-6 px-1 md:px-0 overflow-hidden pb-12">
              
              {/* Premium Header */}
              <motion.div variants={item}>
                <PremiumCardWrapper className="relative overflow-hidden rounded-2xl gradient-border particles-bg" enableShimmer>
                  <div className="glass-premium rounded-2xl p-4 md:p-6 shimmer-sweep">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="flex items-center gap-2">
                          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">
                            Olá, {profile?.full_name?.split(" ")[0] || "Paciente"} 👋
                          </h1>
                          <PremiumBadge />
                        </div>
                        <PremiumAccentLine />
                      </div>
                    </div>
                  </div>
                </PremiumCardWrapper>
              </motion.div>

              {/* Patient Engagement Central (Check-ins + Progress) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Unified Focus Entry */}
                  <motion.div variants={item}>
                    <PatientDailyFocusHero />
                  </motion.div>

                  {/* Daily Meal Tracker */}
                  <motion.div variants={item}>
                    <Card className="border-border/50 bg-card/40 backdrop-blur-md overflow-hidden relative group shadow-sm">
                      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <UtensilsCrossed className="w-24 h-24" />
                      </div>
                      <CardHeader className="pb-4 border-b border-border/10">
                        <DailyEngagementProgress 
                          completed={checkins?.length || 0} 
                          total={lifecycle.plan?.meals?.length || 0} 
                        />
                      </CardHeader>
                      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lifecycle.plan?.meals?.map((meal: any, idx: number) => (
                          <MealCheckinCard 
                            key={meal.id || idx}
                            mealId={meal.id || String(idx)}
                            title={meal.title || "Refeição"}
                            time={meal.time || "--:--"}
                            kcal={safeNum(meal.calories_target)}
                          />
                        ))}
                        {(!lifecycle.plan?.meals || lifecycle.plan.meals.length === 0) && (
                          <div className="col-span-full text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                             <UtensilsCrossed className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                             <p className="text-sm text-muted-foreground">Seu profissional ainda está preparando suas refeições.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Clinical & Behavioral Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={item} className="h-full">
                      <ClinicalInsightsCard />
                    </motion.div>
                    <motion.div variants={item} className="h-full">
                      <PatientBehaviorLearningCard />
                    </motion.div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {/* Adherence & Streaks */}
                  <motion.div variants={item}>
                    <AdherenceStats 
                      streak={stats?.current_streak || 0} 
                      adherence={stats?.weekly_adherence_pct || 0} 
                    />
                  </motion.div>

                  {/* Next Meal Shortcut */}
                  <motion.div variants={item}>
                    <NextMealWidget />
                  </motion.div>

                  {/* Momentum Indicator */}
                  <motion.div variants={item}>
                    <TherapeuticMomentumBar />
                  </motion.div>

                  {/* Metabolic Radar */}
                  <motion.div variants={item}>
                    <PatientMetabolicInsightPanel />
                  </motion.div>

                  {/* Smart Tips */}
                  <motion.div variants={item}>
                    <SmartTips />
                  </motion.div>
                </div>
              </div>

              {/* Secondary Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                 <motion.div variants={item}>
                   <SubscriptionCard />
                 </motion.div>
                 <motion.div variants={item}>
                    <NutritionistStatusBanner patientId={user?.id} />
                 </motion.div>
                 <motion.div variants={item}>
                    <PatientAIInsightsWidget />
                 </motion.div>
              </div>

              {/* Team & Programs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={item}>
                  <Card className="glass-premium overflow-hidden border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <h3 className="font-display font-bold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> Meu Time Profissional
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <MyTeamTab />
                    </CardContent>
                  </Card>
                </motion.div>

                {programs.length > 0 && (
                  <motion.div variants={item}>
                    <Card className="glass-premium overflow-hidden border-border/50">
                      <CardHeader>
                        <h3 className="font-display font-bold text-lg flex items-center gap-2">
                          <Rocket className="w-5 h-5 text-accent" /> Projetos em Andamento
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {programs.map(p => (
                          <div key={p.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.tag} • Fase {p.current_phase || 1}</p>
                            </div>
                            <Button size="sm" variant="ghost" className="rounded-full">Ver mais</Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

            </motion.div>
          </>
        )}
      </SafeRender>
      <PhaseTransitionModal />
      <ProgramJoinRequest open={programJoinOpen} onOpenChange={setProgramJoinOpen} />
    </DashboardLayout>
  );
}
