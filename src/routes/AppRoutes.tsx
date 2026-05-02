import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { lazy, Suspense } from "react";
import { useAppState } from "@/hooks/useAppState";
import { DegradedModeBanner } from "@/components/common/DegradedModeBanner";
import { HardFailLinkage } from "@/components/common/HardFailLinkage";
import { ErrorBoundaryDebug } from "@/components/common/ErrorBoundaryDebug";
import { SectionalErrorBoundary } from "@/components/common/SectionalErrorBoundary";
import { StabilityZone } from "@/components/common/StabilityZone";
import { lazyDebug } from "@/lib/lazyDebug";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { AnimatePresence } from "framer-motion";
import SafePage from "@/components/common/SafePage";
import PageLoader from "@/components/common/PageLoader";
import { SystemStateGuard } from "@/components/common/SystemStateGuard";
import ExperienceRouteGuard from "@/components/common/ExperienceRouteGuard";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { logError } from "@/lib/monitoring";
import OnboardingEntry from "@/components/onboarding/OnboardingEntry";

// Eager
import Auth from "../pages/Auth";
import AuthConfirm from "../pages/AuthConfirm";
import NotFound from "../pages/NotFound";
import Index from "../pages/Index";
import Welcome from "../pages/Welcome";

// Lazy - Core
const AnalyzeMeal = lazy(() => import("../pages/AnalyzeMeal"));
const Patients = lazy(() => import("../pages/Patients"));
const PatientDetail = lazy(() => import("../pages/PatientDetail"));
const ClientDashboard = lazy(() => import("../pages/ClientDashboard"));
const MealPlanEditorV2 = lazyDebug(() => import("../pages/MealPlanEditorV2"), "MealPlanEditorV2");
const MealPlanEditorV2Entry = lazyDebug(() => import("../pages/MealPlanEditorV2Entry"), "MealPlanEditorV2Entry");
const EditorV3Page = lazyDebug(() => import("../features/editor-v3").then(m => ({ default: m.EditorV3Page })), "Editor V3");
const DietBuilder = lazy(() => import("../pages/diet-builder/DietBuilder"));
const GlobalRanking = lazy(() => import("../pages/GlobalRanking"));
const ProfessionalClinicalAnalytics = lazy(() => import("../pages/ProfessionalClinicalAnalytics"));
const Invitation = lazy(() => import("../pages/Invitation"));

// Lazy - Admin
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AuditLogs = lazy(() => import("../pages/admin/AuditLogs"));
const ClinicalRulesAdmin = lazy(() => import("../pages/admin/ClinicalRules"));
const AdminAffiliates = lazy(() => import("../pages/AdminAffiliates"));
const AdminBookingSettings = lazy(() => import("../pages/AdminBookingSettings"));
const AdminFeatureControl = lazy(() => import("../pages/AdminFeatureControl"));
const AdminPricing = lazy(() => import("../pages/AdminPricing"));
const AdminProfessionals = lazy(() => import("../pages/AdminProfessionals"));
const AdminSubscriptionMonitor = lazy(() => import("../pages/AdminSubscriptionMonitor"));
const AdminSiteEditor = lazy(() => import("../pages/AdminSiteEditor"));
const AdminResourceCenter = lazy(() => import("../pages/AdminResourceCenter"));
const AdminTestimonials = lazy(() => import("../pages/AdminTestimonials"));
const QAChecklist = lazy(() => import("../pages/admin/QAChecklistPage"));
const InvitationAudit = lazy(() => import("../pages/InvitationAudit"));
const TemplateNutritionAudit = lazy(() => import("../pages/admin/TemplateNutritionAudit.tsx"));
const AIUsageDashboard = lazy(() => import("../pages/admin/AIUsageDashboard.tsx"));
const AdminExperienceModeAudit = lazy(() => import("../pages/admin/AdminExperienceModeAudit.tsx"));
const AdminExperienceModeReconcile = lazy(() => import("../pages/admin/AdminExperienceModeReconcile.tsx"));
const AdminPlanLoadingDiagnostics = lazy(() => import("../pages/admin/AdminPlanLoadingDiagnostics.tsx"));
const ImageFallbackAdmin = lazy(() => import("../pages/admin/ImageFallbackAdmin.tsx"));
const MarmitaAudit = lazy(() => import("../pages/admin/MarmitaAudit.tsx"));
const MealCoverageDashboard = lazy(() => import("../pages/admin/MealCoverageDashboard.tsx"));
const MealVisualLibraryAdmin = lazyDebug(() => import("../pages/admin/MealVisualLibraryAdmin.tsx"), "Biblioteca Visual Admin");
const PlanBatchAudit = lazy(() => import("../pages/admin/PlanBatchAudit.tsx"));
const TemplateMassReformulation = lazy(() => import("../pages/admin/TemplateMassReformulation.tsx"));

