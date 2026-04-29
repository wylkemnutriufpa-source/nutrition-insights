import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenantContext";
import { ExperienceModeContext, useExperienceModeState, useExperienceMode } from "@/hooks/useExperienceMode";
import { lazy, Suspense, useEffect } from "react";
import { AppStateProvider, useAppState } from "@/hooks/useAppState";
import { DegradedModeBanner } from "@/components/common/DegradedModeBanner";
import { HardFailLinkage } from "@/components/common/HardFailLinkage";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { GlobalErrorBoundary, CriticalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { CelebrationProvider } from "@/components/common/SuccessCelebration";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";
import { CommandPaletteProvider } from "@/components/common/CommandPalette";
import ExperienceRouteGuard from "@/components/common/ExperienceRouteGuard";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { MobileAutoFixer } from "@/components/common/MobileAutoFixer";
import { AnimatePresence } from "framer-motion";
import SafePage from "@/components/common/SafePage";
import PageLoader from "@/components/common/PageLoader";
import { SystemStateGuard } from "@/components/common/SystemStateGuard";
import { UpdateBanner } from "@/components/common/UpdateBanner";
import { BuildVersionTag } from "@/components/common/BuildVersionTag";

// Eager
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

// Lazy
const AnalyzeMeal = lazy(() => import("./pages/AnalyzeMeal"));
const Patients = lazy(() => import("./pages/Patients"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const MealPlanEditorV3 = lazy(() => import("./pages/MealPlanEditorV3Page"));
const MealPlanEditorV2 = lazy(() => import("./pages/MealPlanEditorV2"));
const MealPlanEditorV2Entry = lazy(() => import("./pages/MealPlanEditorV2Entry"));
const DietBuilder = lazy(() => import("./pages/diet-builder/DietBuilder"));
const GlobalRanking = lazy(() => import("./pages/GlobalRanking"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const ClinicalRulesAdmin = lazy(() => import("./pages/admin/ClinicalRules"));
const PatientRegister = lazy(() => import("./pages/PatientRegister"));
const Settings = lazy(() => import("./pages/Settings"));
const Chat = lazy(() => import("./pages/Chat"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Anamnesis = lazy(() => import("./pages/Anamnesis"));
const Meals = lazy(() => import("./pages/Meals"));
const Recipes = lazy(() => import("./pages/Recipes"));
const ShoppingList = lazy(() => import("./pages/ShoppingList"));
const Financial = lazy(() => import("./pages/Financial"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Branding = lazy(() => import("./pages/Branding"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Journey = lazy(() => import("./pages/Journey"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Checkin = lazy(() => import("./pages/Checkin"));
const PatientWorkouts = lazy(() => import("./pages/PatientWorkouts"));
const PersonalDashboard = lazy(() => import("./pages/PersonalDashboard"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const BodyAnalysis = lazy(() => import("./pages/BodyAnalysis"));
const BodyProjectionExperience = lazy(() => import("./pages/BodyProjectionExperience"));
const ConsentRequired = lazy(() => import("./pages/ConsentRequired"));
const PatientMealPlan = lazy(() => import("./pages/PatientMealPlan"));
const WaterCalculator = lazy(() => import("./pages/WaterCalculator"));
const WeightCalculator = lazy(() => import("./pages/WeightCalculator"));
const MealPlans = lazy(() => import("./pages/MealPlans"));
const Supplements = lazy(() => import("./pages/Supplements"));
const Reports = lazy(() => import("./pages/Reports"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const DietTemplates = lazy(() => import("./pages/DietTemplates"));
const FoodDatabase = lazy(() => import("./pages/FoodDatabase"));
const AutomationCenter = lazy(() => import("./pages/AutomationCenter"));
const CampaignCenter = lazy(() => import("./pages/CampaignCenter"));
const ClinicalBrain = lazy(() => import("./pages/ClinicalBrain"));
const LabInterpreter = lazy(() => import("./pages/LabInterpreter"));
const MissionControl = lazy(() => import("./pages/MissionControl"));
const WorkspaceEditor = lazy(() => import("./pages/WorkspaceEditor"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const AdminBookingSettings = lazy(() => import("./pages/AdminBookingSettings"));
const AdminFeatureControl = lazy(() => import("./pages/AdminFeatureControl"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const AdminProfessionals = lazy(() => import("./pages/AdminProfessionals"));
const AdminSubscriptionMonitor = lazy(() => import("./pages/AdminSubscriptionMonitor"));
const AdminSiteEditor = lazy(() => import("./pages/AdminSiteEditor"));
const AdminResourceCenter = lazy(() => import("./pages/AdminResourceCenter"));
const AdminTestimonials = lazy(() => import("./pages/AdminTestimonials"));
const PatientIntelligence = lazy(() => import("./pages/PatientIntelligence"));
const ClinicalControlTower = lazy(() => import("./pages/ClinicalControlTower"));
const TechnicalSheets = lazy(() => import("./pages/store/TechnicalSheets"));

const AdminNutritionProtocols = lazy(() => import("./pages/AdminNutritionProtocols"));
const AffiliateLanding = lazy(() => import("./pages/AffiliateLanding"));
const TestDeploy = lazy(() => import("./pages/TestDeploy"));
const BiquiniBrancoDetail = lazy(() => import("./pages/BiquiniBrancoDetail"));
const ClinicalEnterprise = lazy(() => import("./pages/ClinicalEnterprise"));
const ClinicalHealthDashboard = lazy(() => import("./pages/ClinicalHealthDashboard"));
const ClinicalPipeline = lazy(() => import("./pages/ClinicalPipeline"));
const ClinicalWorkspace = lazy(() => import("./pages/ClinicalWorkspace"));
const CoachBodybuilder = lazy(() => import("./pages/CoachBodybuilder"));
const CockpitPremium = lazy(() => import("./pages/CockpitPremium"));
const Curiosidades = lazy(() => import("./pages/Curiosidades"));
const GatewayPage = lazy(() => import("./pages/GatewayPage"));
const GlobalAdaptiveIntelligence = lazy(() => import("./pages/GlobalAdaptiveIntelligence"));
const HybridPlanBuilder = lazy(() => import("./pages/HybridPlanBuilder"));
const IntakeOnboarding = lazy(() => import("./pages/IntakeOnboarding"));
const IntelligenceSettings = lazy(() => import("./pages/IntelligenceSettings"));
const InvitationStatus = lazy(() => import("./pages/InvitationStatus"));
const MagicJourneyStory = lazy(() => import("./pages/MagicJourneyStory"));
const MobileQA = lazy(() => import("./pages/MobileQA"));
const OnboardingPaciente = lazy(() => import("./pages/OnboardingPaciente"));
const OnboardingPipeline = lazy(() => import("./pages/OnboardingPipeline"));
const OnboardingProfissional = lazy(() => import("./pages/OnboardingProfissional"));
const PatientDiagnostic = lazy(() => import("./pages/PatientDiagnostic"));
const PatientLanding = lazy(() => import("./pages/PatientLanding"));
const PatientOverview = lazy(() => import("./pages/PatientOverview"));
const PaymentRequired = lazy(() => import("./pages/PaymentRequired"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PersonalLanding = lazy(() => import("./pages/PersonalLanding"));
const PhysicalAssessment = lazy(() => import("./pages/PhysicalAssessment"));
const PhysiologicalIntelligence = lazy(() => import("./pages/PhysiologicalIntelligence"));
const PlanAudit = lazy(() => import("./pages/PlanAudit"));
const PreviewPatient = lazy(() => import("./pages/PreviewPatient"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const PublicPlans = lazy(() => import("./pages/PublicPlans"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PublicProgram = lazy(() => import("./pages/PublicProgram"));
const QuickLink = lazy(() => import("./pages/QuickLink"));
const StatusPage = lazy(() => import("./pages/StatusPage"));

const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const StoreDashboard = lazy(() => import("./pages/store/StoreDashboard"));
const StoreProducts = lazy(() => import("./pages/store/StoreProducts"));

// NOVOS LAZY IMPORTS RECONCILIADOS

const AdminOperationalCosts = lazy(() => import("./pages/AdminOperationalCosts"));
const GrowthDashboard = lazy(() => import("./pages/GrowthDashboard"));
const AdminGuideEngine = lazy(() => import("./pages/AdminGuideEngine"));
const AdminLandingPages = lazy(() => import("./pages/AdminLandingPages"));
const AdminMarketingContent = lazy(() => import("./pages/AdminMarketingContent"));
const AdminMenuConfig = lazy(() => import("./pages/AdminMenuConfig"));
const AdminPatientFeatures = lazy(() => import("./pages/AdminPatientFeatures"));
const AdminProtocolBiquiniBranco = lazy(() => import("./pages/AdminProtocolBiquiniBranco"));
const AdminProtocolFitJourney = lazy(() => import("./pages/AdminProtocolFitJourney"));
const ImportPatients = lazy(() => import("./pages/ImportPatients"));
const ProfessionalClinicalAnalytics = lazy(() => import("./pages/ProfessionalClinicalAnalytics"));
const ClinicalAutomation = lazy(() => import("./pages/ClinicalAutomation"));
const ClinicalIntelligence = lazy(() => import("./pages/ClinicalIntelligence"));
const ClinicalLab = lazy(() => import("./pages/ClinicalLab"));
const ClinicalOrchestration = lazy(() => import("./pages/ClinicalOrchestration"));
const ClinicalPredictions = lazy(() => import("./pages/ClinicalPredictions"));
const ClinicalRiskDashboard = lazy(() => import("./pages/ClinicalRiskDashboard"));
const ClinicalSimulation = lazy(() => import("./pages/ClinicalSimulation"));
const ClinicalCRM = lazy(() => import("./pages/ClinicalCRM"));
const PersonalStudents = lazy(() => import("./pages/PersonalStudents"));
const PersonalWorkouts = lazy(() => import("./pages/PersonalWorkouts"));
const CheckinPanel = lazy(() => import("./pages/CheckinPanel"));
const Checklist = lazy(() => import("./pages/Checklist"));
const Feedbacks = lazy(() => import("./pages/Feedbacks"));
const FitnessAnamnesis = lazy(() => import("./pages/FitnessAnamnesis"));
const GlobalTips = lazy(() => import("./pages/GlobalTips"));
const HealthCheckQuiz = lazy(() => import("./pages/HealthCheckQuiz"));
const HumanPerformance = lazy(() => import("./pages/HumanPerformance"));
const InOfficeSelector = lazy(() => import("./pages/InOfficeSelector"));
const InvitePatient = lazy(() => import("./pages/InvitePatient"));
const Library = lazy(() => import("./pages/Library"));
const MetabolicTwin = lazy(() => import("./pages/MetabolicTwin"));
const MyPublicProfile = lazy(() => import("./pages/MyPublicProfile"));
const MyReferrals = lazy(() => import("./pages/MyReferrals"));
const OnboardingTracker = lazy(() => import("./pages/OnboardingTracker"));
const Planner = lazy(() => import("./pages/Planner"));
const PopulationIntelligence = lazy(() => import("./pages/PopulationIntelligence"));
const PopulationNutritionIntelligence = lazy(() => import("./pages/PopulationNutritionIntelligence"));
const ProfessionalGuide = lazy(() => import("./pages/ProfessionalGuide"));
const Programs = lazy(() => import("./pages/Programs"));
const ProtocolTransitions = lazy(() => import("./pages/ProtocolTransitions"));
const PhytotherapyProtocols = lazy(() => import("./pages/PhytotherapyProtocols"));
const Protocols = lazy(() => import("./pages/Protocols"));
const RecipeBuilder = lazy(() => import("./pages/RecipeBuilder"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TherapeuticIntelligence = lazy(() => import("./pages/TherapeuticIntelligence"));
const UserGuide = lazy(() => import("./pages/UserGuide"));
const WeeklyGoals = lazy(() => import("./pages/WeeklyGoals"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));
const WeightTrajectory = lazy(() => import("./pages/WeightTrajectory"));
const AdminPrestige = lazy(() => import("./pages/AdminPrestige"));
const OperationalDashboard = lazy(() => import("./pages/OperationalDashboard"));
const ClinicalBrainLegacy = lazy(() => import("./pages/ClinicalBrain"));
const AmbassadorDashboard = lazy(() => import("./pages/AmbassadorDashboard"));
const InOfficeWizard = lazy(() => import("./pages/InOfficeWizard"));
const SystemPresentation = lazy(() => import("./pages/SystemPresentation"));
const QAChecklist = lazy(() => import("./pages/admin/QAChecklistPage"));
const InvitationAudit = lazy(() => import("./pages/InvitationAudit"));
const TemplateNutritionAudit = lazy(() => import("./pages/admin/TemplateNutritionAudit.tsx"));
const AIUsageDashboard = lazy(() => import("./pages/admin/AIUsageDashboard.tsx"));
const AdminExperienceModeAudit = lazy(() => import("./pages/admin/AdminExperienceModeAudit.tsx"));
const AdminExperienceModeReconcile = lazy(() => import("./pages/admin/AdminExperienceModeReconcile.tsx"));
const AdminPlanLoadingDiagnostics = lazy(() => import("./pages/admin/AdminPlanLoadingDiagnostics.tsx"));
const ImageFallbackAdmin = lazy(() => import("./pages/admin/ImageFallbackAdmin.tsx"));
const MarmitaAudit = lazy(() => import("./pages/admin/MarmitaAudit.tsx"));
const MealCoverageDashboard = lazy(() => import("./pages/admin/MealCoverageDashboard.tsx"));
const MealVisualLibraryAdmin = lazy(() => import("./pages/admin/MealVisualLibraryAdmin.tsx"));
const PlanBatchAudit = lazy(() => import("./pages/admin/PlanBatchAudit.tsx"));
const TemplateMassReformulation = lazy(() => import("./pages/admin/TemplateMassReformulation.tsx"));
const PlatformGovernance = lazy(() => import("./pages/PlatformGovernance"));
const SystemDiagnostics = lazy(() => import("./pages/SystemDiagnostics"));
const SystemHealthLive = lazy(() => import("./pages/SystemHealthLive"));
const RealtimeDebugCenter = lazy(() => import("./pages/RealtimeDebugCenter"));
const SchemaMonitor = lazy(() => import("./pages/SchemaMonitor"));
const PhytotherapyProtocolsLegacy = lazy(() => import("./pages/PhytotherapyProtocols"));
const ProtocolsLegacy = lazy(() => import("./pages/Protocols"));
const AdminPrestigeLegacy = lazy(() => import("./pages/AdminPrestige"));
const OperationalDashboardLegacy = lazy(() => import("./pages/OperationalDashboard"));
const BiquiniBrancoLanding = lazy(() => import("./pages/BiquiniBrancoLanding"));
const PublicDemo = lazy(() => import("./pages/PublicDemo"));
const DiagnosticStatus = lazy(() => import("./pages/DiagnosticStatus"));
const SystemPresentationLegacy = lazy(() => import("./pages/SystemPresentation"));
const TechnicalSheetsLegacy = lazy(() => import("./pages/store/TechnicalSheets"));
const AdminClinicalRules = lazy(() => import("./pages/admin/ClinicalRules"));

const PersonalStudentsLegacy = lazy(() => import("./pages/PersonalStudents"));
const PersonalWorkoutsLegacy = lazy(() => import("./pages/PersonalWorkouts"));
const CheckinPanelLegacy = lazy(() => import("./pages/CheckinPanel"));
const ChecklistLegacy = lazy(() => import("./pages/Checklist"));
const FeedbacksLegacy = lazy(() => import("./pages/Feedbacks"));
const FitnessAnamnesisLegacy = lazy(() => import("./pages/FitnessAnamnesis"));
const GlobalTipsLegacy = lazy(() => import("./pages/GlobalTips"));
const HealthCheckQuizLegacy = lazy(() => import("./pages/HealthCheckQuiz"));
const HumanPerformanceLegacy = lazy(() => import("./pages/HumanPerformance"));
const InOfficeSelectorLegacy = lazy(() => import("./pages/InOfficeSelector"));
const InvitePatientLegacy = lazy(() => import("./pages/InvitePatient"));
const LibraryLegacy = lazy(() => import("./pages/Library"));
const MetabolicTwinLegacy = lazy(() => import("./pages/MetabolicTwin"));
const MyPublicProfileLegacy = lazy(() => import("./pages/MyPublicProfile"));
const MyReferralsLegacy = lazy(() => import("./pages/MyReferrals"));
const OnboardingTrackerLegacy = lazy(() => import("./pages/OnboardingTracker"));
const PlannerLegacy = lazy(() => import("./pages/Planner"));
const PopulationIntelligenceLegacy = lazy(() => import("./pages/PopulationIntelligence"));
const PopulationNutritionIntelligenceLegacy = lazy(() => import("./pages/PopulationNutritionIntelligence"));
const ProfessionalGuideLegacy = lazy(() => import("./pages/ProfessionalGuide"));
const ProgramsLegacy = lazy(() => import("./pages/Programs"));
const ProtocolTransitionsLegacy = lazy(() => import("./pages/ProtocolTransitions"));
const PhytotherapyProtocolsLegacy2 = lazy(() => import("./pages/PhytotherapyProtocols"));
const ProtocolsLegacy2 = lazy(() => import("./pages/Protocols"));
const RecipeBuilderLegacy = lazy(() => import("./pages/RecipeBuilder"));
const SecurityDashboardLegacy = lazy(() => import("./pages/SecurityDashboard"));
const TeamManagementLegacy = lazy(() => import("./pages/TeamManagement"));
const TherapeuticIntelligenceLegacy = lazy(() => import("./pages/TherapeuticIntelligence"));
const UserGuideLegacy = lazy(() => import("./pages/UserGuide"));
const WeeklyGoalsLegacy = lazy(() => import("./pages/WeeklyGoals"));
const WeeklyReportLegacy = lazy(() => import("./pages/WeeklyReport"));
const WeightTrajectoryLegacy = lazy(() => import("./pages/WeightTrajectory"));
const AdminPrestigeLegacy2 = lazy(() => import("./pages/AdminPrestige"));
const OperationalDashboardLegacy2 = lazy(() => import("./pages/OperationalDashboard"));
const AdminDashboardLegacy = lazy(() => import("./pages/admin/AdminDashboard"));
const ClientDashboardLegacy = lazy(() => import("./pages/ClientDashboard"));
const PatientsLegacy = lazy(() => import("./pages/Patients"));
const DietBuilderLegacy = lazy(() => import("./pages/diet-builder/DietBuilder"));
const MealPlanEditorV3Legacy = lazy(() => import("./pages/MealPlanEditorV3Page"));
const SettingsLegacy = lazy(() => import("./pages/Settings"));
const ChatLegacy = lazy(() => import("./pages/Chat"));
const AppointmentsLegacy = lazy(() => import("./pages/Appointments"));
const AnamnesisLegacy = lazy(() => import("./pages/Anamnesis"));
const MealsLegacy = lazy(() => import("./pages/Meals"));
const RecipesLegacy = lazy(() => import("./pages/Recipes"));
const ShoppingListLegacy = lazy(() => import("./pages/ShoppingList"));
const FinancialLegacy = lazy(() => import("./pages/Financial"));
const IntegrationsLegacy = lazy(() => import("./pages/Integrations"));
const BrandingLegacy = lazy(() => import("./pages/Branding"));
const NotificationsLegacy = lazy(() => import("./pages/Notifications"));
const DietTemplatesLegacy = lazy(() => import("./pages/DietTemplates"));
const FoodDatabaseLegacy = lazy(() => import("./pages/FoodDatabase"));
const AutomationCenterLegacy = lazy(() => import("./pages/AutomationCenter"));
const CampaignCenterLegacy = lazy(() => import("./pages/CampaignCenter"));
const ClinicalBrainLegacy2 = lazy(() => import("./pages/ClinicalBrain"));
const LabInterpreterLegacy = lazy(() => import("./pages/LabInterpreter"));
const MissionControlLegacy = lazy(() => import("./pages/MissionControl"));
const WorkspaceEditorLegacy = lazy(() => import("./pages/WorkspaceEditor"));
const AdminAffiliatesLegacy = lazy(() => import("./pages/AdminAffiliates"));
const AdminBookingSettingsLegacy = lazy(() => import("./pages/AdminBookingSettings"));
const AdminFeatureControlLegacy = lazy(() => import("./pages/AdminFeatureControl"));
const AdminPricingLegacy = lazy(() => import("./pages/AdminPricing"));
const AdminProfessionalsLegacy = lazy(() => import("./pages/AdminProfessionals"));
const AdminSubscriptionMonitorLegacy = lazy(() => import("./pages/AdminSubscriptionMonitor"));
const AdminSiteEditorLegacy = lazy(() => import("./pages/AdminSiteEditor"));
const AdminResourceCenterLegacy = lazy(() => import("./pages/AdminResourceCenter"));
const AdminTestimonialsLegacy = lazy(() => import("./pages/AdminTestimonials"));
const PatientIntelligenceLegacy = lazy(() => import("./pages/PatientIntelligence"));
const ClinicalControlTowerLegacy = lazy(() => import("./pages/ClinicalControlTower"));
const TechnicalSheetsLegacy2 = lazy(() => import("./pages/store/TechnicalSheets"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, 
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});

function LP({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isNutritionist, isAdmin } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user || (!isNutritionist && !isAdmin)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PaymentGuardedPatientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPatient, isNutritionist, isAdmin } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();
  if (loading || consentLoading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isNutritionist || isAdmin) return <>{children}</>;
  if (isPatient && !hasConsent && !["/consent", "/auth", "/settings"].some(r => location.pathname.startsWith(r))) {
    return <Navigate to="/consent" replace />;
  }
  return <>{children}</>;
}

function ExperienceModeProvider({ children }: { children: React.ReactNode }) {
  const { isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;
  const role = (isPatient && !isProRole) ? "patient" : "professional";
  const value = useExperienceModeState(role);
  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>;
}

function ExperienceThemeSync() {
  const { mode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const role = (isNutritionist || isPersonal || isAdmin) ? "professional" : "patient";
    document.documentElement.setAttribute("data-experience-mode", mode);
    document.documentElement.setAttribute("data-experience-role", role);
  }, [mode, isNutritionist, isPersonal, isAdmin, loading]);
  return null;
}

function AppContent() {
  const { isDegraded, isOrphan } = useAppState();
  return (
    <div className="min-h-screen">
      {isDegraded && <DegradedModeBanner />}
      {isOrphan && <HardFailLinkage />}
      <AnimatePresence mode="wait">
        <Suspense fallback={<BrainLoaderScreen />}>
          <SystemStateGuard>
            <Routes>
              <Route path="/" element={<LP section="Início"><Index /></LP>} />
              <Route path="/dashboard" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/professional" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/professional/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />


              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/cadastro" element={<LP section="Cadastro"><PatientRegister /></LP>} />
              
              {/* Professional Routes */}
              <Route path="/patients" element={<NutritionistRoute><LP section="Pacientes"><Patients /></LP></NutritionistRoute>} />
              <Route path="/patients/:id" element={<NutritionistRoute><LP section="Detalhes do Paciente"><PatientDetail /></LP></NutritionistRoute>} />
              <Route path="/settings" element={<ProtectedRoute><LP section="Configurações"><Settings /></LP></ProtectedRoute>} />
              <Route path="/settings/account-deletion" element={<ProtectedRoute><LP section="Excluir Conta"><AccountDeletion /></LP></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><LP section="Chat"><Chat /></LP></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><LP section="Agenda"><Appointments /></LP></ProtectedRoute>} />
              <Route path="/anamnesis" element={<ProtectedRoute><LP section="Anamnese"><Anamnesis /></LP></ProtectedRoute>} />
              <Route path="/meals" element={<ProtectedRoute><LP section="Refeições"><Meals /></LP></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><LP section="Receitas"><Recipes /></LP></ProtectedRoute>} />
              <Route path="/shopping-list" element={<ProtectedRoute><LP section="Lista de Compras"><ShoppingList /></LP></ProtectedRoute>} />
              <Route path="/financial" element={<NutritionistRoute><LP section="Financeiro"><Financial /></LP></NutritionistRoute>} />
              <Route path="/integrations" element={<NutritionistRoute><LP section="Integrações"><Integrations /></LP></NutritionistRoute>} />
              <Route path="/branding" element={<NutritionistRoute><LP section="Marca"><Branding /></LP></NutritionistRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><LP section="Notificações"><Notifications /></LP></ProtectedRoute>} />
              <Route path="/diet-builder" element={<NutritionistRoute><LP section="Diet Builder"><DietBuilder /></LP></NutritionistRoute>} />
              <Route path="/diet-templates" element={<NutritionistRoute><LP section="Templates de Dieta"><DietTemplates /></LP></NutritionistRoute>} />
              <Route path="/food-database" element={<NutritionistRoute><LP section="Banco de Alimentos"><FoodDatabase /></LP></NutritionistRoute>} />
              <Route path="/admin/nutrition-protocols" element={<NutritionistRoute><LP section="Protocolos de Nutrição"><AdminNutritionProtocols /></LP></NutritionistRoute>} />
              <Route path="/admin/whatsapp" element={<NutritionistRoute><LP section="Config WhatsApp"><WhatsAppSettings /></LP></NutritionistRoute>} />
              <Route path="/clinical-enterprise" element={<NutritionistRoute><LP section="Enterprise"><ClinicalEnterprise /></LP></NutritionistRoute>} />
              <Route path="/clinical-health" element={<NutritionistRoute><LP section="Saúde Clínica"><ClinicalHealthDashboard /></LP></NutritionistRoute>} />
              <Route path="/clinical-pipeline" element={<NutritionistRoute><LP section="Pipeline Clínico"><ClinicalPipeline /></LP></NutritionistRoute>} />
              <Route path="/clinical-workspace" element={<NutritionistRoute><LP section="Workspace Clínico"><ClinicalWorkspace /></LP></NutritionistRoute>} />
              <Route path="/coach/bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
              <Route path="/cockpit-premium" element={<NutritionistRoute><LP section="Cockpit Premium"><CockpitPremium /></LP></NutritionistRoute>} />
              <Route path="/global-ai" element={<NutritionistRoute><LP section="IA Global"><GlobalAdaptiveIntelligence /></LP></NutritionistRoute>} />
              <Route path="/hybrid-plan-builder" element={<NutritionistRoute><LP section="Plan Builder Híbrido"><HybridPlanBuilder /></LP></NutritionistRoute>} />
              <Route path="/intelligence-settings" element={<NutritionistRoute><LP section="Config Inteligência"><IntelligenceSettings /></LP></NutritionistRoute>} />
              <Route path="/mobile-qa" element={<NutritionistRoute><LP section="QA Mobile"><MobileQA /></LP></NutritionistRoute>} />
              <Route path="/patient-diagnostic/:id" element={<NutritionistRoute><LP section="Diagnóstico do Paciente"><PatientDiagnostic /></LP></NutritionistRoute>} />
              <Route path="/patient-overview" element={<NutritionistRoute><LP section="Visão Geral do Paciente"><PatientOverview /></LP></NutritionistRoute>} />
              <Route path="/plan-audit" element={<NutritionistRoute><LP section="Auditoria de Planos"><PlanAudit /></LP></NutritionistRoute>} />
              <Route path="/preview-patient" element={<NutritionistRoute><LP section="Preview Paciente"><PreviewPatient /></LP></NutritionistRoute>} />


              <Route path="/admin/import-patients" element={<NutritionistRoute><LP section="Importar Pacientes"><ImportPatients /></LP></NutritionistRoute>} />
              <Route path="/admin/menu-config" element={<NutritionistRoute><LP section="Config Menu"><AdminMenuConfig /></LP></NutritionistRoute>} />
              <Route path="/admin/prestige" element={<NutritionistRoute><LP section="Prestígio"><AdminPrestige /></LP></NutritionistRoute>} />
              <Route path="/admin/operational-costs" element={<NutritionistRoute><LP section="Custos Operacionais"><AdminOperationalCosts /></LP></NutritionistRoute>} />
              <Route path="/admin/protocol-biquini-branco" element={<NutritionistRoute><LP section="Protocolo Biquíni Branco"><AdminProtocolBiquiniBranco /></LP></NutritionistRoute>} />
              <Route path="/admin/protocol-fitjourney" element={<NutritionistRoute><LP section="Protocolo FitJourney"><AdminProtocolFitJourney /></LP></NutritionistRoute>} />
              <Route path="/admin/growth" element={<NutritionistRoute><LP section="Growth Dashboard"><GrowthDashboard /></LP></NutritionistRoute>} />
              <Route path="/admin/guide-engine" element={<NutritionistRoute><LP section="Guide Engine"><AdminGuideEngine /></LP></NutritionistRoute>} />
              <Route path="/admin/marketing-content" element={<NutritionistRoute><LP section="Central de Conteúdo"><AdminMarketingContent /></LP></NutritionistRoute>} />
              <Route path="/admin/patient-features" element={<NutritionistRoute><LP section="Features por Plano"><AdminPatientFeatures /></LP></NutritionistRoute>} />
              <Route path="/admin/landing-pages" element={<NutritionistRoute><LP section="Landing Pages"><AdminLandingPages /></LP></NutritionistRoute>} />
              <Route path="/admin/profissionais" element={<NutritionistRoute><LP section="Profissionais"><AdminProfessionals /></LP></NutritionistRoute>} />
              <Route path="/admin/features" element={<NutritionistRoute><LP section="Features Profissionais"><AdminFeatureControl /></LP></NutritionistRoute>} />
              <Route path="/admin/resources" element={<NutritionistRoute><LP section="Recursos"><AdminResourceCenter /></LP></NutritionistRoute>} />
              <Route path="/operational" element={<NutritionistRoute><LP section="Painel Operacional"><OperationalDashboard /></LP></NutritionistRoute>} />
              <Route path="/ambassador" element={<ProtectedRoute><LP section="Embaixador"><AmbassadorDashboard /></LP></ProtectedRoute>} />
              <Route path="/apresentacao" element={<ProtectedRoute><LP section="Apresentação do Sistema"><SystemPresentation /></LP></ProtectedRoute>} />
              <Route path="/checkin-panel" element={<ProtectedRoute><LP section="Check-ins"><CheckinPanel /></LP></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><LP section="Checklist"><Checklist /></LP></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute><LP section="Feedbacks"><Feedbacks /></LP></ProtectedRoute>} />
              <Route path="/fitness-anamnesis" element={<ProtectedRoute><LP section="Anamnese Fitness"><FitnessAnamnesis /></LP></ProtectedRoute>} />
              <Route path="/global-tips" element={<ProtectedRoute><LP section="Dicas Globais"><GlobalTips /></LP></ProtectedRoute>} />
              <Route path="/health-quiz" element={<ProtectedRoute><LP section="Health Check"><HealthCheckQuiz /></LP></ProtectedRoute>} />
              <Route path="/human-performance" element={<ProtectedRoute><LP section="Performance Humana"><HumanPerformance /></LP></ProtectedRoute>} />
              <Route path="/in-office" element={<NutritionistRoute><LP section="Modo Consultório"><InOfficeSelector /></LP></NutritionistRoute>} />
              <Route path="/in-office/wizard" element={<NutritionistRoute><LP section="Assistente Consultório"><InOfficeWizard /></LP></NutritionistRoute>} />
              <Route path="/invite-patient" element={<NutritionistRoute><LP section="Convidar Paciente"><InvitePatient /></LP></NutritionistRoute>} />
              <Route path="/library" element={<ProtectedRoute><LP section="Biblioteca"><Library /></LP></ProtectedRoute>} />
              <Route path="/metabolic-twin" element={<ProtectedRoute><LP section="Digital Twin"><MetabolicTwin /></LP></ProtectedRoute>} />
              <Route path="/my-public-profile" element={<ProtectedRoute><LP section="Meu Perfil Público"><MyPublicProfile /></LP></ProtectedRoute>} />
              <Route path="/my-referrals" element={<ProtectedRoute><LP section="Minhas Indicações"><MyReferrals /></LP></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><LP section="Onboarding"><OnboardingTracker /></LP></ProtectedRoute>} />
              <Route path="/planner" element={<ProtectedRoute><LP section="Planner"><Planner /></LP></ProtectedRoute>} />
              <Route path="/population-intelligence" element={<NutritionistRoute><LP section="Inteligência Populacional"><PopulationIntelligence /></LP></NutritionistRoute>} />
              <Route path="/population-nutrition" element={<NutritionistRoute><LP section="Nutrição Populacional"><PopulationNutritionIntelligence /></LP></NutritionistRoute>} />
              <Route path="/professional-guide" element={<NutritionistRoute><LP section="Guia Profissional"><ProfessionalGuide /></LP></NutritionistRoute>} />
              <Route path="/professional/crm" element={<NutritionistRoute><LP section="CRM Clínico"><ClinicalCRM /></LP></NutritionistRoute>} />
              <Route path="/programs" element={<ProtectedRoute><LP section="Programas"><Programs /></LP></ProtectedRoute>} />
              <Route path="/programs/:id" element={<ProtectedRoute><LP section="Detalhes do Programa"><ProgramDetail /></LP></ProtectedRoute>} />
              <Route path="/programs/:id/biquini-branco" element={<ProtectedRoute><LP section="Protocolo Biquíni Branco"><BiquiniBrancoDetail /></LP></ProtectedRoute>} />

              <Route path="/protocol-transitions" element={<NutritionistRoute><LP section="Transições de Protocolo"><ProtocolTransitions /></LP></NutritionistRoute>} />
              <Route path="/protocolos-fitoterapicos" element={<ProtectedRoute><LP section="Protocolos Fitoterápicos"><PhytotherapyProtocols /></LP></ProtectedRoute>} />
              <Route path="/protocols" element={<ProtectedRoute><LP section="Protocolos"><Protocols /></LP></ProtectedRoute>} />
              <Route path="/recipe-builder" element={<ProtectedRoute><LP section="Calculadora de Receitas"><RecipeBuilder /></LP></ProtectedRoute>} />
              <Route path="/security-dashboard" element={<ProtectedRoute><LP section="Security Dashboard"><SecurityDashboard /></LP></ProtectedRoute>} />
              <Route path="/team" element={<NutritionistRoute><LP section="Equipe Clínica"><TeamManagement /></LP></NutritionistRoute>} />
              <Route path="/therapeutic-intelligence" element={<NutritionistRoute><LP section="Inteligência Terapêutica"><TherapeuticIntelligence /></LP></NutritionistRoute>} />
              <Route path="/user-guide" element={<ProtectedRoute><LP section="Guia do Paciente"><UserGuide /></LP></ProtectedRoute>} />
              <Route path="/weekly-goals" element={<ProtectedRoute><LP section="Metas Semanais"><WeeklyGoals /></LP></ProtectedRoute>} />
              <Route path="/weekly-report" element={<ProtectedRoute><LP section="Relatório Semanal"><WeeklyReport /></LP></ProtectedRoute>} />
              <Route path="/weight-trajectory" element={<ProtectedRoute><LP section="Trajetória de Peso"><WeightTrajectory /></LP></ProtectedRoute>} />
              <Route path="/personal/dashboard" element={<ProtectedRoute><LP section="Dashboard Personal"><PersonalDashboard /></LP></ProtectedRoute>} />
              <Route path="/personal/students" element={<ProtectedRoute><LP section="Alunos"><PersonalStudents /></LP></ProtectedRoute>} />
              <Route path="/personal/workouts" element={<ProtectedRoute><LP section="Treinos"><PersonalWorkouts /></LP></ProtectedRoute>} />
              <Route path="/store" element={<ProtectedRoute><LP section="Painel da Loja"><OperationalDashboard /></LP></ProtectedRoute>} />
              <Route path="/store/technical-sheets" element={<NutritionistRoute><LP section="Fichas Técnicas"><TechnicalSheets /></LP></NutritionistRoute>} />

              
              {/* Editor V3 Routes */}
              <Route path="/meal-plan-editor-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/meal-plan-editor-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              
              {/* Editor V2 Routes */}
              <Route path="/meal-plan-editor-v2/:patientId" element={<NutritionistRoute><LP section="Editor V2"><MealPlanEditorV2 /></LP></NutritionistRoute>} />
              <Route path="/meal-plan-editor-v2" element={<NutritionistRoute><LP section="Editor V2"><MealPlanEditorV2Entry /></LP></NutritionistRoute>} />
              <Route path="/dieta-v2/:patientId" element={<NutritionistRoute><LP section="Editor V2"><MealPlanEditorV2 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v2" element={<NutritionistRoute><LP section="Editor V2"><MealPlanEditorV2Entry /></LP></NutritionistRoute>} />
              
              {/* Patient/Client Routes */}
              <Route path="/client/dashboard" element={<PaymentGuardedPatientRoute><LP section="Dashboard"><ClientDashboard /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/journey" element={<PaymentGuardedPatientRoute><LP section="Jornada"><Journey /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/achievements" element={<PaymentGuardedPatientRoute><LP section="Conquistas"><Achievements /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/challenges" element={<PaymentGuardedPatientRoute><LP section="Desafios"><Challenges /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/checkin" element={<PaymentGuardedPatientRoute><LP section="Check-in"><Checkin /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/workouts" element={<PaymentGuardedPatientRoute><LP section="Treinos"><PatientWorkouts /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/meal-plans" element={<PaymentGuardedPatientRoute><LP section="Meus Planos"><MealPlans /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/supplements" element={<PaymentGuardedPatientRoute><LP section="Suplementos"><Supplements /></LP></PaymentGuardedPatientRoute>} />
              
              {/* Calculators & Tools */}
              <Route path="/body-analysis" element={<ProtectedRoute><LP section="Análise Corporal"><BodyAnalysis /></LP></ProtectedRoute>} />
              <Route path="/water-calculator" element={<ProtectedRoute><LP section="Calculadora de Água"><WaterCalculator /></LP></ProtectedRoute>} />
              <Route path="/weight-calculator" element={<ProtectedRoute><LP section="Calculadora de Peso"><WeightCalculator /></LP></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><LP section="Ranking"><GlobalRanking /></LP></ProtectedRoute>} />
              
              <Route path="/my-diet" element={<PaymentGuardedPatientRoute><LP section="Minha Dieta"><PatientMealPlan /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/dieta" element={<PaymentGuardedPatientRoute><LP section="Minha Dieta"><PatientMealPlan /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/my-workouts" element={<PaymentGuardedPatientRoute><LP section="Meus Treinos"><PatientWorkouts /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/body-projection" element={<PaymentGuardedPatientRoute><LP section="Projeção Corporal"><BodyProjectionExperience /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/analyze" element={<PaymentGuardedPatientRoute><LP section="Análise IA"><AnalyzeMeal /></LP></PaymentGuardedPatientRoute>} />
              
              {/* Admin & Intelligence Routes */}
              <Route path="/admin/dashboard" element={<NutritionistRoute><LP section="Admin Dashboard"><AdminDashboard /></LP></NutritionistRoute>} />
              <Route path="/admin/audit-logs" element={<NutritionistRoute><LP section="Audit Logs"><AuditLogs /></LP></NutritionistRoute>} />
              <Route path="/admin/clinical-rules" element={<NutritionistRoute><LP section="Regras Clínicas"><ClinicalRulesAdmin /></LP></NutritionistRoute>} />
              <Route path="/automation" element={<NutritionistRoute><LP section="Automação"><AutomationCenter /></LP></NutritionistRoute>} />
              <Route path="/campaigns" element={<NutritionistRoute><LP section="Campanhas"><CampaignCenter /></LP></NutritionistRoute>} />
              <Route path="/clinical-brain" element={<NutritionistRoute><LP section="Cérebro Clínico"><ClinicalBrain /></LP></NutritionistRoute>} />
              <Route path="/lab-interpreter" element={<NutritionistRoute><LP section="Intérprete de Exames"><LabInterpreter /></LP></NutritionistRoute>} />
              <Route path="/mission-control" element={<NutritionistRoute><LP section="Controle de Missão"><MissionControl /></LP></NutritionistRoute>} />
              <Route path="/workspace" element={<NutritionistRoute><LP section="Workspace"><WorkspaceEditor /></LP></NutritionistRoute>} />
              <Route path="/admin/affiliates" element={<NutritionistRoute><LP section="Afiliados"><AdminAffiliates /></LP></NutritionistRoute>} />
              <Route path="/admin/booking-settings" element={<NutritionistRoute><LP section="Config. Agenda"><AdminBookingSettings /></LP></NutritionistRoute>} />
              <Route path="/admin/feature-control" element={<NutritionistRoute><LP section="Controle de Recursos"><AdminFeatureControl /></LP></NutritionistRoute>} />
              <Route path="/admin/pricing" element={<NutritionistRoute><LP section="Preços"><AdminPricing /></LP></NutritionistRoute>} />
              <Route path="/admin/professionals" element={<NutritionistRoute><LP section="Profissionais"><AdminProfessionals /></LP></NutritionistRoute>} />
              <Route path="/admin/subscriptions" element={<NutritionistRoute><LP section="Assinaturas"><AdminSubscriptionMonitor /></LP></NutritionistRoute>} />
              <Route path="/admin/site-editor" element={<NutritionistRoute><LP section="Editor do Site"><AdminSiteEditor /></LP></NutritionistRoute>} />
              <Route path="/admin/qa-checklist" element={<NutritionistRoute><LP section="Checklist QA"><QAChecklist /></LP></NutritionistRoute>} />
              <Route path="/admin/invitation-audit" element={<NutritionistRoute><LP section="Auditoria de Convites"><InvitationAudit /></LP></NutritionistRoute>} />
              <Route path="/admin/template-nutrition-audit" element={<NutritionistRoute><LP section="Auditoria de Templates"><TemplateNutritionAudit /></LP></NutritionistRoute>} />
              <Route path="/admin/ai-usage" element={<NutritionistRoute><LP section="Uso de IA"><AIUsageDashboard /></LP></NutritionistRoute>} />
              <Route path="/admin/experience-audit" element={<NutritionistRoute><LP section="Auditoria de Experiência"><AdminExperienceModeAudit /></LP></NutritionistRoute>} />
              <Route path="/admin/experience-reconcile" element={<NutritionistRoute><LP section="Reconciliação de Experiência"><AdminExperienceModeReconcile /></LP></NutritionistRoute>} />
              <Route path="/admin/plan-diagnostics" element={<NutritionistRoute><LP section="Diagnóstico de Planos"><AdminPlanLoadingDiagnostics /></LP></NutritionistRoute>} />
              <Route path="/admin/image-fallback" element={<NutritionistRoute><LP section="Fallbacks de Imagem"><ImageFallbackAdmin /></LP></NutritionistRoute>} />
              <Route path="/admin/marmita-audit" element={<NutritionistRoute><LP section="Auditoria de Marmitas"><MarmitaAudit /></LP></NutritionistRoute>} />
              <Route path="/admin/meal-coverage" element={<NutritionistRoute><LP section="Cobertura de Refeições"><MealCoverageDashboard /></LP></NutritionistRoute>} />
              <Route path="/admin/visual-library" element={<NutritionistRoute><LP section="Biblioteca Visual"><MealVisualLibraryAdmin /></LP></NutritionistRoute>} />
              <Route path="/admin/plan-batch-audit" element={<NutritionistRoute><LP section="Auditoria em Massa"><PlanBatchAudit /></LP></NutritionistRoute>} />
              <Route path="/admin/template-reformulation" element={<NutritionistRoute><LP section="Reformulação de Templates"><TemplateMassReformulation /></LP></NutritionistRoute>} />
              <Route path="/admin/governance" element={<NutritionistRoute><LP section="Governança"><PlatformGovernance /></LP></NutritionistRoute>} />
              <Route path="/admin/diagnostics" element={<NutritionistRoute><LP section="Diagnóstico do Sistema"><SystemDiagnostics /></LP></NutritionistRoute>} />
              <Route path="/admin/health-live" element={<NutritionistRoute><LP section="Status em Tempo Real"><SystemHealthLive /></LP></NutritionistRoute>} />
              <Route path="/admin/debug" element={<NutritionistRoute><LP section="Centro de Debug"><RealtimeDebugCenter /></LP></NutritionistRoute>} />
              <Route path="/admin/schema" element={<NutritionistRoute><LP section="Monitor de Schema"><SchemaMonitor /></LP></NutritionistRoute>} />
              <Route path="/onboarding/paciente" element={<ProtectedRoute><LP section="Onboarding Paciente"><OnboardingPaciente /></LP></ProtectedRoute>} />
              <Route path="/onboarding/profissional" element={<ProtectedRoute><LP section="Onboarding Profissional"><OnboardingProfissional /></LP></ProtectedRoute>} />
              <Route path="/onboarding-pipeline" element={<NutritionistRoute><LP section="Pipeline de Onboarding"><OnboardingPipeline /></LP></NutritionistRoute>} />
              <Route path="/payment-required" element={<ProtectedRoute><LP section="Pagamento Necessário"><PaymentRequired /></LP></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><LP section="Sucesso no Pagamento"><PaymentSuccess /></LP></ProtectedRoute>} />
              <Route path="/physical-assessment" element={<ProtectedRoute><LP section="Avaliação Física"><PhysicalAssessment /></LP></ProtectedRoute>} />
              <Route path="/physiological-intelligence" element={<ProtectedRoute><LP section="Inteligência Fisiológica"><PhysiologicalIntelligence /></LP></ProtectedRoute>} />
              <Route path="/curiosidades" element={<ProtectedRoute><LP section="Curiosidades"><Curiosidades /></LP></ProtectedRoute>} />
              <Route path="/magic-journey" element={<ProtectedRoute><LP section="Magic Journey"><MagicJourneyStory /></LP></ProtectedRoute>} />
              <Route path="/store/dashboard" element={<ProtectedRoute><LP section="Dashboard da Loja"><StoreDashboard /></LP></ProtectedRoute>} />
              <Route path="/store/products" element={<ProtectedRoute><LP section="Produtos da Loja"><StoreProducts /></LP></ProtectedRoute>} />

              <Route path="/biquini-branco" element={<LP section="Biquíni Branco"><BiquiniBrancoLanding /></LP>} />
              <Route path="/demo" element={<LP section="Demo"><PublicDemo /></LP>} />
              <Route path="/status" element={<LP section="Status"><DiagnosticStatus /></LP>} />
              <Route path="/affiliate" element={<AffiliateLanding />} />
              <Route path="/gateway" element={<GatewayPage />} />
              <Route path="/intake" element={<IntakeOnboarding />} />
              <Route path="/invitation-status" element={<InvitationStatus />} />
              <Route path="/patient-landing" element={<PatientLanding />} />
              <Route path="/personal-landing" element={<PersonalLanding />} />
              <Route path="/booking/:id" element={<PublicBooking />} />
              <Route path="/p/:slug" element={<PublicProfile />} />
              <Route path="/p/:slug/paciente" element={<PublicPlans planType="patient_prestige" />} />
              <Route path="/p/:slug/profissional" element={<PublicPlans planType="professional" />} />
              <Route path="/public-program/:programId" element={<PublicProgram />} />


              <Route path="/ql/:nutriId" element={<QuickLink />} />
              <Route path="/status-page" element={<StatusPage />} />



              <Route path="/admin/resource-center" element={<NutritionistRoute><LP section="Centro de Recursos"><AdminResourceCenter /></LP></NutritionistRoute>} />
              <Route path="/admin/testimonials" element={<NutritionistRoute><LP section="Depoimentos"><AdminTestimonials /></LP></NutritionistRoute>} />
              <Route path="/patient-intelligence" element={<NutritionistRoute><LP section="Inteligência do Paciente"><PatientIntelligence /></LP></NutritionistRoute>} />
              <Route path="/control-tower" element={<NutritionistRoute><LP section="Torre de Controle"><ClinicalControlTower /></LP></NutritionistRoute>} />
              <Route path="/technical-sheets" element={<NutritionistRoute><LP section="Fichas Técnicas"><TechnicalSheets /></LP></NutritionistRoute>} />
              
              {/* Legal Routes */}
              <Route path="/privacy-policy" element={<LP section="Privacidade"><PrivacyPolicy /></LP>} />
              <Route path="/terms-of-use" element={<LP section="Termos de Uso"><TermsOfUse /></LP>} />
              
              <Route path="/hard-fail-linkage" element={<LP section="Erro de Vínculo"><HardFailLinkage /></LP>} />
              <Route path="/consent" element={<ProtectedRoute><LP section="Consentimento"><ConsentRequired /></LP></ProtectedRoute>} />
              <Route path="/teste123" element={<TestDeploy />} />
              <Route path="/diagnostic" element={<LP section="Status"><DiagnosticStatus /></LP>} />
              <Route path="/404" element={<LP section="404"><NotFound /></LP>} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </SystemStateGuard>
        </Suspense>
      </AnimatePresence>
    </div>
  );
}

const App = () => (
  <CriticalErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Helmet><title>FitJourney</title></Helmet>
          <Toaster />
          <Sonner />
          <MobileAutoFixer />
          <GlobalErrorBoundary />
          <UpdateBanner />
          <BrowserRouter>
            <AuthProvider>
              <TenantProvider>
                <ExperienceModeProvider>
                  <ExperienceThemeSync />
                  <ExperienceRouteGuard />
                  <WorkspaceRouteGuard />
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
      </QueryClientProvider>
    </HelmetProvider>
  </CriticalErrorBoundary>
);

export default App;
