import { Toaster } from "@/components/ui/toaster";
import { toast } from "sonner";
import UpdateBanner from "@/components/common/UpdateBanner";
import BuildStatusPanel from "@/components/dev/BuildStatusPanel";
import TextSourceInspector from "@/components/dev/TextSourceInspector";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TenantProvider, useTenant } from "@/lib/tenantContext";
import { supabase } from "@/integrations/supabase/client";
import { usePatientJourneyStatus, getUserRouteByStatus } from "@/hooks/usePatientJourneyStatus";
import { ExperienceModeContext, useExperienceModeState, useExperienceMode } from "@/hooks/useExperienceMode";
import { lazy, Suspense, useEffect, useState } from "react";
import { AppStateProvider } from "@/hooks/useAppState";
import { DegradedModeBanner } from "@/components/common/DegradedModeBanner";
import { OrphanUserBlock } from "@/components/common/OrphanUserBlock";

import { Helmet, HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { GlobalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import SafePage from "@/components/common/SafePage";
import PatientReadyGuard from "@/components/common/PatientReadyGuard";
import { CelebrationProvider } from "@/components/common/SuccessCelebration";
import PageLoader from "@/components/common/PageLoader";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";
import { NeuroEntryExperience } from "@/components/system-entry";
import { CommandPaletteProvider } from "@/components/common/CommandPalette";
import { readActiveEditorRoute } from "@/lib/mealPlanEditorStore";
import NeuralScreensaver from "@/components/common/NeuralScreensaver";
import FitIntelligenceAssistant from "@/components/intelligence/FitIntelligenceAssistant";
import IFJPatientCoach from "@/components/intelligence/modules/IFJPatientCoach";
import { installGlobalErrorHandlers } from "@/lib/monitoring";
import ExperienceRouteGuard from "@/components/common/ExperienceRouteGuard";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { initFeatureFlags } from "@/lib/featureFlags";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { usePaymentGuard } from "@/hooks/usePaymentGuard";
import { useOnboardingGuard, isOnboardingAllowedRoute } from "@/hooks/useOnboardingGuard";
import { MobileAutoFixer } from "@/components/common/MobileAutoFixer";

// ── Eager-loaded (critical path) ────────────────────────────
import GatewayPage from "./pages/GatewayPage";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import NotFound from "./pages/NotFound";

// ── Lazy-loaded pages ───────────────────────────────────────
const Index = lazy(() => import("./pages/Index"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Meals = lazy(() => import("./pages/Meals"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const PreviewPatient = lazy(() => import("./pages/PreviewPatient"));
const MealPlans = lazy(() => import("./pages/MealPlans"));
const PlanAudit = lazy(() => import("./pages/PlanAudit"));
// MealPlanEditor (legacy V1) removed — all plans now use V2
const MealPlanEditorV2 = lazy(() => import("./pages/MealPlanEditorV2"));
const MealPlanEditorV2Entry = lazy(() => import("./pages/MealPlanEditorV2Entry"));
const HybridPlanBuilder = lazy(() => import("./pages/HybridPlanBuilder"));
const Anamnesis = lazy(() => import("./pages/Anamnesis"));
const AnalyzeMeal = lazy(() => import("./pages/AnalyzeMeal"));
const Settings = lazy(() => import("./pages/Settings"));
const Protocols = lazy(() => import("./pages/Protocols"));
const Programs = lazy(() => import("./pages/Programs"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const BiquiniBrancoDetail = lazy(() => import("./pages/BiquiniBrancoDetail"));
const Checklist = lazy(() => import("./pages/Checklist"));
const DietTemplates = lazy(() => import("./pages/DietTemplates"));
const PhysicalAssessment = lazy(() => import("./pages/PhysicalAssessment"));
const Feedbacks = lazy(() => import("./pages/Feedbacks"));
const GlobalTips = lazy(() => import("./pages/GlobalTips"));
const Recipes = lazy(() => import("./pages/Recipes"));
const RecipeBuilder = lazy(() => import("./pages/RecipeBuilder"));
const ShoppingList = lazy(() => import("./pages/ShoppingList"));
const FoodDatabase = lazy(() => import("./pages/FoodDatabase"));
const BodyAnalysis = lazy(() => import("./pages/BodyAnalysis"));
const Branding = lazy(() => import("./pages/Branding"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Reports = lazy(() => import("./pages/Reports"));
const ClinicalIntelligence = lazy(() => import("./pages/ClinicalIntelligence"));
const Chat = lazy(() => import("./pages/Chat"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Landing = lazy(() => import("./pages/Landing"));
const WeeklyGoals = lazy(() => import("./pages/WeeklyGoals"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ImageFallbackAdmin = lazy(() => import("./pages/admin/ImageFallbackAdmin"));
const AdminFeatureControl = lazy(() => import("./pages/AdminFeatureControl"));
const AdminTestimonials = lazy(() => import("./pages/AdminTestimonials"));
const AdminSiteEditor = lazy(() => import("./pages/AdminSiteEditor"));
const AdminResourceCenter = lazy(() => import("./pages/AdminResourceCenter"));
const AutomationCenter = lazy(() => import("./pages/AutomationCenter"));
const WeightCalculator = lazy(() => import("./pages/WeightCalculator"));
const WaterCalculator = lazy(() => import("./pages/WaterCalculator"));
const HealthCheckQuiz = lazy(() => import("./pages/HealthCheckQuiz"));
const Journey = lazy(() => import("./pages/Journey"));
const Library = lazy(() => import("./pages/Library"));
const Financial = lazy(() => import("./pages/Financial"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));
const Supplements = lazy(() => import("./pages/Supplements"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PatientMealPlan = lazy(() => import("./pages/PatientMealPlan"));
const BiquiniBrancoLanding = lazy(() => import("./pages/BiquiniBrancoLanding"));
const PublicDemo = lazy(() => import("./pages/PublicDemo"));
const Checkin = lazy(() => import("./pages/Checkin"));
const CheckinPanel = lazy(() => import("./pages/CheckinPanel"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ImportPatients = lazy(() => import("./pages/ImportPatients"));
const AdminProfessionals = lazy(() => import("./pages/AdminProfessionals"));
const AdminBookingSettings = lazy(() => import("./pages/AdminBookingSettings"));
const AdminSubscriptionMonitor = lazy(() => import("./pages/AdminSubscriptionMonitor"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const PublicProgram = lazy(() => import("./pages/PublicProgram"));
const PublicPlans = lazy(() => import("./pages/PublicPlans"));
const IntakeOnboarding = lazy(() => import("./pages/IntakeOnboarding"));
const GrowthDashboard = lazy(() => import("./pages/GrowthDashboard"));
const MyPublicProfile = lazy(() => import("./pages/MyPublicProfile"));
const MyReferrals = lazy(() => import("./pages/MyReferrals"));
const GlobalRanking = lazy(() => import("./pages/GlobalRanking"));
const AdminPrestige = lazy(() => import("./pages/AdminPrestige"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AdminPatientFeatures = lazy(() => import("./pages/AdminPatientFeatures"));
const UserGuide = lazy(() => import("./pages/UserGuide"));
const ProfessionalGuide = lazy(() => import("./pages/ProfessionalGuide"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ClinicalHealthDashboard = lazy(() => import("./pages/ClinicalHealthDashboard"));
const Curiosidades = lazy(() => import("./pages/Curiosidades"));
const Planner = lazy(() => import("./pages/Planner"));
const OnboardingPipeline = lazy(() => import("./pages/OnboardingPipeline"));
const OnboardingTracker = lazy(() => import("./pages/OnboardingTracker"));
const AmbassadorDashboard = lazy(() => import("./pages/AmbassadorDashboard"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const PatientLanding = lazy(() => import("./pages/PatientLanding"));
const PatientRegister = lazy(() => import("./pages/PatientRegister"));
const Invitation = lazy(() => import("./pages/Invitation"));
const InvitationStatus = lazy(() => import("./pages/InvitationStatus"));
const AffiliateLanding = lazy(() => import("./pages/AffiliateLanding"));
const AdminLandingPages = lazy(() => import("./pages/AdminLandingPages"));
const QuickLink = lazy(() => import("./pages/QuickLink"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const AdminMenuConfig = lazy(() => import("./pages/AdminMenuConfig"));
const PersonalDashboard = lazy(() => import("./pages/PersonalDashboard"));
const PersonalStudents = lazy(() => import("./pages/PersonalStudents"));
const PersonalWorkouts = lazy(() => import("./pages/PersonalWorkouts"));
const PatientWorkouts = lazy(() => import("./pages/PatientWorkouts"));
const PersonalLanding = lazy(() => import("./pages/PersonalLanding"));
const FitnessAnamnesis = lazy(() => import("./pages/FitnessAnamnesis"));
const ClinicalRiskDashboard = lazy(() => import("./pages/ClinicalRiskDashboard"));
const AdminProtocolFitJourney = lazy(() => import("./pages/AdminProtocolFitJourney"));
const AdminProtocolBiquiniBranco = lazy(() => import("./pages/AdminProtocolBiquiniBranco"));
const AdminNutritionProtocols = lazy(() => import("./pages/AdminNutritionProtocols"));
const AdminGuideEngine = lazy(() => import("./pages/AdminGuideEngine"));
const AdminMarketingContent = lazy(() => import("./pages/AdminMarketingContent"));
const TherapeuticIntelligence = lazy(() => import("./pages/TherapeuticIntelligence"));
const ProtocolTransitions = lazy(() => import("./pages/ProtocolTransitions"));
const ClinicalOrchestration = lazy(() => import("./pages/ClinicalOrchestration"));
const HumanPerformance = lazy(() => import("./pages/HumanPerformance"));
const PopulationIntelligence = lazy(() => import("./pages/PopulationIntelligence"));
const ClinicalEnterprise = lazy(() => import("./pages/ClinicalEnterprise"));
const PhysiologicalIntelligence = lazy(() => import("./pages/PhysiologicalIntelligence"));
const ClinicalPredictions = lazy(() => import("./pages/ClinicalPredictions"));
const ClinicalSimulation = lazy(() => import("./pages/ClinicalSimulation"));
const ClinicalLab = lazy(() => import("./pages/ClinicalLab"));
const LabInterpreter = lazy(() => import("./pages/LabInterpreter"));
const ClinicalAutomation = lazy(() => import("./pages/ClinicalAutomation"));
const GlobalAdaptiveIntelligence = lazy(() => import("./pages/GlobalAdaptiveIntelligence"));
const ProfessionalClinicalAnalytics = lazy(() => import("./pages/ProfessionalClinicalAnalytics"));
const WeightTrajectory = lazy(() => import("./pages/WeightTrajectory"));
const MetabolicTwin = lazy(() => import("./pages/MetabolicTwin"));
const PopulationNutritionIntelligence = lazy(() => import("./pages/PopulationNutritionIntelligence"));
const PlatformGovernance = lazy(() => import("./pages/PlatformGovernance"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const ClinicalPipeline = lazy(() => import("./pages/ClinicalPipeline"));
const Integrations = lazy(() => import("./pages/Integrations"));
const SystemPresentation = lazy(() => import("./pages/SystemPresentation"));
const OnboardingProfissional = lazy(() => import("./pages/OnboardingProfissional"));
const OnboardingPaciente = lazy(() => import("./pages/OnboardingPaciente"));
const MagicJourneyStory = lazy(() => import("./pages/MagicJourneyStory"));
const BodyProjectionExperience = lazy(() => import("./pages/BodyProjectionExperience"));
const AdminOperationalCosts = lazy(() => import("./pages/AdminOperationalCosts"));
const AIUsageDashboard = lazy(() => import("./pages/admin/AIUsageDashboard"));
const MealCoverageDashboard = lazy(() => import("./pages/admin/MealCoverageDashboard"));
const MealVisualLibraryAdmin = lazy(() => import("./pages/admin/MealVisualLibraryAdmin"));
const PlanBatchAudit = lazy(() => import("./pages/admin/PlanBatchAudit"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const QAChecklistPage = lazy(() => import("./pages/QAChecklistPage"));
const TemplateNutritionAudit = lazy(() => import("./pages/admin/TemplateNutritionAudit"));
const TemplateMassReformulation = lazy(() => import("./pages/admin/TemplateMassReformulation"));
const AdminExperienceModeAudit = lazy(() => import("./pages/admin/AdminExperienceModeAudit"));
const AdminExperienceModeReconcile = lazy(() => import("./pages/admin/AdminExperienceModeReconcile"));
const InvitationAudit = lazy(() => import("./pages/InvitationAudit"));
const AdminPlanLoadingDiagnostics = lazy(() => import("./pages/admin/AdminPlanLoadingDiagnostics"));
const MarmitaAudit = lazy(() => import("./pages/admin/MarmitaAudit"));
const CoachBodybuilder = lazy(() => import("./pages/CoachBodybuilder"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const PhytotherapyProtocols = lazy(() => import("./pages/PhytotherapyProtocols"));
const MissionControl = lazy(() => import("./pages/MissionControl"));
const CampaignCenter = lazy(() => import("./pages/CampaignCenter"));
const ClinicalCRM = lazy(() => import("./pages/ClinicalCRM"));
const ClinicalBrain = lazy(() => import("./pages/ClinicalBrain"));
const SystemDiagnostics = lazy(() => import("./pages/SystemDiagnostics"));
const ClinicalControlTower = lazy(() => import("./pages/ClinicalControlTower"));
const ConsentRequired = lazy(() => import("./pages/ConsentRequired"));
const PaymentRequired = lazy(() => import("./pages/PaymentRequired"));
const SystemHealthLive = lazy(() => import("./pages/SystemHealthLive"));
const OperationalDashboard = lazy(() => import("./pages/OperationalDashboard"));
const PatientOverview = lazy(() => import("./pages/PatientOverview"));
const ClinicalWorkspace = lazy(() => import("./pages/ClinicalWorkspace"));
const InvitePatient = lazy(() => import("./pages/InvitePatient"));
const InOfficeWizard = lazy(() => import("./pages/InOfficeWizard"));
const InOfficeSelector = lazy(() => import("./pages/InOfficeSelector"));
const WorkspaceEditor = lazy(() => import("./pages/WorkspaceEditor"));
const IntelligenceSettings = lazy(() => import("./pages/IntelligenceSettings"));
const PatientIntelligence = lazy(() => import("./pages/PatientIntelligence"));
const RealtimeDebugCenter = lazy(() => import("./pages/RealtimeDebugCenter"));
const CockpitPremium = lazy(() => import("./pages/CockpitPremium"));
const StoreDashboard = lazy(() => import("./pages/store/StoreDashboard"));
const StoreProducts = lazy(() => import("./pages/store/StoreProducts"));
const TechnicalSheets = lazy(() => import("./pages/store/TechnicalSheets"));
const PatientDiagnostic = lazy(() => import("./pages/PatientDiagnostic"));
const MobileQA = lazy(() => import("./pages/MobileQA"));
const DiagnosticStatus = lazy(() => import("./pages/DiagnosticStatus"));
const SchemaMonitor = lazy(() => import("./pages/SchemaMonitor"));

// Install global error handlers once at module load
installGlobalErrorHandlers();
initFeatureFlags();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, 
      retry: (failureCount, error: any) => {
        // Retry more for network issues, less for auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      // Ensure we don't spam the user with the same error toast
      meta: {
        errorMessage: "Falha na comunicação com o servidor",
      }
    },
    mutations: {
      retry: 0,
    },
  },
});

// Expose QueryClient globally for pipeline cache invalidation
(window as any).__REACT_QUERY_CLIENT__ = queryClient;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isNutritionist, isAdmin } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) {
    console.warn("[RouteGuard:Nutritionist] No user → /auth");
    return <Navigate to="/auth" replace />;
  }
  if (!isNutritionist && !isAdmin) {
    console.warn("[RouteGuard:Nutritionist] Not nutritionist/admin → /", { isNutritionist, isAdmin });
    return <Navigate to="/" replace />;
  }
  // REMOVED: Automatic redirect to /pricing based on subscription status to ensure "Zero Blocks"
  return <>{children}</>;
}

function PersonalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPersonal, isAdmin } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isPersonal && !isAdmin) {
    console.warn("[RouteGuard:Personal] Not personal/admin → /", { isPersonal, isAdmin });
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProfessionalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isNutritionist, isPersonal, isAdmin } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isNutritionist && !isPersonal && !isAdmin) {
    console.warn("[RouteGuard:Professional] Not professional → /", { isNutritionist, isPersonal, isAdmin });
    return <Navigate to="/" replace />;
  }
  // REMOVED: Automatic redirect to /pricing based on subscription status to ensure "Zero Blocks"
  return <>{children}</>;
}

function PatientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPatient } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isPatient) {
    console.warn("[RouteGuard:Patient] Not patient → /", { isPatient });
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PaymentGuardedPatientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();

  if (loading || consentLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  const isProfessional = isNutritionist || isPersonal || isAdmin;
  if (isProfessional) return <>{children}</>;

  // Only mandatory redirect is for Consent if not provided
  const consentAllowedRoutes = ["/consent", "/auth", "/settings", "/reset-password"];
  if (isPatient && !hasConsent && !consentAllowedRoutes.some(r => location.pathname.startsWith(r))) {
    return <Navigate to="/consent" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    console.warn("[RouteGuard:Admin] Not admin → /", { isAdmin });
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function StoreRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const roles = useAuth().roles;
  const isLojista = (roles as string[]).includes("lojista");
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isLojista && !isAdmin) {
    console.warn("[RouteGuard:Store] Not lojista/admin → /");
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRoute() {
  const { user, profile, loading: authLoading, isPersonal, isPatient, isNutritionist, isAdmin, isLojista } = useAuth();
  const { tenantId, isLoading: tenantLoading, memberships } = useTenant();
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const location = useLocation();
  const [bootDone, setBootDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // 1. Timeout de inicialização (Fail-safe)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!bootDone) {
        console.error("%c[FJ:Boot] Initialization timeout reached (8s) - Unblocking UI in degraded mode", "color: #ef4444; font-weight: bold");
        setTimedOut(true);
        setBootDone(true);
        toast.error("A inicialização está demorando mais que o esperado. Algumas funções podem estar limitadas.", {
          duration: 6000,
          description: "O sistema continuará carregando em segundo plano.",
          action: {
            label: "Recarregar",
            onClick: () => window.location.reload()
          }
        });
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [bootDone]);

  // 2. Log de estado final padronizado e detecção de inconsistência
  const isCriticalLoading = authLoading || tenantLoading || (isPatient && journeyLoading);
  
  useEffect(() => {
    if (!isCriticalLoading && !bootDone) {
      setBootDone(true);
    }
  }, [isCriticalLoading, bootDone]);

  // 3. Cálculo de estados globais reativos
  const isOrphan = Boolean(user && isPatient && profile?.is_orphan);
  const isConsistent = user ? (
    (isPatient ? (tenantId !== null && memberships.length > 0 && !isOrphan) : true)
  ) : true;
  const isReady = bootDone && isConsistent && !timedOut && !isCriticalLoading;
  const isDegraded = bootDone && (timedOut || (!isConsistent && !isCriticalLoading && !isOrphan));
  const isLoading = !bootDone || (isCriticalLoading && !timedOut);

  useEffect(() => {
    if (bootDone) {
      console.log("%c[FJ:StateUpdate]", "color: #3b82f6; font-weight: bold", {
        user_id: user?.id || "anonymous",
        tenant_id: tenantId || "unresolved",
        membership: memberships.length > 0 ? `${memberships.length} active` : "NONE",
        journey_status: journeyStatus || "n/a",
        isReady,
        isDegraded,
        isLoading,
        isOrphan
      });
      
      if (user && !tenantId && !tenantLoading && isPatient) {
        console.error("%c[FJ:Critical] Inconsistent state: User exists but tenant_id is unresolved", "color: #ef4444; font-weight: bold");
      }

      // Legacy support
      (window as any).__FJ_READY__ = isReady;
    }
  }, [bootDone, user, tenantId, memberships, journeyStatus, isReady, isDegraded, isLoading, isPatient, tenantLoading]);

  const activeEditorRoute = !authLoading && user && (isNutritionist || isAdmin)
    ? readActiveEditorRoute()
    : null;

  // 4. Bloqueio de carregamento inicial
  if (!bootDone) return <PageLoader />;
  if (!user) return <GatewayPage />;

  return (
    <AppStateProvider value={{ isReady, isDegraded, isLoading, isOrphan }}>
      {isOrphan && bootDone && <OrphanUserBlock />}
      {isDegraded && !isOrphan && <DegradedModeBanner />}
      <Suspense fallback={<PageLoader />}>
        {(() => {
          // 1. Centralized Patient Decision
          if (isPatient && !isNutritionist && !isPersonal && !isAdmin) {
            const targetPath = getUserRouteByStatus(journeyStatus);
            if (location.pathname === "/" || location.pathname === "") {
              return <Navigate to={targetPath} replace />;
            }
          }

          // 2. Pro/Editor restoration
          if (activeEditorRoute?.shouldRestore) {
            return <Navigate to={activeEditorRoute.route} replace />;
          }

          // 3. Lojista
          if (isLojista && !isNutritionist && !isPersonal && !isAdmin) {
            return <Navigate to="/store" replace />;
          }

          // 4. Pure Patients
          if (isPatient && !isNutritionist && !isPersonal && !isAdmin) {
            return <Navigate to="/client/dashboard" replace />;
          }

          // 5. Professionals
          if (isPersonal && !isNutritionist && !isAdmin) return <PersonalDashboard />;
          return <Index />;
        })()}
      </Suspense>
    </AppStateProvider>
  );
}


function LegacyMealPlanRedirect() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (!id) {
    return <Navigate to="/meal-plans" replace />;
  }

  return <Navigate to={`/meal-plans/${id}${location.search}${location.hash}`} replace />;
}

function CanonicalPublicRedirect({ to }: { to: "/convite" | "/cadastro" | "/auth/confirm" | "/intake" }) {
  const location = useLocation();
  const params = useParams<{ code?: string; token?: string }>();
  if (to === "/convite" && params.code) {
    const search = new URLSearchParams(location.search);
    search.set("code", params.code);
    const query = search.toString();
    return <Navigate to={`/cadastro${query ? `?${query}` : ""}${location.hash}`} replace />;
  }
  const suffix = params.code || params.token ? `/${params.code || params.token}` : "";
  return <Navigate to={`${to}${suffix}${location.search}${location.hash}`} replace />;
}

function InvitationCodeRedirect() {
  const location = useLocation();
  const { "*": rest } = useParams(); // Catch everything after /convite/
  const search = new URLSearchParams(location.search);
  if (rest) {
    const code = rest.split("/")[0]; // Get the first segment as the code
    if (code) search.set("code", code);
  }
  const query = search.toString();
  return <Navigate to={`/cadastro${query ? `?${query}` : ""}${location.hash}`} replace />;
}

function PublicProfileRegistrationRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from("public_profile_settings")
          .select("nutritionist_id")
          .eq("slug", slug)
          .maybeSingle();
        if (data) setTargetId(data.nutritionist_id);
      } catch (err) {
        console.error("Error fetching public profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  if (loading) return <PageLoader />;
  if (!targetId) return <Navigate to="/404" replace />;
  
  return <Navigate to={`/cadastro?nutri=${targetId}`} replace />;
}

function DarkModeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches) || !stored;
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    }

    const themeColor = isDark ? "#000000" : "#f5f7fa";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    meta.content = themeColor;
  }, []);
  return null;
}

/** Wraps a lazy page in SafePage (ErrorBoundary + Suspense + auto-recovery) */
function LP({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}

function ExperienceModeProvider({ children }: { children: React.ReactNode }) {
  // Derive effective role from auth: patient-only users get patient route gating.
  const { isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;
  // Pure patients (no pro role) → "patient" gating. Hybrid/pro → "professional".
  const role = (isPatient && !isProRole) ? "patient" : "professional";
  const value = useExperienceModeState(role);
  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>;
}

/** Syncs experience mode + role to HTML data attributes for CSS theming.
 *  Respects workspace context so hybrid users get the correct theme. */
function ExperienceThemeSync() {
  const { mode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin, isPatient, loading } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;

  useEffect(() => {
    if (loading) return;
    const isHybrid = isProRole && isPatient;
    let role: "professional" | "patient" = isProRole ? "professional" : "patient";
    if (isHybrid) {
      const saved = localStorage.getItem("fj_workspace_context");
      if (saved === "patient") role = "patient";
    }
    document.documentElement.setAttribute("data-experience-mode", mode);
    document.documentElement.setAttribute("data-experience-role", role);

    // Listen for workspace context changes (dispatched by useWorkspaceContext)
    const handler = (e: Event) => {
      const ctx = (e as CustomEvent).detail;
      document.documentElement.setAttribute("data-experience-role", ctx === "patient" ? "patient" : "professional");
    };
    window.addEventListener("fj:workspace-context-change", handler);
    return () => {
      document.documentElement.removeAttribute("data-experience-mode");
      document.documentElement.removeAttribute("data-experience-role");
      window.removeEventListener("fj:workspace-context-change", handler);
    };
  }, [mode, isProRole, isPatient, loading]);

  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Helmet>
          <title>FitJourney — Plataforma para Nutricionistas</title>
          <meta name="description" content="Plataforma completa para nutricionistas: planos alimentares, IA, gamificação, avaliações físicas e gestão de pacientes." />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <link rel="canonical" href="https://www.fitjourney.com.br" />
        </Helmet>
        <Toaster />
        <Sonner />
        <MobileAutoFixer />
        <GlobalErrorBoundary />
        <BrowserRouter basename="/">
          <AuthProvider>
            <TenantProvider>
            <ExperienceModeProvider>
            <ExperienceThemeSync />
            <ExperienceRouteGuard />
            <WorkspaceRouteGuard />
            <CelebrationProvider>
            <DarkModeInit />
            <NeuralScreensaver />
            <FitIntelligenceAssistant />
            <IFJPatientCoach />
            <CommandPaletteProvider>
              <Routes>
               {/* Root and legacy entry points */}
               <Route path="/" element={<RootRoute />} />
               <Route path="/index" element={<RootRoute />} />
               <Route path="/inicio" element={<RootRoute />} />
               <Route path="/dashboard" element={<RootRoute />} />
               <Route path="/patient-dashboard" element={<Navigate to="/client/dashboard" replace />} />
               <Route path="/~oauth/cadastro" element={<CanonicalPublicRedirect to="/cadastro" />} />
               <Route path="/~oauth/convite/:code" element={<CanonicalPublicRedirect to="/convite" />} />
               <Route path="/~oauth/intake/:token" element={<CanonicalPublicRedirect to="/intake" />} />
               <Route path="/~oauth/auth/confirm" element={<CanonicalPublicRedirect to="/auth/confirm" />} />

               {/* Public landing pages */}
               <Route path="/diagnostic-status" element={<ProtectedRoute><LP section="Status"><DiagnosticStatus /></LP></ProtectedRoute>} />
              <Route path="/landing-paciente" element={<LP section="Landing"><PatientLanding /></LP>} />
              <Route path="/landing-personal" element={<LP section="Landing"><PersonalLanding /></LP>} />
              <Route path="/landing-afiliado" element={<LP section="Landing"><AffiliateLanding /></LP>} />
              <Route path="/biquini-branco" element={<LP section="Landing"><BiquiniBrancoLanding /></LP>} />
              <Route path="/demo/:mode" element={<Suspense fallback={<PageLoader />}><PublicDemo /></Suspense>} />
              {/* Patient self-registration disabled — access is invitation-based only */}
              <Route path="/cadastro" element={<LP section="Cadastro"><PatientRegister /></LP>} />
              <Route path="/register" element={<LP section="Cadastro"><PatientRegister /></LP>} />
              <Route path="/register-patient" element={<LP section="Cadastro"><PatientRegister /></LP>} />
               <Route path="/vincular/:nutriId" element={<Navigate to="/cadastro?nutri=:nutriId" replace />} />
               <Route path="/q/:nutriId" element={<Navigate to="/cadastro?nutri=:nutriId" replace />} />
                <Route path="/convite" element={<Navigate to="/cadastro" replace />} />
               <Route path="/convite/*" element={<InvitationCodeRedirect />} />
               <Route path="/p/:slug/paciente" element={<PublicProfileRegistrationRedirect />} />
               <Route path="/p/:slug/profissional" element={<PublicProfileRegistrationRedirect />} />
               <Route path="/p/:slug/agenda" element={<LP section="Agenda"><PublicBooking /></LP>} />
               <Route path="/p/:slug" element={<LP section="Perfil Público"><PublicProfile /></LP>} />
               <Route path="/convite/:code/status" element={<LP section="Status do Convite"><InvitationStatus /></LP>} />
               <Route path="/auth" element={<LP section="Auth"><Auth /></LP>} />
               <Route path="/auth/confirm" element={<LP section="Confirmação"><AuthConfirm /></LP>} />
               <Route path="/politica-de-privacidade" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
               <Route path="/termos-de-uso" element={<Suspense fallback={<PageLoader />}><TermsOfUse /></Suspense>} />
               <Route path="/exclusao-de-conta" element={<Suspense fallback={<PageLoader />}><AccountDeletion /></Suspense>} />
              <Route path="/reset-password" element={<LP section="Auth"><ResetPassword /></LP>} />

              {/* Shared routes */}
              <Route path="/chat" element={<ProtectedRoute><LP section="Chat"><Chat /></LP></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><LP section="Agenda"><Appointments /></LP></ProtectedRoute>} />
              <Route path="/planner" element={<ProtectedRoute><LP section="Planner"><Planner /></LP></ProtectedRoute>} />
              <Route path="/weekly-goals" element={<ProtectedRoute><LP section="Metas"><WeeklyGoals /></LP></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><LP section="Configurações"><Settings /></LP></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><LP section="Notificações"><Notifications /></LP></ProtectedRoute>} />
              <Route path="/food-database" element={<NutritionistRoute><LP section="Alimentos"><FoodDatabase /></LP></NutritionistRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><LP section="Receitas"><Recipes /></LP></ProtectedRoute>} />
              <Route path="/recipe-builder" element={<ProtectedRoute><LP section="Calculadora de Receitas"><RecipeBuilder /></LP></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute><LP section="Feedbacks"><Feedbacks /></LP></ProtectedRoute>} />
              <Route path="/supplements" element={<ProtectedRoute><LP section="Suplementos"><Supplements /></LP></ProtectedRoute>} />

              {/* Nutritionist-only routes */}
              <Route path="/patients" element={<NutritionistRoute><LP section="Pacientes"><Patients /></LP></NutritionistRoute>} />
              <Route path="/onboarding-tracker" element={<NutritionistRoute><LP section="Onboarding"><OnboardingTracker /></LP></NutritionistRoute>} />
              <Route path="/patients/:patientId" element={<NutritionistRoute><LP section="Pacientes"><PatientDetail /></LP></NutritionistRoute>} />
              <Route path="/preview-patient/:patientId" element={<NutritionistRoute><LP section="Preview do Paciente"><PreviewPatient /></LP></NutritionistRoute>} />
              <Route path="/protocols" element={<NutritionistRoute><LP section="Protocolos"><Protocols /></LP></NutritionistRoute>} />
              <Route path="/protocolos-fitoterapicos" element={<NutritionistRoute><LP section="Protocolos Fitoterápicos"><PhytotherapyProtocols /></LP></NutritionistRoute>} />
              <Route path="/programs" element={<NutritionistRoute><LP section="Projetos"><Programs /></LP></NutritionistRoute>} />
              <Route path="/programs/:programId" element={<NutritionistRoute><LP section="Projetos"><ProgramDetail /></LP></NutritionistRoute>} />
              <Route path="/programs/:programId/biquini-branco" element={<NutritionistRoute><LP section="Projetos"><BiquiniBrancoDetail /></LP></NutritionistRoute>} />
              <Route path="/meal-plans" element={<NutritionistRoute><LP section="Planos"><MealPlans /></LP></NutritionistRoute>} />
              <Route path="/plan-audit" element={<NutritionistRoute><LP section="Auditoria"><PlanAudit /></LP></NutritionistRoute>} />
              <Route path="/editor-v2" element={<NutritionistRoute><LP section="Editor Premium V2"><MealPlanEditorV2Entry /></LP></NutritionistRoute>} />
              <Route path="/meal-plans/:id" element={<NutritionistRoute><LP section="Planos"><MealPlanEditorV2 /></LP></NutritionistRoute>} />
              <Route path="/meal-plans/:id/legacy" element={<LegacyMealPlanRedirect />} />
              <Route path="/plan-builder/:id" element={<NutritionistRoute><LP section="Builder Híbrido"><HybridPlanBuilder /></LP></NutritionistRoute>} />
              <Route path="/diet-templates" element={<NutritionistRoute><LP section="Templates"><DietTemplates /></LP></NutritionistRoute>} />
              <Route path="/physical-assessment" element={<NutritionistRoute><LP section="Avaliação"><PhysicalAssessment /></LP></NutritionistRoute>} />
              <Route path="/body-analysis" element={<NutritionistRoute><LP section="Análise Corporal"><BodyAnalysis /></LP></NutritionistRoute>} />
              <Route path="/branding" element={<NutritionistRoute><LP section="Branding"><Branding /></LP></NutritionistRoute>} />
              <Route path="/reports" element={<NutritionistRoute><LP section="Relatórios"><Reports /></LP></NutritionistRoute>} />
              <Route path="/clinical-intelligence" element={<NutritionistRoute><LP section="Inteligência Clínica"><ClinicalIntelligence /></LP></NutritionistRoute>} />
              <Route path="/therapeutic-intelligence" element={<NutritionistRoute><LP section="Inteligência Terapêutica"><TherapeuticIntelligence /></LP></NutritionistRoute>} />
              <Route path="/protocol-transitions" element={<NutritionistRoute><LP section="Transições de Protocolo"><ProtocolTransitions /></LP></NutritionistRoute>} />
              <Route path="/clinical-orchestration" element={<NutritionistRoute><LP section="Orquestração Clínica"><ClinicalOrchestration /></LP></NutritionistRoute>} />
              <Route path="/human-performance" element={<NutritionistRoute><LP section="Performance Humana"><HumanPerformance /></LP></NutritionistRoute>} />
              <Route path="/population-intelligence" element={<NutritionistRoute><LP section="Inteligência Populacional"><PopulationIntelligence /></LP></NutritionistRoute>} />
              <Route path="/physiological-intelligence" element={<NutritionistRoute><LP section="Inteligência Fisiológica"><PhysiologicalIntelligence /></LP></NutritionistRoute>} />
              <Route path="/clinical-predictions" element={<NutritionistRoute><LP section="Previsão Clínica"><ClinicalPredictions /></LP></NutritionistRoute>} />
              <Route path="/clinical-simulation" element={<NutritionistRoute><LP section="Simulador Clínico"><ClinicalSimulation /></LP></NutritionistRoute>} />
              <Route path="/clinical-lab" element={<NutritionistRoute><LP section="Laboratório Clínico"><ClinicalLab /></LP></NutritionistRoute>} />
              <Route path="/lab-interpreter" element={<NutritionistRoute><LP section="Interpretador de Exames"><LabInterpreter /></LP></NutritionistRoute>} />
              <Route path="/clinical-analytics" element={<NutritionistRoute><LP section="Analytics Clínico"><ProfessionalClinicalAnalytics /></LP></NutritionistRoute>} />
              <Route path="/weekly-report" element={<NutritionistRoute><LP section="Relatórios"><WeeklyReport /></LP></NutritionistRoute>} />
              <Route path="/financial" element={<NutritionistRoute><LP section="Financeiro"><Financial /></LP></NutritionistRoute>} />
              <Route path="/global-tips" element={<ProtectedRoute><LP section="Dicas"><GlobalTips /></LP></ProtectedRoute>} />
              <Route path="/professional-guide" element={<NutritionistRoute><LP section="Guia"><ProfessionalGuide /></LP></NutritionistRoute>} />
              <Route path="/automation" element={<NutritionistRoute><LP section="Automação"><AutomationCenter /></LP></NutritionistRoute>} />
              <Route path="/clinical-automation" element={<NutritionistRoute><LP section="Automação Clínica"><ClinicalAutomation /></LP></NutritionistRoute>} />
              <Route path="/checkin-panel" element={<NutritionistRoute><LP section="Check-ins"><CheckinPanel /></LP></NutritionistRoute>} />
              <Route path="/clinical-risk" element={<NutritionistRoute><LP section="Risco Clínico"><ClinicalRiskDashboard /></LP></NutritionistRoute>} />
              <Route path="/control-tower" element={<NutritionistRoute><LP section="Control Tower"><ClinicalControlTower /></LP></NutritionistRoute>} />
              <Route path="/clinical-workspace" element={<NutritionistRoute><LP section="Workspace"><ClinicalWorkspace /></LP></NutritionistRoute>} />
              <Route path="/cockpit" element={<NutritionistRoute><LP section="Cockpit Premium"><CockpitPremium /></LP></NutritionistRoute>} />
              <Route path="/invite-patient" element={<ProfessionalRoute><LP section="Convidar Paciente"><InvitePatient /></LP></ProfessionalRoute>} />
              <Route path="/in-office" element={<NutritionistRoute><LP section="Modo Consultório"><InOfficeSelector /></LP></NutritionistRoute>} />
              <Route path="/in-office/:patientId" element={<NutritionistRoute><LP section="Modo Consultório"><InOfficeWizard /></LP></NutritionistRoute>} />
              <Route path="/workspace-editor" element={<ProfessionalRoute><LP section="Editor"><WorkspaceEditor /></LP></ProfessionalRoute>} />
              <Route path="/weight-trajectory" element={<NutritionistRoute><LP section="Trajetória de Peso"><WeightTrajectory /></LP></NutritionistRoute>} />
              <Route path="/metabolic-twin" element={<NutritionistRoute><LP section="Digital Twin"><MetabolicTwin /></LP></NutritionistRoute>} />
              <Route path="/population-nutrition" element={<NutritionistRoute><LP section="Nutrição Populacional"><PopulationNutritionIntelligence /></LP></NutritionistRoute>} />
              <Route path="/platform-governance" element={<AdminRoute><LP section="Governança"><PlatformGovernance /></LP></AdminRoute>} />
              <Route path="/security-dashboard" element={<AdminRoute><LP section="Segurança"><SecurityDashboard /></LP></AdminRoute>} />
              <Route path="/clinical-pipeline" element={<AdminRoute><LP section="Pipeline Clínico"><ClinicalPipeline /></LP></AdminRoute>} />
              <Route path="/integrations" element={<ProfessionalRoute><LP section="Integrações"><Integrations /></LP></ProfessionalRoute>} />
              <Route path="/team" element={<ProfessionalRoute><LP section="Equipe Clínica"><TeamManagement /></LP></ProfessionalRoute>} />
              {/* WhatsApp route removed - feature disabled */}

              {/* Personal Trainer routes */}
              <Route path="/personal/dashboard" element={<PersonalRoute><LP section="Personal"><PersonalDashboard /></LP></PersonalRoute>} />
              <Route path="/personal/students" element={<PersonalRoute><LP section="Alunos"><PersonalStudents /></LP></PersonalRoute>} />
              <Route path="/personal/workouts" element={<PersonalRoute><LP section="Treinos"><PersonalWorkouts /></LP></PersonalRoute>} />
              <Route path="/personal/workouts/new" element={<PersonalRoute><LP section="Treinos"><PersonalWorkouts /></LP></PersonalRoute>} />
              <Route path="/fitness-anamnesis" element={<ProtectedRoute><LP section="Anamnese Fitness"><FitnessAnamnesis /></LP></ProtectedRoute>} />

              {/* Consent required page */}
              <Route path="/consent" element={<PatientRoute><LP section="Consentimento"><ConsentRequired /></LP></PatientRoute>} />
              <Route path="/consent-required" element={<Navigate to="/consent" replace />} />
              <Route path="/payment-required" element={<PatientRoute><LP section="Pagamento"><PaymentRequired /></LP></PatientRoute>} />

              {/* Patient portal — consent guarded */}
              <Route path="/client/dashboard" element={<PaymentGuardedPatientRoute><LP section="Dashboard"><PatientReadyGuard context="dashboard"><ClientDashboard /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/patient-overview" element={<PaymentGuardedPatientRoute><LP section="Meu Painel"><PatientReadyGuard context="patient_overview"><PatientOverview /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/my-workouts" element={<PaymentGuardedPatientRoute><LP section="Treinos"><PatientReadyGuard context="workouts"><PatientWorkouts /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/patient-intelligence" element={<PaymentGuardedPatientRoute><LP section="Inteligência FitJourney"><PatientIntelligence /></LP></PaymentGuardedPatientRoute>} />

              <Route path="/patient-diagnostic" element={<PatientRoute><LP section="Diagnóstico"><PatientDiagnostic /></LP></PatientRoute>} />
              <Route path="/meals" element={<PaymentGuardedPatientRoute><LP section="Refeições"><Meals /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/achievements" element={<PaymentGuardedPatientRoute><LP section="Conquistas"><Achievements /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/challenges" element={<PaymentGuardedPatientRoute><LP section="Desafios"><Challenges /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/checklist" element={<PaymentGuardedPatientRoute><LP section="Checklist"><Checklist /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/anamnesis" element={<PaymentGuardedPatientRoute><LP section="Anamnese"><PatientReadyGuard context="anamnese"><Anamnesis /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/onboarding" element={<PaymentGuardedPatientRoute><LP section="Onboarding"><PatientReadyGuard context="onboarding"><OnboardingPipeline /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/onboarding-pipeline" element={<PaymentGuardedPatientRoute><LP section="Onboarding"><PatientReadyGuard context="onboarding_pipeline"><OnboardingPipeline /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/analyze" element={<PaymentGuardedPatientRoute><LP section="Análise"><AnalyzeMeal /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/shopping-list" element={<PaymentGuardedPatientRoute><LP section="Compras"><ShoppingList /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/my-diet" element={<PaymentGuardedPatientRoute><LP section="Dieta"><PatientReadyGuard context="meal_plan"><PatientMealPlan /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/journey" element={<PaymentGuardedPatientRoute><LP section="Jornada"><Journey /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/library" element={<PaymentGuardedPatientRoute><LP section="Biblioteca"><Library /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/weight-calculator" element={<PaymentGuardedPatientRoute><LP section="Calculadora"><WeightCalculator /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/water-calculator" element={<PaymentGuardedPatientRoute><LP section="Calculadora"><WaterCalculator /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/health-quiz" element={<PaymentGuardedPatientRoute><LP section="Quiz"><HealthCheckQuiz /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/checkin" element={<PaymentGuardedPatientRoute><LP section="Check-in"><PatientReadyGuard context="checkin"><Checkin /></PatientReadyGuard></LP></PaymentGuardedPatientRoute>} />
              <Route path="/user-guide" element={<ProtectedRoute><LP section="Guia"><UserGuide /></LP></ProtectedRoute>} />
              <Route path="/curiosidades" element={<ProtectedRoute><LP section="Curiosidades"><Curiosidades /></LP></ProtectedRoute>} />
              <Route path="/apresentacao" element={<ProtectedRoute><LP section="Apresentação"><SystemPresentation /></LP></ProtectedRoute>} />
              <Route path="/mobile-qa" element={<ProfessionalRoute><LP section="Mobile QA"><Suspense fallback={<PageLoader />}><MobileQA /></Suspense></LP></ProfessionalRoute>} />
              <Route path="/onboarding-profissional" element={<ProtectedRoute><LP section="Onboarding"><OnboardingProfissional /></LP></ProtectedRoute>} />
              <Route path="/onboarding-paciente" element={<ProtectedRoute><LP section="Onboarding Paciente"><OnboardingPaciente /></LP></ProtectedRoute>} />
              <Route path="/my-story" element={<PaymentGuardedPatientRoute><LP section="Minha História"><MagicJourneyStory /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/body-projection" element={<PaymentGuardedPatientRoute><LP section="Projeção Corporal"><BodyProjectionExperience /></LP></PaymentGuardedPatientRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><LP section="Admin"><AdminDashboard /></LP></AdminRoute>} />
              <Route path="/admin/image-fallbacks" element={<AdminRoute><LP section="Monitor de Fallback"><ImageFallbackAdmin /></LP></AdminRoute>} />
              <Route path="/admin/schema" element={<AdminRoute><LP section="Admin"><Suspense fallback={<PageLoader />}><SchemaMonitor /></Suspense></LP></AdminRoute>} />
              <Route path="/admin/features" element={<AdminRoute><LP section="Admin"><AdminFeatureControl /></LP></AdminRoute>} />
              <Route path="/admin/testimonials" element={<AdminRoute><LP section="Admin"><AdminTestimonials /></LP></AdminRoute>} />
              <Route path="/admin/site-editor" element={<AdminRoute><LP section="Admin"><AdminSiteEditor /></LP></AdminRoute>} />
              <Route path="/admin/resources" element={<AdminRoute><LP section="Admin"><AdminResourceCenter /></LP></AdminRoute>} />
              <Route path="/admin/import-patients" element={<NutritionistRoute><LP section="Importação"><ImportPatients /></LP></NutritionistRoute>} />
              <Route path="/admin/profissionais" element={<AdminRoute><LP section="Admin"><AdminProfessionals /></LP></AdminRoute>} />
              <Route path="/admin/booking-settings" element={<AdminRoute><LP section="Admin"><AdminBookingSettings /></LP></AdminRoute>} />
              <Route path="/admin/subscription-monitor" element={<AdminRoute><LP section="Admin"><AdminSubscriptionMonitor /></LP></AdminRoute>} />
              <Route path="/admin/growth" element={<AdminRoute><LP section="Admin"><GrowthDashboard /></LP></AdminRoute>} />
              <Route path="/admin/prestige" element={<AdminRoute><LP section="Admin"><AdminPrestige /></LP></AdminRoute>} />
              <Route path="/admin/pricing" element={<AdminRoute><LP section="Admin"><AdminPricing /></LP></AdminRoute>} />
              <Route path="/admin/patient-features" element={<AdminRoute><LP section="Admin"><AdminPatientFeatures /></LP></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><LP section="Admin"><AuditLogs /></LP></AdminRoute>} />
              <Route path="/admin/experience-mode-audit" element={<AdminRoute><LP section="Admin"><AdminExperienceModeAudit /></LP></AdminRoute>} />
              <Route path="/admin/experience-mode-reconcile" element={<AdminRoute><LP section="Admin"><AdminExperienceModeReconcile /></LP></AdminRoute>} />
              <Route path="/admin/plan-loading-diagnostics" element={<AdminRoute><LP section="Admin"><AdminPlanLoadingDiagnostics /></LP></AdminRoute>} />
              <Route path="/admin/affiliates" element={<AdminRoute><LP section="Admin"><AdminAffiliates /></LP></AdminRoute>} />
              <Route path="/admin/landing-pages" element={<AdminRoute><LP section="Admin"><AdminLandingPages /></LP></AdminRoute>} />
              <Route path="/admin/menu-config" element={<AdminRoute><LP section="Admin"><AdminMenuConfig /></LP></AdminRoute>} />
              <Route path="/admin/protocol-fitjourney" element={<AdminRoute><LP section="Admin"><AdminProtocolFitJourney /></LP></AdminRoute>} />
              <Route path="/admin/protocol-biquini-branco" element={<AdminRoute><LP section="Admin"><AdminProtocolBiquiniBranco /></LP></AdminRoute>} />
              <Route path="/admin/nutrition-protocols" element={<AdminRoute><LP section="Admin"><AdminNutritionProtocols /></LP></AdminRoute>} />
              <Route path="/admin/enterprise" element={<AdminRoute><LP section="Admin"><ClinicalEnterprise /></LP></AdminRoute>} />
              <Route path="/admin/guide-engine" element={<AdminRoute><LP section="Admin"><AdminGuideEngine /></LP></AdminRoute>} />
              <Route path="/admin/marketing-content" element={<AdminRoute><LP section="Admin"><AdminMarketingContent /></LP></AdminRoute>} />
              <Route path="/admin/adaptive-intelligence" element={<AdminRoute><LP section="Admin"><GlobalAdaptiveIntelligence /></LP></AdminRoute>} />
              <Route path="/admin-operational-costs" element={<AdminRoute><LP section="Admin"><AdminOperationalCosts /></LP></AdminRoute>} />
              <Route path="/admin/ai-usage" element={<AdminRoute><LP section="Admin"><AIUsageDashboard /></LP></AdminRoute>} />
              <Route path="/admin/meal-coverage" element={<AdminRoute><LP section="Admin"><MealCoverageDashboard /></LP></AdminRoute>} />
              <Route path="/admin/meal-visual-library" element={<AdminRoute><LP section="Biblioteca Visual"><MealVisualLibraryAdmin /></LP></AdminRoute>} />
              <Route path="/admin/plan-audit" element={<AdminRoute><LP section="Auditoria de Planos"><PlanBatchAudit /></LP></AdminRoute>} />
              <Route path="/admin/marmita-audit" element={<AdminRoute><LP section="Auditoria de Marmitas"><MarmitaAudit /></LP></AdminRoute>} />
              <Route path="/status" element={<AdminRoute><LP section="Status"><StatusPage /></LP></AdminRoute>} />
              <Route path="/admin/qa-checklist" element={<AdminRoute><LP section="QA"><QAChecklistPage /></LP></AdminRoute>} />
              <Route path="/admin/invitation-audit" element={<AdminRoute><LP section="Auditoria"><InvitationAudit /></LP></AdminRoute>} />
              <Route path="/admin/template-nutrition-audit" element={<AdminRoute><LP section="Auditoria Nutricional"><TemplateNutritionAudit /></LP></AdminRoute>} />
              <Route path="/admin/template-mass-reformulation" element={<AdminRoute><LP section="Reformulação em Massa"><TemplateMassReformulation /></LP></AdminRoute>} />
              <Route path="/admin/mission-control" element={<AdminRoute><LP section="Mission Control"><MissionControl /></LP></AdminRoute>} />
              <Route path="/admin/campaigns" element={<AdminRoute><LP section="Campanhas"><CampaignCenter /></LP></AdminRoute>} />
               <Route path="/system-diagnostics" element={<AdminRoute><LP section="System Diagnostics"><SystemDiagnostics /></LP></AdminRoute>} />
               <Route path="/admin/health" element={<AdminRoute><LP section="System Health"><ClinicalHealthDashboard /></LP></AdminRoute>} />
              <Route path="/system-diagnostics/realtime" element={<AdminRoute><LP section="Realtime Debug"><RealtimeDebugCenter /></LP></AdminRoute>} />
              <Route path="/admin/personal-workouts" element={<AdminRoute><LP section="Personal Trainer"><PersonalWorkouts /></LP></AdminRoute>} />
              <Route path="/coach-bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
              <Route path="/system-health-live" element={<AdminRoute><LP section="System Health"><SystemHealthLive /></LP></AdminRoute>} />
              <Route path="/ops-center" element={<AdminRoute><LP section="Operations Center"><OperationalDashboard /></LP></AdminRoute>} />
              <Route path="/professional/crm" element={<NutritionistRoute><LP section="CRM"><ClinicalCRM /></LP></NutritionistRoute>} />
              <Route path="/clinical-brain" element={<NutritionistRoute><LP section="Clinical Brain"><ClinicalBrain /></LP></NutritionistRoute>} />
              <Route path="/intelligence-settings" element={<NutritionistRoute><LP section="Inteligência FitJourney"><IntelligenceSettings /></LP></NutritionistRoute>} />

              {/* Store (Lojista) routes */}
              <Route path="/store" element={<StoreRoute><LP section="Loja"><StoreDashboard /></LP></StoreRoute>} />
              <Route path="/store/products" element={<StoreRoute><LP section="Produtos"><StoreProducts /></LP></StoreRoute>} />
              <Route path="/store/technical-sheets" element={<StoreRoute><LP section="Fichas Técnicas"><TechnicalSheets /></LP></StoreRoute>} />

              {/* Public pricing */}
              <Route path="/pricing" element={<LP section="Pricing"><Pricing /></LP>} />
              <Route path="/obrigado" element={<PaymentSuccess />} />

              {/* Public pages */}
              <Route path="/p/:slug" element={<LP section="Perfil"><PublicProfile /></LP>} />
              <Route path="/p/:slug/agendar" element={<LP section="Agendamento"><PublicBooking /></LP>} />
              <Route path="/p/:slug/paciente" element={<LP section="Planos Paciente"><PublicPlans planType="patient_prestige" /></LP>} />
              <Route path="/p/:slug/profissional" element={<LP section="Planos Profissional"><PublicPlans planType="professional" /></LP>} />
              <Route path="/program/:programId/public" element={<LP section="Projeto"><PublicProgram /></LP>} />

              {/* Intake onboarding via token (public) */}
              <Route path="/intake/:token" element={<LP section="Onboarding"><IntakeOnboarding /></LP>} />

              {/* Network pages */}
              <Route path="/my-public-profile" element={<ProfessionalRoute><LP section="Perfil"><MyPublicProfile /></LP></ProfessionalRoute>} />
              <Route path="/my-referrals" element={<ProtectedRoute><LP section="Indicações"><MyReferrals /></LP></ProtectedRoute>} />

              {/* Global Ranking */}
              <Route path="/ranking" element={<ProtectedRoute><LP section="Ranking"><GlobalRanking /></LP></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
    </AppStateProvider>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <Helmet>
        <title>FitJourney</title>
      </Helmet>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <ExperienceModeProvider>
                <CelebrationProvider>
                  <CommandPaletteProvider>
                    <AppContent />
                  </CommandPaletteProvider>
                </CelebrationProvider>
              </ExperienceModeProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <UpdateBanner />
      <BuildStatusPanel />
      <TextSourceInspector />
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <Helmet>
        <title>FitJourney</title>
      </Helmet>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <TenantProvider>
              <ExperienceModeProvider>
                <CelebrationProvider>
                  <CommandPaletteProvider>
                    <AppStateProvider>
                      <AppContent />
                    </AppStateProvider>
                  </CommandPaletteProvider>
                </CelebrationProvider>
              </ExperienceModeProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <UpdateBanner />
      <BuildStatusPanel />
      <TextSourceInspector />
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