// Lazy - Modules
const PatientRegister = lazy(() => import("../pages/PatientRegister"));
const Settings = lazy(() => import("../pages/Settings"));
const Chat = lazy(() => import("../pages/Chat"));
const Appointments = lazy(() => import("../pages/Appointments"));
const Anamnesis = lazy(() => import("../pages/Anamnesis"));
const Meals = lazy(() => import("../pages/Meals"));
const Recipes = lazy(() => import("../pages/Recipes"));
const ShoppingList = lazy(() => import("../pages/ShoppingList"));
const Financial = lazy(() => import("../pages/Financial"));
const Integrations = lazy(() => import("../pages/Integrations"));
const Branding = lazy(() => import("../pages/Branding"));
const Notifications = lazy(() => import("../pages/Notifications"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Journey = lazy(() => import("../pages/Journey"));
const Achievements = lazy(() => import("../pages/Achievements"));
const Challenges = lazy(() => import("../pages/Challenges"));
const Checkin = lazy(() => import("../pages/Checkin"));
const PatientWorkouts = lazy(() => import("../pages/PatientWorkouts"));
const PersonalDashboard = lazy(() => import("../pages/PersonalDashboard"));
const BodyAnalysis = lazy(() => import("../pages/BodyAnalysis"));
const BodyProjectionExperience = lazy(() => import("../pages/BodyProjectionExperience"));
const ConsentRequired = lazy(() => import("../pages/ConsentRequired"));
const PatientMealPlan = lazy(() => import("../pages/PatientMealPlan"));
const WaterCalculator = lazy(() => import("../pages/WaterCalculator"));
const WeightCalculator = lazy(() => import("../pages/WeightCalculator"));
const MealPlans = lazy(() => import("../pages/MealPlans"));
const Supplements = lazy(() => import("../pages/Supplements"));
const Reports = lazy(() => import("../pages/Reports"));
const Library = lazyDebug(() => import("../pages/Library"), "Biblioteca");
const PatientPlanPage = lazy(() => import("../features/patient/pages/PatientPlanPage").then(m => ({ default: m.PatientPlanPage })));


const AccountDeletion = lazy(() => import("../pages/AccountDeletion"));
const DietTemplates = lazy(() => import("../pages/DietTemplates"));
const FoodDatabase = lazy(() => import("../pages/FoodDatabase"));
const AutomationCenter = lazy(() => import("../pages/AutomationCenter"));
const CampaignCenter = lazy(() => import("../pages/CampaignCenter"));
const ClinicalBrain = lazy(() => import("../pages/ClinicalBrain"));
const LabInterpreter = lazy(() => import("../pages/LabInterpreter"));
const MissionControl = lazy(() => import("../pages/MissionControl"));
const WorkspaceEditor = lazy(() => import("../pages/WorkspaceEditor"));
const PatientIntelligence = lazy(() => import("../pages/PatientIntelligence"));
const ClinicalControlTower = lazy(() => import("../pages/ClinicalControlTower"));
const TechnicalSheets = lazy(() => import("../pages/store/TechnicalSheets"));
const AdminNutritionProtocols = lazy(() => import("../pages/AdminNutritionProtocols"));
const AffiliateLanding = lazy(() => import("../pages/AffiliateLanding"));
const BiquiniBrancoDetail = lazy(() => import("../pages/BiquiniBrancoDetail"));
const ClinicalEnterprise = lazy(() => import("../pages/ClinicalEnterprise"));
const ClinicalHealthDashboard = lazy(() => import("../pages/ClinicalHealthDashboard"));
const ClinicalPipeline = lazy(() => import("../pages/ClinicalPipeline"));
const ClinicalWorkspace = lazy(() => import("../pages/ClinicalWorkspace"));
const CoachBodybuilder = lazy(() => import("../pages/CoachBodybuilder"));
const CockpitPremium = lazy(() => import("../pages/CockpitPremium"));
const Curiosidades = lazy(() => import("../pages/Curiosidades"));
const GatewayPage = lazy(() => import("../pages/GatewayPage"));
const GlobalAdaptiveIntelligence = lazy(() => import("../pages/GlobalAdaptiveIntelligence"));
const HybridPlanBuilder = lazy(() => import("../pages/HybridPlanBuilder"));
const IntakeOnboarding = lazy(() => import("../pages/IntakeOnboarding"));
const IntelligenceSettings = lazy(() => import("../pages/IntelligenceSettings"));
const InvitationStatus = lazy(() => import("../pages/InvitationStatus"));
const MagicJourneyStory = lazy(() => import("../pages/MagicJourneyStory"));
const MobileQA = lazy(() => import("../pages/MobileQA"));
const OnboardingPaciente = lazy(() => import("../pages/OnboardingPaciente"));
const OnboardingPipeline = lazy(() => import("../pages/OnboardingPipeline"));
const OnboardingProfissional = lazy(() => import("../pages/OnboardingProfissional"));
const PatientDiagnostic = lazy(() => import("../pages/PatientDiagnostic"));
const PatientLanding = lazy(() => import("../pages/PatientLanding"));
const PatientOverview = lazy(() => import("../pages/PatientOverview"));
const PaymentRequired = lazy(() => import("../pages/PaymentRequired"));
const PaymentSuccess = lazy(() => import("../pages/PaymentSuccess"));
const PersonalLanding = lazy(() => import("../pages/PersonalLanding"));
const PhysicalAssessment = lazy(() => import("../pages/PhysicalAssessment"));
const PhysiologicalIntelligence = lazy(() => import("../pages/PhysiologicalIntelligence"));
const PlanAudit = lazy(() => import("../pages/PlanAudit"));
const PreviewPatient = lazy(() => import("../pages/PreviewPatient"));
const PublicBooking = lazy(() => import("../pages/PublicBooking"));
const PublicPlans = lazy(() => import("../pages/PublicPlans"));
const PublicProfile = lazy(() => import("../pages/PublicProfile"));
const PublicProgram = lazy(() => import("../pages/PublicProgram"));
const QuickLink = lazy(() => import("../pages/QuickLink"));
const StatusPage = lazy(() => import("../pages/StatusPage"));
const WhatsAppSettings = lazy(() => import("../pages/WhatsAppSettings"));
const StoreDashboard = lazy(() => import("../pages/store/StoreDashboard"));
const StoreProducts = lazy(() => import("../pages/store/StoreProducts"));
const GrowthDashboard = lazy(() => import("../pages/GrowthDashboard"));
const AdminGuideEngine = lazy(() => import("../pages/AdminGuideEngine"));
const AdminLandingPages = lazy(() => import("../pages/AdminLandingPages"));
const AdminMarketingContent = lazy(() => import("../pages/AdminMarketingContent"));
const AdminMenuConfig = lazy(() => import("../pages/AdminMenuConfig"));
const AdminPatientFeatures = lazy(() => import("../pages/AdminPatientFeatures"));
const AdminProtocolBiquiniBranco = lazy(() => import("../pages/AdminProtocolBiquiniBranco"));
const AdminProtocolFitJourney = lazy(() => import("../pages/AdminProtocolFitJourney"));
const ImportPatients = lazy(() => import("../pages/ImportPatients"));
const ClinicalAutomation = lazy(() => import("../pages/ClinicalAutomation"));
const ClinicalIntelligence = lazy(() => import("../pages/ClinicalIntelligence"));
const ClinicalLab = lazy(() => import("../pages/ClinicalLab"));
const ClinicalOrchestration = lazy(() => import("../pages/ClinicalOrchestration"));
const ClinicalPredictions = lazy(() => import("../pages/ClinicalPredictions"));
const ClinicalRiskDashboard = lazy(() => import("../pages/ClinicalRiskDashboard"));
const ClinicalSimulation = lazy(() => import("../pages/ClinicalSimulation"));
const ClinicalCRM = lazy(() => import("../pages/ClinicalCRM"));
const PersonalStudents = lazy(() => import("../pages/PersonalStudents"));
const PersonalWorkouts = lazy(() => import("../pages/PersonalWorkouts"));
const CheckinPanel = lazy(() => import("../pages/CheckinPanel"));
const Checklist = lazy(() => import("../pages/Checklist"));
const Feedbacks = lazy(() => import("../pages/Feedbacks"));
const FitnessAnamnesis = lazy(() => import("../pages/FitnessAnamnesis"));
const GlobalTips = lazy(() => import("../pages/GlobalTips"));
const HealthCheckQuiz = lazy(() => import("../pages/HealthCheckQuiz"));
const HumanPerformance = lazy(() => import("../pages/HumanPerformance"));
const InOfficeSelector = lazy(() => import("../pages/InOfficeSelector"));
const InvitePatient = lazy(() => import("../pages/InvitePatient"));
const MetabolicTwin = lazy(() => import("../pages/MetabolicTwin"));
const MyPublicProfile = lazy(() => import("../pages/MyPublicProfile"));
const MyReferrals = lazy(() => import("../pages/MyReferrals"));
const OnboardingTracker = lazy(() => import("../pages/OnboardingTracker"));
const Planner = lazy(() => import("../pages/Planner"));
const PopulationIntelligence = lazy(() => import("../pages/PopulationIntelligence"));
const PopulationNutritionIntelligence = lazy(() => import("../pages/PopulationNutritionIntelligence"));
const ProfessionalGuide = lazy(() => import("../pages/ProfessionalGuide"));
const Programs = lazy(() => import("../pages/Programs"));
const ProgramDetail = lazy(() => import("../pages/ProgramDetail"));
const ProtocolTransitions = lazy(() => import("../pages/ProtocolTransitions"));
const PhytotherapyProtocols = lazy(() => import("../pages/PhytotherapyProtocols"));
const Protocols = lazy(() => import("../pages/Protocols"));
const RecipeBuilder = lazy(() => import("../pages/RecipeBuilder"));
const SecurityDashboard = lazy(() => import("../pages/SecurityDashboard"));
const TeamManagement = lazy(() => import("../pages/TeamManagement"));
const TherapeuticIntelligence = lazy(() => import("../pages/TherapeuticIntelligence"));
const UserGuide = lazy(() => import("../pages/UserGuide"));
const WeeklyGoals = lazy(() => import("../pages/WeeklyGoals"));
const WeeklyReport = lazy(() => import("../pages/WeeklyReport"));
const WeightTrajectory = lazy(() => import("../pages/WeightTrajectory"));
const AdminPrestige = lazy(() => import("../pages/AdminPrestige"));
const OperationalDashboard = lazy(() => import("../pages/OperationalDashboard"));
const AmbassadorDashboard = lazy(() => import("../pages/AmbassadorDashboard"));
const InOfficeWizard = lazy(() => import("../pages/InOfficeWizard"));
const SystemPresentation = lazy(() => import("../pages/SystemPresentation"));
const PlatformGovernance = lazy(() => import("../pages/PlatformGovernance"));
const SystemAudit = lazy(() => import("../pages/SystemAudit"));
const SystemDiagnostics = lazy(() => import("../pages/SystemDiagnostics"));
const SystemHealthLive = lazy(() => import("../pages/SystemHealthLive"));
const RealtimeDebugCenter = lazy(() => import("../pages/RealtimeDebugCenter"));
const SchemaMonitor = lazy(() => import("../pages/SchemaMonitor"));
const BiquiniBrancoLanding = lazy(() => import("../pages/BiquiniBrancoLanding"));
const PublicDemo = lazy(() => import("../pages/PublicDemo"));
const DiagnosticStatus = lazy(() => import("../pages/DiagnosticStatus"));
const TestDeploy = lazy(() => import("../pages/TestDeploy"));
const AdminOperationalCosts = lazy(() => import("../pages/AdminOperationalCosts"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("../pages/TermsOfUse"));
const SystemAuditLogs = lazy(() => import("../pages/AuditLogs"));
const Pricing = lazy(() => import("../pages/Pricing"));
const Landing = lazy(() => import("../pages/Landing"));

function LP({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, user, error } = useAuth();
  
  if (authStatus === "loading") {
    console.log("[ProtectedRoute] Estado: LOADING. Renderizando PageLoader.");
    return <PageLoader />;
  }

  if (authStatus === "error") {
    logError("auth_error", "ProtectedRoute", error?.message || "Erro desconhecido de autenticação", { error });
    console.error("[ProtectedRoute] Estado: ERRO.", error);
    // ... keep existing code
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Falha na Autenticação</h2>
          <p className="text-zinc-400">
            {error?.message || "Não foi possível verificar sua sessão. Isso pode ser um problema temporário de conexão."}
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => window.location.href = "/auth"}
              className="w-full py-3 bg-zinc-900 text-white font-semibold rounded-lg hover:bg-zinc-800 transition-colors border border-zinc-800"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (authStatus === "unauthenticated") {
    console.warn("[ProtectedRoute] Estado: NÃO AUTENTICADO. Redirecionando para /auth.");
    return <Navigate to="/auth" replace />;
  }

  if (!children) {
    console.error("[ProtectedRoute] ERRO: Children está vazio.");
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function DashboardRedirect() {
  const { isNutritionist, isPersonal, isAdmin, authStatus, user } = useAuth();
  
  if (authStatus === "loading") {
    console.log("[DashboardRedirect] Auth Loading...");
    return <PageLoader />;
  }
  
  if (authStatus === "unauthenticated") {
    console.warn("[DashboardRedirect] Não autenticado. Volta para /auth");
    return <Navigate to="/auth" replace />;
  }
  
  console.log(`[DashboardRedirect] Usuário: ${user?.id} | Roles: Nutri=${isNutritionist}, Personal=${isPersonal}, Admin=${isAdmin}`);

  if (isNutritionist || isPersonal || isAdmin) {
    console.log("[DashboardRedirect] Redirecionando para /admin/dashboard");
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  console.log("[DashboardRedirect] Redirecionando para /client/dashboard");
  return <Navigate to="/client/dashboard" replace />;
}

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, isNutritionist, isAdmin } = useAuth();
  
  if (authStatus === "loading") return <PageLoader />;
  if (authStatus === "unauthenticated") return <Navigate to="/auth" replace />;
  if (!isNutritionist && !isAdmin) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function PaymentGuardedPatientRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, isPatient, isNutritionist, isAdmin } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();

  // Onboarding Determinístico: Intenção prevalece sobre roles do backend (Regra 3)
  const isInvitedPatient = localStorage.getItem("fj_invited") === "true";

  if (authStatus === "loading" || consentLoading) return <PageLoader />;
  if (authStatus === "unauthenticated") return <Navigate to="/auth" replace />;
  
  if (isNutritionist || isAdmin) return <>{children}</>;

  // Se for paciente (por role ou intenção) e não tiver consentimento
  if ((isPatient || isInvitedPatient) && !hasConsent && !["/consent", "/auth", "/settings", "/welcome", "/onboarding"].some(r => location.pathname.startsWith(r))) {
    return <Navigate to="/consent" replace />;
  }
  return <>{children}</>;
}

function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={target} replace />;
}

export const AppRoutes = () => {
  const { isDegraded, isOrphan } = useAppState();
  
  return (
    <div className="min-h-screen">
      {isDegraded && <DegradedModeBanner />}
      {isOrphan && <HardFailLinkage />}
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <SystemStateGuard>
            <ExperienceRouteGuard />
            <WorkspaceRouteGuard />
            <StabilityZone name="Navegação Principal">
              <Routes>
                {/* Home */}
                <Route path="/" element={<LP section="Início"><Index /></LP>} />
                
                {/* Redirects */}
                <Route path="/dashboard" element={<DashboardRedirect />} />
                <Route path="/dashboard/*" element={<DashboardRedirect />} />
                <Route path="/professional" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/professional/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/pacientes" element={<Navigate to="/patients" replace />} />
                <Route path="/pacientes/:patientId" element={<RedirectWithParams to="/patients/:patientId" />} />
                <Route path="/pacientes/*" element={<Navigate to="/patients" replace />} />
                <Route path="/paciente" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/paciente/dashboard" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/paciente/*" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/biblioteca" element={<Navigate to="/library" replace />} />
                <Route path="/landing" element={<Landing />} />

                {/* Auth */}
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Patient Plan Sharing - Public Routes */}
          <Route path="/patient/view/:token" element={<PatientPlanPage />} />
          <Route path="/patient/plan/:id" element={<ProtectedRoute><PatientPlanPage /></ProtectedRoute>} />

                <Route path="/cadastro" element={<LP section="Cadastro"><PatientRegister /></LP>} />
                
                {/* Core Shared */}
                <Route path="/settings" element={<ProtectedRoute><LP section="Configurações"><Settings /></LP></ProtectedRoute>} />
                <Route path="/settings/account-deletion" element={<ProtectedRoute><LP section="Excluir Conta"><AccountDeletion /></LP></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><LP section="Chat"><Chat /></LP></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><LP section="Agenda"><Appointments /></LP></ProtectedRoute>} />
                <Route path="/anamnesis" element={<ProtectedRoute><LP section="Anamnese"><Anamnesis /></LP></ProtectedRoute>} />
                <Route path="/meals" element={<ProtectedRoute><LP section="Refeições"><Meals /></LP></ProtectedRoute>} />
                <Route path="/recipes" element={<ProtectedRoute><LP section="Receitas"><Recipes /></LP></ProtectedRoute>} />
                <Route path="/shopping-list" element={<ProtectedRoute><LP section="Lista de Compras"><ShoppingList /></LP></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><LP section="Notificações"><Notifications /></LP></ProtectedRoute>} />
                <Route path="/ranking" element={<ProtectedRoute><LP section="Ranking"><GlobalRanking /></LP></ProtectedRoute>} />
                <Route path="/library" element={<ProtectedRoute><LP section="Biblioteca"><StabilityZone name="Biblioteca"><Library /></StabilityZone></LP></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><LP section="Relatórios"><Reports /></LP></ProtectedRoute>} />
                <Route path="/supplements" element={<ProtectedRoute><LP section="Suplementos"><Supplements /></LP></ProtectedRoute>} />
                <Route path="/body-analysis" element={<ProtectedRoute><LP section="Análise Corporal"><BodyAnalysis /></LP></ProtectedRoute>} />
                <Route path="/body-projection" element={<ProtectedRoute><LP section="Projeção Corporal"><BodyProjectionExperience /></LP></ProtectedRoute>} />
                <Route path="/physical-assessment" element={<ProtectedRoute><LP section="Avaliação Física"><PhysicalAssessment /></LP></ProtectedRoute>} />
                <Route path="/global-tips" element={<ProtectedRoute><LP section="Dicas Globais"><GlobalTips /></LP></ProtectedRoute>} />
                 <Route path="/consent" element={<LP section="Consentimento"><ConsentRequired /></LP>} />
                 <Route path="/hard-fail-linkage" element={<HardFailLinkage />} />
                <Route path="/audit-logs" element={<NutritionistRoute><LP section="Logs do Sistema"><SystemAuditLogs /></LP></NutritionistRoute>} />
                <Route path="/curiosidades" element={<ProtectedRoute><LP section="Curiosidades"><Curiosidades /></LP></ProtectedRoute>} />
                <Route path="/feedbacks" element={<ProtectedRoute><LP section="Feedbacks"><Feedbacks /></LP></ProtectedRoute>} />
                <Route path="/gateway" element={<LP section="Portal"><GatewayPage /></LP>} />
                <Route path="/global-adaptive" element={<ProtectedRoute><LP section="IA Adaptativa"><GlobalAdaptiveIntelligence /></LP></ProtectedRoute>} />
                <Route path="/in-office-wizard" element={<Navigate to="/in-office" replace />} />
                <Route path="/intake" element={<LP section="Onboarding de Entrada"><IntakeOnboarding /></LP>} />
                <Route path="/invitation/:code" element={<LP section="Convite"><Invitation /></LP>} />
                <Route path="/convite/:code" element={<LP section="Convite"><Invitation /></LP>} />
                <Route path="/invitation-status/:id" element={<LP section="Status do Convite"><InvitationStatus /></LP>} />
                <Route path="/magic-journey" element={<ProtectedRoute><LP section="Jornada Mágica"><MagicJourneyStory /></LP></ProtectedRoute>} />
                <Route path="/mobile-qa" element={<NutritionistRoute><LP section="QA Mobile"><MobileQA /></LP></NutritionistRoute>} />
                <Route path="/operational" element={<NutritionistRoute><LP section="Painel Operacional"><OperationalDashboard /></LP></NutritionistRoute>} />
                <Route path="/patient-diagnostic" element={<NutritionistRoute><LP section="Diagnóstico de Paciente"><PatientDiagnostic /></LP></NutritionistRoute>} />
                <Route path="/preview-patient" element={<NutritionistRoute><LP section="Preview de Paciente"><PreviewPatient /></LP></NutritionistRoute>} />
                <Route path="/pricing" element={<LP section="Preços"><Pricing /></LP>} />
                <Route path="/privacy" element={<LP section="Privacidade"><PrivacyPolicy /></LP>} />
                <Route path="/terms" element={<LP section="Termos de Uso"><TermsOfUse /></LP>} />
                <Route path="/demo" element={<LP section="Demonstração"><PublicDemo /></LP>} />
                <Route path="/q/:id" element={<LP section="Link Rápido"><QuickLink /></LP>} />
                <Route path="/debug" element={<NutritionistRoute><LP section="Centro de Debug"><RealtimeDebugCenter /></LP></NutritionistRoute>} />
                <Route path="/schema" element={<NutritionistRoute><LP section="Monitor de Schema"><SchemaMonitor /></LP></NutritionistRoute>} />
                <Route path="/weekly-goals" element={<ProtectedRoute><LP section="Metas Semanais"><WeeklyGoals /></LP></ProtectedRoute>} />
                <Route path="/onboarding/paciente" element={<StabilityZone name="Onboarding"><LP section="Onboarding Paciente"><OnboardingPaciente /></LP></StabilityZone>} />
                <Route path="/onboarding/pipeline" element={<NutritionistRoute><StabilityZone name="Onboarding Pipeline"><LP section="Pipeline de Onboarding"><OnboardingPipeline /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/payment-required" element={<ProtectedRoute><LP section="Pagamento Pendente"><PaymentRequired /></LP></ProtectedRoute>} />
                <Route path="/payment-success" element={<ProtectedRoute><LP section="Pagamento Confirmado"><PaymentSuccess /></LP></ProtectedRoute>} />

                {/* Professional Routes */}
                <Route path="/patients" element={<NutritionistRoute><LP section="Pacientes"><Patients /></LP></NutritionistRoute>} />
                <Route path="/patients/:patientId" element={<NutritionistRoute><LP section="Detalhes do Paciente"><PatientDetail /></LP></NutritionistRoute>} />
                <Route path="/financial" element={<NutritionistRoute><LP section="Financeiro"><Financial /></LP></NutritionistRoute>} />
                <Route path="/integrations" element={<NutritionistRoute><LP section="Integrações"><Integrations /></LP></NutritionistRoute>} />
                <Route path="/branding" element={<NutritionistRoute><LP section="Marca"><Branding /></LP></NutritionistRoute>} />
                <Route path="/diet-builder" element={<NutritionistRoute><StabilityZone name="Diet Builder"><LP section="Diet Builder"><DietBuilder /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/diet-templates" element={<NutritionistRoute><LP section="Templates de Dieta"><DietTemplates /></LP></NutritionistRoute>} />
                <Route path="/food-database" element={<NutritionistRoute><LP section="Banco de Alimentos"><FoodDatabase /></LP></NutritionistRoute>} />
                <Route path="/admin/nutrition-protocols" element={<NutritionistRoute><LP section="Protocolos de Nutrição"><AdminNutritionProtocols /></LP></NutritionistRoute>} />
                <Route path="/admin/whatsapp" element={<NutritionistRoute><LP section="Config WhatsApp"><WhatsAppSettings /></LP></NutritionistRoute>} />
                <Route path="/clinical-workspace" element={<NutritionistRoute><LP section="Workspace Clínico"><ClinicalWorkspace /></LP></NutritionistRoute>} />
                <Route path="/coach/bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
                <Route path="/cockpit-premium" element={<NutritionistRoute><LP section="Cockpit Premium"><CockpitPremium /></LP></NutritionistRoute>} />
                <Route path="/hybrid-plan-builder" element={<NutritionistRoute><LP section="Plan Builder Híbrido"><HybridPlanBuilder /></LP></NutritionistRoute>} />
                <Route path="/intelligence-settings" element={<NutritionistRoute><LP section="Config Inteligência"><IntelligenceSettings /></LP></NutritionistRoute>} />
                <Route path="/patient-overview" element={<NutritionistRoute><LP section="Visão Geral do Paciente"><PatientOverview /></LP></NutritionistRoute>} />
                <Route path="/plan-audit" element={<NutritionistRoute><LP section="Auditoria de Planos"><PlanAudit /></LP></NutritionistRoute>} />
                <Route path="/in-office" element={<NutritionistRoute><LP section="Modo Consultório"><InOfficeSelector /></LP></NutritionistRoute>} />
                <Route path="/in-office/:patientId" element={<NutritionistRoute><LP section="Assistente de Consultório"><InOfficeWizard /></LP></NutritionistRoute>} />
                <Route path="/invite-patient" element={<NutritionistRoute><LP section="Convidar Paciente"><InvitePatient /></LP></NutritionistRoute>} />
                <Route path="/automation" element={<NutritionistRoute><LP section="Automação"><AutomationCenter /></LP></NutritionistRoute>} />
                <Route path="/clinical-brain" element={<NutritionistRoute><LP section="Cérebro Clínico"><ClinicalBrain /></LP></NutritionistRoute>} />
                <Route path="/lab-interpreter" element={<NutritionistRoute><LP section="Intérprete de Exames"><LabInterpreter /></LP></NutritionistRoute>} />
                <Route path="/mission-control" element={<NutritionistRoute><LP section="Controle de Missão"><MissionControl /></LP></NutritionistRoute>} />
                <Route path="/workspace" element={<NutritionistRoute><StabilityZone name="Workspace Editor"><LP section="Workspace"><WorkspaceEditor /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/control-tower" element={<NutritionistRoute><LP section="Torre de Controle"><ClinicalControlTower /></LP></NutritionistRoute>} />
                <Route path="/programs" element={<NutritionistRoute><LP section="Programas"><Programs /></LP></NutritionistRoute>} />
                <Route path="/programs/:id" element={<NutritionistRoute><LP section="Detalhes do Programa"><ProgramDetail /></LP></NutritionistRoute>} />
                <Route path="/checkin-panel" element={<NutritionistRoute><LP section="Painel de Check-in"><CheckinPanel /></LP></NutritionistRoute>} />
                <Route path="/planner" element={<NutritionistRoute><LP section="Planner"><Planner /></LP></NutritionistRoute>} />
                <Route path="/ambassador" element={<NutritionistRoute><LP section="Embaixador"><AmbassadorDashboard /></LP></NutritionistRoute>} />
                <Route path="/clinical-intelligence" element={<NutritionistRoute><LP section="Inteligência Clínica"><ClinicalIntelligence /></LP></NutritionistRoute>} />
                <Route path="/weekly-report" element={<NutritionistRoute><LP section="Relatório Semanal"><WeeklyReport /></LP></NutritionistRoute>} />
                <Route path="/my-public-profile" element={<NutritionistRoute><LP section="Perfil Público"><MyPublicProfile /></LP></NutritionistRoute>} />
                <Route path="/my-referrals" element={<NutritionistRoute><LP section="Indicações"><MyReferrals /></LP></NutritionistRoute>} />
                <Route path="/professional-guide" element={<NutritionistRoute><LP section="Guia Profissional"><ProfessionalGuide /></LP></NutritionistRoute>} />
                <Route path="/clinical-risk" element={<NutritionistRoute><LP section="Risco Clínico"><ClinicalRiskDashboard /></LP></NutritionistRoute>} />
                <Route path="/clinical-automation" element={<NutritionistRoute><LP section="Automação Clínica"><ClinicalAutomation /></LP></NutritionistRoute>} />
                <Route path="/clinical-lab" element={<NutritionistRoute><LP section="Laboratório Clínico"><ClinicalLab /></LP></NutritionistRoute>} />
                <Route path="/clinical-orchestration" element={<NutritionistRoute><LP section="Orquestração Clínica"><ClinicalOrchestration /></LP></NutritionistRoute>} />
                <Route path="/clinical-predictions" element={<NutritionistRoute><LP section="Predições Clínicas"><ClinicalPredictions /></LP></NutritionistRoute>} />
                <Route path="/clinical-simulation" element={<NutritionistRoute><LP section="Simulação Clínica"><ClinicalSimulation /></LP></NutritionistRoute>} />
                <Route path="/clinical-crm" element={<NutritionistRoute><LP section="CRM Clínico"><ClinicalCRM /></LP></NutritionistRoute>} />
                <Route path="/personal/dashboard" element={<NutritionistRoute><StabilityZone name="Dashboard Personal"><LP section="Dashboard Personal"><PersonalDashboard /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/personal/students" element={<NutritionistRoute><LP section="Alunos Personal"><PersonalStudents /></LP></NutritionistRoute>} />
                <Route path="/personal/workouts" element={<NutritionistRoute><LP section="Treinos Personal"><PersonalWorkouts /></LP></NutritionistRoute>} />
                <Route path="/import-patients" element={<NutritionistRoute><LP section="Importar Pacientes"><ImportPatients /></LP></NutritionistRoute>} />
                <Route path="/clinical-health" element={<NutritionistRoute><LP section="Saúde Clínica"><ClinicalHealthDashboard /></LP></NutritionistRoute>} />
                <Route path="/clinical-pipeline" element={<NutritionistRoute><LP section="Pipeline Clínico"><ClinicalPipeline /></LP></NutritionistRoute>} />
                <Route path="/clinical-enterprise" element={<NutritionistRoute><LP section="Empresa Clínica"><ClinicalEnterprise /></LP></NutritionistRoute>} />
                <Route path="/coach-bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
                <Route path="/recipe-builder" element={<NutritionistRoute><StabilityZone name="Recipe Builder"><LP section="Editor de Receitas"><RecipeBuilder /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/protocols" element={<NutritionistRoute><LP section="Protocolos"><Protocols /></LP></NutritionistRoute>} />
                <Route path="/therapeutic-intelligence" element={<NutritionistRoute><LP section="Inteligência Terapêutica"><TherapeuticIntelligence /></LP></NutritionistRoute>} />
                <Route path="/weight-trajectory" element={<NutritionistRoute><LP section="Trajetória de Peso"><WeightTrajectory /></LP></NutritionistRoute>} />
                <Route path="/metabolic-twin" element={<NutritionistRoute><LP section="Gêmeo Metabólico"><MetabolicTwin /></LP></NutritionistRoute>} />
                <Route path="/physiological-intelligence" element={<NutritionistRoute><LP section="Inteligência Fisiológica"><PhysiologicalIntelligence /></LP></NutritionistRoute>} />
                <Route path="/population-intelligence" element={<NutritionistRoute><LP section="Inteligência Populacional"><PopulationIntelligence /></LP></NutritionistRoute>} />
                <Route path="/population-nutrition" element={<NutritionistRoute><LP section="Nutrição Populacional"><PopulationNutritionIntelligence /></LP></NutritionistRoute>} />
                <Route path="/protocol-transitions" element={<NutritionistRoute><LP section="Transições de Protocolo"><ProtocolTransitions /></LP></NutritionistRoute>} />
                <Route path="/security-dashboard" element={<NutritionistRoute><LP section="Segurança"><SecurityDashboard /></LP></NutritionistRoute>} />
                <Route path="/team" element={<NutritionistRoute><LP section="Gestão de Equipe"><TeamManagement /></LP></NutritionistRoute>} />
                <Route path="/onboarding" element={<OnboardingEntry />} />
                <Route path="/onboarding/profissional" element={<NutritionistRoute><LP section="Onboarding Profissional"><OnboardingProfissional /></LP></NutritionistRoute>} />
                <Route path="/fitness-anamnesis" element={<NutritionistRoute><LP section="Anamnese Fitness"><FitnessAnamnesis /></LP></NutritionistRoute>} />
                <Route path="/cockpit" element={<NutritionistRoute><LP section="Cockpit Premium"><CockpitPremium /></LP></NutritionistRoute>} />
                <Route path="/store" element={<NutritionistRoute><LP section="Loja"><StoreDashboard /></LP></NutritionistRoute>} />
                <Route path="/store/products" element={<NutritionistRoute><LP section="Produtos Loja"><StoreProducts /></LP></NutritionistRoute>} />
                <Route path="/store/technical-sheets" element={<NutritionistRoute><LP section="Fichas Técnicas"><TechnicalSheets /></LP></NutritionistRoute>} />
                <Route path="/onboarding-tracker" element={<NutritionistRoute><LP section="Tracker Onboarding"><OnboardingTracker /></LP></NutritionistRoute>} />
                <Route path="/admin/mission-control" element={<NutritionistRoute><LP section="Controle de Missão Admin"><MissionControl /></LP></NutritionistRoute>} />
                <Route path="/admin/campaigns" element={<NutritionistRoute><LP section="Centro de Campanhas"><CampaignCenter /></LP></NutritionistRoute>} />
                <Route path="/professional/crm" element={<NutritionistRoute><LP section="CRM Profissional"><ClinicalCRM /></LP></NutritionistRoute>} />
                <Route path="/apresentacao" element={<LP section="Apresentação do Sistema"><SystemPresentation /></LP>} />
                <Route path="/user-guide" element={<LP section="Guia do Usuário"><UserGuide /></LP>} />
                <Route path="/analyze-meal" element={<NutritionistRoute><LP section="Análise de Refeição"><AnalyzeMeal /></LP></NutritionistRoute>} />
                <Route path="/patient-intelligence" element={<ProtectedRoute><LP section="Inteligência do Paciente"><PatientIntelligence /></LP></ProtectedRoute>} />
                <Route path="/system-audit" element={<NutritionistRoute><LP section="Auditoria do Sistema"><SystemAudit /></LP></NutritionistRoute>} />
                <Route path="/human-performance" element={<ProtectedRoute><LP section="Performance Humana"><HumanPerformance /></LP></ProtectedRoute>} />
                <Route path="/protocolos-fitoterapicos" element={<NutritionistRoute><LP section="Protocolos Fitoterápicos"><PhytotherapyProtocols /></LP></NutritionistRoute>} />
                <Route path="/portfolio-analytics" element={<NutritionistRoute><LP section="Analytics de Portfolio"><ProfessionalClinicalAnalytics /></LP></NutritionistRoute>} />
                <Route path="/clinical-analytics" element={<NutritionistRoute><LP section="Analytics Clínico"><ClinicalHealthDashboard /></LP></NutritionistRoute>} />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={<NutritionistRoute><StabilityZone name="Dashboard Admin"><LP section="Admin Dashboard"><AdminDashboard /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/admin/audit-logs" element={<NutritionistRoute><LP section="Audit Logs"><AuditLogs /></LP></NutritionistRoute>} />
                <Route path="/admin/clinical-rules" element={<NutritionistRoute><LP section="Regras Clínicas"><ClinicalRulesAdmin /></LP></NutritionistRoute>} />
                <Route path="/admin/affiliates" element={<NutritionistRoute><LP section="Afiliados"><AdminAffiliates /></LP></NutritionistRoute>} />
                <Route path="/admin/booking-settings" element={<NutritionistRoute><LP section="Config. Agenda"><AdminBookingSettings /></LP></NutritionistRoute>} />
                <Route path="/admin/feature-control" element={<NutritionistRoute><LP section="Controle de Recursos"><AdminFeatureControl /></LP></NutritionistRoute>} />
                <Route path="/admin/pricing" element={<NutritionistRoute><LP section="Preços"><AdminPricing /></LP></NutritionistRoute>} />
                <Route path="/admin/professionals" element={<NutritionistRoute><LP section="Profissionais"><AdminProfessionals /></LP></NutritionistRoute>} />
                <Route path="/admin/subscriptions" element={<NutritionistRoute><LP section="Assinaturas"><AdminSubscriptionMonitor /></LP></NutritionistRoute>} />
                <Route path="/admin/site-editor" element={<NutritionistRoute><StabilityZone name="Site Editor"><LP section="Editor do Site"><AdminSiteEditor /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/admin/qa-checklist" element={<NutritionistRoute><LP section="Checklist QA"><QAChecklist /></LP></NutritionistRoute>} />
                <Route path="/admin/invitation-audit" element={<NutritionistRoute><LP section="Auditoria de Convites"><InvitationAudit /></LP></NutritionistRoute>} />
                <Route path="/admin/ai-usage" element={<NutritionistRoute><LP section="Uso de IA"><AIUsageDashboard /></LP></NutritionistRoute>} />
                <Route path="/admin/governance" element={<NutritionistRoute><LP section="Governança"><PlatformGovernance /></LP></NutritionistRoute>} />
                <Route path="/admin/diagnostics" element={<NutritionistRoute><LP section="Diagnóstico do Sistema"><SystemDiagnostics /></LP></NutritionistRoute>} />
                <Route path="/admin/health-live" element={<NutritionistRoute><LP section="Status em Tempo Real"><SystemHealthLive /></LP></NutritionistRoute>} />
                <Route path="/admin/growth" element={<NutritionistRoute><LP section="Growth Dashboard"><GrowthDashboard /></LP></NutritionistRoute>} />
                <Route path="/admin/resources" element={<NutritionistRoute><LP section="Recursos Admin"><AdminResourceCenter /></LP></NutritionistRoute>} />
                <Route path="/admin/landing-pages" element={<NutritionistRoute><LP section="Landing Pages Admin"><AdminLandingPages /></LP></NutritionistRoute>} />
                <Route path="/admin/features" element={<NutritionistRoute><LP section="Recursos Admin"><AdminFeatureControl /></LP></NutritionistRoute>} />
                <Route path="/admin/patient-features" element={<NutritionistRoute><LP section="Features Paciente"><AdminPatientFeatures /></LP></NutritionistRoute>} />
                <Route path="/admin/protocol-fitjourney" element={<NutritionistRoute><LP section="Protocolo FitJourney"><AdminProtocolFitJourney /></LP></NutritionistRoute>} />
                <Route path="/admin/protocol-biquini-branco" element={<NutritionistRoute><LP section="Protocolo Biquini Branco"><AdminProtocolBiquiniBranco /></LP></NutritionistRoute>} />
                <Route path="/admin/guide-engine" element={<NutritionistRoute><LP section="Guide Engine Admin"><AdminGuideEngine /></LP></NutritionistRoute>} />
                <Route path="/admin/menu-config" element={<NutritionistRoute><LP section="Config Menu Admin"><AdminMenuConfig /></LP></NutritionistRoute>} />
                <Route path="/admin/testimonials" element={<NutritionistRoute><LP section="Depoimentos Admin"><AdminTestimonials /></LP></NutritionistRoute>} />
                <Route path="/admin/prestige" element={<NutritionistRoute><LP section="Prestigio Admin"><AdminPrestige /></LP></NutritionistRoute>} />
                <Route path="/admin/biblioteca" element={<NutritionistRoute><LP section="Biblioteca Admin"><Library /></LP></NutritionistRoute>} />
                <Route path="/admin-operational-costs" element={<NutritionistRoute><LP section="Custos Operacionais Admin"><AdminOperationalCosts /></LP></NutritionistRoute>} />
                <Route path="/admin/marketing-content" element={<NutritionistRoute><LP section="Marketing Admin"><AdminMarketingContent /></LP></NutritionistRoute>} />
                <Route path="/admin/marmitas" element={<NutritionistRoute><LP section="Auditoria de Marmitas"><MarmitaAudit /></LP></NutritionistRoute>} />
                <Route path="/admin/image-fallback" element={<NutritionistRoute><LP section="Fallback de Imagem"><ImageFallbackAdmin /></LP></NutritionistRoute>} />
                <Route path="/admin/mass-reformulation" element={<NutritionistRoute><LP section="Reformulação em Massa"><TemplateMassReformulation /></LP></NutritionistRoute>} />
                <Route path="/admin/plan-batch-audit" element={<NutritionistRoute><LP section="Auditoria de Planos em Lote"><PlanBatchAudit /></LP></NutritionistRoute>} />
                <Route path="/admin/meal-coverage" element={<NutritionistRoute><LP section="Cobertura de Refeições"><MealCoverageDashboard /></LP></NutritionistRoute>} />
                <Route path="/admin/meal-visual-library" element={<NutritionistRoute><LP section="Biblioteca Visual"><MealVisualLibraryAdmin /></LP></NutritionistRoute>} />
                <Route path="/admin/experience-audit" element={<NutritionistRoute><LP section="Auditoria de Experiência"><AdminExperienceModeAudit /></LP></NutritionistRoute>} />
                <Route path="/admin/experience-reconcile" element={<NutritionistRoute><LP section="Reconciliação de Experiência"><AdminExperienceModeReconcile /></LP></NutritionistRoute>} />
                <Route path="/admin/plan-diagnostics" element={<NutritionistRoute><LP section="Diagnóstico de Carregamento"><AdminPlanLoadingDiagnostics /></LP></NutritionistRoute>} />
                <Route path="/admin/template-nutrition-audit" element={<NutritionistRoute><LP section="Auditoria Nutricional de Templates"><TemplateNutritionAudit /></LP></NutritionistRoute>} />

                {/* Patient Routes */}
                <Route path="/client/dashboard" element={<PaymentGuardedPatientRoute><StabilityZone name="Dashboard Cliente"><LP section="Dashboard"><ClientDashboard /></LP></StabilityZone></PaymentGuardedPatientRoute>} />
                <Route path="/journey" element={<PaymentGuardedPatientRoute><LP section="Jornada"><Journey /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/achievements" element={<PaymentGuardedPatientRoute><LP section="Conquistas"><Achievements /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/challenges" element={<PaymentGuardedPatientRoute><LP section="Desafios"><Challenges /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/checkin" element={<PaymentGuardedPatientRoute><LP section="Check-in"><Checkin /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/workouts" element={<PaymentGuardedPatientRoute><LP section="Treinos"><PatientWorkouts /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/meal-plans" element={<PaymentGuardedPatientRoute><LP section="Meus Planos"><MealPlans /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/my-diet" element={<PaymentGuardedPatientRoute><LP section="Minha Dieta"><PatientMealPlan /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/dieta" element={<PaymentGuardedPatientRoute><LP section="Minha Dieta"><PatientMealPlan /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/paciente/plano" element={<PaymentGuardedPatientRoute><LP section="Plano de Refeição"><PatientMealPlan /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/my-workouts" element={<PaymentGuardedPatientRoute><LP section="Meus Treinos"><PatientWorkouts /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/weight-calculator" element={<PaymentGuardedPatientRoute><LP section="Calculadora de Peso"><WeightCalculator /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/water-calculator" element={<PaymentGuardedPatientRoute><LP section="Calculadora de Água"><WaterCalculator /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/health-quiz" element={<PaymentGuardedPatientRoute><LP section="Health Check"><HealthCheckQuiz /></LP></PaymentGuardedPatientRoute>} />
                <Route path="/checklist" element={<PaymentGuardedPatientRoute><LP section="Checklist"><Checklist /></LP></PaymentGuardedPatientRoute>} />
                
                {/* Editor Routes */}
                <Route path="/meal-plans/:id" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2 /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/meal-plan-editor/:id" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2 /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/meal-plan-editor" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2Entry /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/editor-v2/:id" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2 /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/editor-v2" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2Entry /></StabilityZone></LP></NutritionistRoute>} />
                 <Route path="/v2" element={<Navigate to="/editor-v2" replace />} />
                 <Route path="/v2/:id" element={<RedirectWithParams to="/editor-v2/:id" />} />
                <Route path="/meal-plan-editor-v2/:id" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2 /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/meal-plan-editor-v2" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2Entry /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/dieta-v2/:id" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2 /></StabilityZone></LP></NutritionistRoute>} />
                <Route path="/dieta-v2" element={<NutritionistRoute><LP section="Editor de Plano"><StabilityZone name="Editor V2"><MealPlanEditorV2Entry /></StabilityZone></LP></NutritionistRoute>} />
                
                <Route path="/editor" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                {/* Editor V3 Aliases */}
                <Route path="/v3/:patientId" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/diet/v3/:patientId" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/editor-v3/:patientId" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/experimental/v3/:patientId" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/elite/v3/:patientId" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/v3" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/meal-plan-editor-v3" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />
                <Route path="/dieta-v3" element={<NutritionistRoute><StabilityZone name="Editor V3"><LP section="Editor V3"><EditorV3Page /></LP></StabilityZone></NutritionistRoute>} />

                {/* Public / Landing */}
                <Route path="/landing-paciente" element={<LP section="Para Pacientes"><PatientLanding /></LP>} />
                <Route path="/landing-personal" element={<LP section="Para Personals"><PersonalLanding /></LP>} />
                <Route path="/landing-afiliado" element={<LP section="Para Afiliados"><AffiliateLanding /></LP>} />
                <Route path="/biquini-branco" element={<LP section="Biquíni Branco"><BiquiniBrancoLanding /></LP>} />
                <Route path="/biquini-branco/:id" element={<LP section="Detalhes Biquíni Branco"><BiquiniBrancoDetail /></LP>} />
                <Route path="/status" element={<LP section="Status"><DiagnosticStatus /></LP>} />
                <Route path="/status-page" element={<LP section="Status do Sistema"><StatusPage /></LP>} />
                <Route path="/p/:slug" element={<PublicProfile />} />
                <Route path="/booking/:id" element={<PublicBooking />} />

                {/* System */}
                <Route path="/teste123" element={<TestDeploy />} />
                <Route path="/404" element={<LP section="404"><NotFound /></LP>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </StabilityZone>
          </SystemStateGuard>
        </Suspense>
      </AnimatePresence>
    </div>
  );
};
