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

// Lazy - Core
const AnalyzeMeal = lazy(() => import("./pages/AnalyzeMeal"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const MealPlanEditorV2 = lazy(() => import("./pages/MealPlanEditorV2"));
const MealPlanEditorV2Entry = lazy(() => import("./pages/MealPlanEditorV2Entry"));
const MealPlanEditorV3Experimental = lazy(() => import("./pages/MealPlanEditorV3Page"));
const DietBuilder = lazy(() => import("./pages/diet-builder/DietBuilder"));
const GlobalRanking = lazy(() => import("./pages/GlobalRanking"));

// Lazy - Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const ClinicalRulesAdmin = lazy(() => import("./pages/admin/ClinicalRules"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const AdminBookingSettings = lazy(() => import("./pages/AdminBookingSettings"));
const AdminFeatureControl = lazy(() => import("./pages/AdminFeatureControl"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const AdminProfessionals = lazy(() => import("./pages/AdminProfessionals"));
const AdminSubscriptionMonitor = lazy(() => import("./pages/AdminSubscriptionMonitor"));
const AdminSiteEditor = lazy(() => import("./pages/AdminSiteEditor"));
const AdminResourceCenter = lazy(() => import("./pages/AdminResourceCenter"));
const AdminTestimonials = lazy(() => import("./pages/AdminTestimonials"));
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

// Lazy - Modules
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
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Journey = lazy(() => import("./pages/Journey"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Challenges = lazy(() => import("./pages/Challenges"));
const Checkin = lazy(() => import("./pages/Checkin"));
const PatientWorkouts = lazy(() => import("./pages/PatientWorkouts"));
const PersonalDashboard = lazy(() => import("./pages/PersonalDashboard"));
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
const PatientIntelligence = lazy(() => import("./pages/PatientIntelligence"));
const ClinicalControlTower = lazy(() => import("./pages/ClinicalControlTower"));
const TechnicalSheets = lazy(() => import("./pages/store/TechnicalSheets"));
const AdminNutritionProtocols = lazy(() => import("./pages/AdminNutritionProtocols"));
const AffiliateLanding = lazy(() => import("./pages/AffiliateLanding"));
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
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const PublicPlans = lazy(() => import("./pages/PublicPlans"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PublicProgram = lazy(() => import("./pages/PublicProgram"));
const QuickLink = lazy(() => import("./pages/QuickLink"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const StoreDashboard = lazy(() => import("./pages/store/StoreDashboard"));
const StoreProducts = lazy(() => import("./pages/store/StoreProducts"));
const GrowthDashboard = lazy(() => import("./pages/GrowthDashboard"));
const AdminGuideEngine = lazy(() => import("./pages/AdminGuideEngine"));
const AdminLandingPages = lazy(() => import("./pages/AdminLandingPages"));
const AdminMarketingContent = lazy(() => import("./pages/AdminMarketingContent"));
const AdminMenuConfig = lazy(() => import("./pages/AdminMenuConfig"));
const AdminPatientFeatures = lazy(() => import("./pages/AdminPatientFeatures"));
const AdminProtocolBiquiniBranco = lazy(() => import("./pages/AdminProtocolBiquiniBranco"));
const AdminProtocolFitJourney = lazy(() => import("./pages/AdminProtocolFitJourney"));
const ImportPatients = lazy(() => import("./pages/ImportPatients"));
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
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
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
const AmbassadorDashboard = lazy(() => import("./pages/AmbassadorDashboard"));
const InOfficeWizard = lazy(() => import("./pages/InOfficeWizard"));
const SystemPresentation = lazy(() => import("./pages/SystemPresentation"));
const PlatformGovernance = lazy(() => import("./pages/PlatformGovernance"));
const SystemDiagnostics = lazy(() => import("./pages/SystemDiagnostics"));
const SystemHealthLive = lazy(() => import("./pages/SystemHealthLive"));
const RealtimeDebugCenter = lazy(() => import("./pages/RealtimeDebugCenter"));
const SchemaMonitor = lazy(() => import("./pages/SchemaMonitor"));
const BiquiniBrancoLanding = lazy(() => import("./pages/BiquiniBrancoLanding"));
const PublicDemo = lazy(() => import("./pages/PublicDemo"));
const DiagnosticStatus = lazy(() => import("./pages/DiagnosticStatus"));
const TestDeploy = lazy(() => import("./pages/TestDeploy"));
const AdminOperationalCosts = lazy(() => import("./pages/AdminOperationalCosts"));

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

function AppContent() {
  const { isDegraded, isOrphan } = useAppState();
  return (
    <div className="min-h-screen">
      {isDegraded && <DegradedModeBanner />}
      {isOrphan && <HardFailLinkage />}
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <SystemStateGuard>
            <Routes>
              {/* Home */}
              <Route path="/" element={<LP section="Início"><Index /></LP>} />
              
              {/* Redirects */}
              <Route path="/dashboard" element={<Navigate to="/client/dashboard" replace />} />
              <Route path="/professional" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/professional/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="/library" element={<ProtectedRoute><LP section="Biblioteca"><Library /></LP></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><LP section="Relatórios"><Reports /></LP></ProtectedRoute>} />
              <Route path="/supplements" element={<ProtectedRoute><LP section="Suplementos"><Supplements /></LP></ProtectedRoute>} />
              <Route path="/body-analysis" element={<ProtectedRoute><LP section="Análise Corporal"><BodyAnalysis /></LP></ProtectedRoute>} />
              
              {/* Professional Routes */}
              <Route path="/patients" element={<NutritionistRoute><LP section="Pacientes"><Patients /></LP></NutritionistRoute>} />
              <Route path="/patients/:id" element={<NutritionistRoute><LP section="Detalhes do Paciente"><PatientDetail /></LP></NutritionistRoute>} />
              <Route path="/financial" element={<NutritionistRoute><LP section="Financeiro"><Financial /></LP></NutritionistRoute>} />
              <Route path="/integrations" element={<NutritionistRoute><LP section="Integrações"><Integrations /></LP></NutritionistRoute>} />
              <Route path="/branding" element={<NutritionistRoute><LP section="Marca"><Branding /></LP></NutritionistRoute>} />
              <Route path="/diet-builder" element={<NutritionistRoute><LP section="Diet Builder"><DietBuilder /></LP></NutritionistRoute>} />
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
              <Route path="/invite-patient" element={<NutritionistRoute><LP section="Convidar Paciente"><InvitePatient /></LP></NutritionistRoute>} />
              <Route path="/automation" element={<NutritionistRoute><LP section="Automação"><AutomationCenter /></LP></NutritionistRoute>} />
              <Route path="/clinical-brain" element={<NutritionistRoute><LP section="Cérebro Clínico"><ClinicalBrain /></LP></NutritionistRoute>} />
              <Route path="/lab-interpreter" element={<NutritionistRoute><LP section="Intérprete de Exames"><LabInterpreter /></LP></NutritionistRoute>} />
              <Route path="/mission-control" element={<NutritionistRoute><LP section="Controle de Missão"><MissionControl /></LP></NutritionistRoute>} />
              <Route path="/workspace" element={<NutritionistRoute><LP section="Workspace"><WorkspaceEditor /></LP></NutritionistRoute>} />
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
              <Route path="/personal/dashboard" element={<NutritionistRoute><LP section="Dashboard Personal"><PersonalDashboard /></LP></NutritionistRoute>} />
              <Route path="/personal/students" element={<NutritionistRoute><LP section="Alunos Personal"><PersonalStudents /></LP></NutritionistRoute>} />
              <Route path="/personal/workouts" element={<NutritionistRoute><LP section="Treinos Personal"><PersonalWorkouts /></LP></NutritionistRoute>} />
              <Route path="/import-patients" element={<NutritionistRoute><LP section="Importar Pacientes"><ImportPatients /></LP></NutritionistRoute>} />
              <Route path="/clinical-health" element={<NutritionistRoute><LP section="Saúde Clínica"><ClinicalHealthDashboard /></LP></NutritionistRoute>} />
              <Route path="/clinical-pipeline" element={<NutritionistRoute><LP section="Pipeline Clínico"><ClinicalPipeline /></LP></NutritionistRoute>} />
              <Route path="/clinical-enterprise" element={<NutritionistRoute><LP section="Empresa Clínica"><ClinicalEnterprise /></LP></NutritionistRoute>} />
              <Route path="/coach-bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
              <Route path="/recipe-builder" element={<NutritionistRoute><LP section="Editor de Receitas"><RecipeBuilder /></LP></NutritionistRoute>} />
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
              <Route path="/onboarding" element={<NutritionistRoute><LP section="Onboarding Profissional"><OnboardingProfissional /></LP></NutritionistRoute>} />
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
              <Route path="/clinical-crm" element={<NutritionistRoute><LP section="CRM Clínico"><ClinicalCRM /></LP></NutritionistRoute>} />
              <Route path="/personal/dashboard" element={<NutritionistRoute><LP section="Dashboard Personal"><PersonalDashboard /></LP></NutritionistRoute>} />
              <Route path="/personal/students" element={<NutritionistRoute><LP section="Alunos Personal"><PersonalStudents /></LP></NutritionistRoute>} />
              <Route path="/personal/workouts" element={<NutritionistRoute><LP section="Treinos Personal"><PersonalWorkouts /></LP></NutritionistRoute>} />
              <Route path="/import-patients" element={<NutritionistRoute><LP section="Importar Pacientes"><ImportPatients /></LP></NutritionistRoute>} />
              <Route path="/clinical-health" element={<NutritionistRoute><LP section="Saúde Clínica"><ClinicalHealthDashboard /></LP></NutritionistRoute>} />
              <Route path="/clinical-pipeline" element={<NutritionistRoute><LP section="Pipeline Clínico"><ClinicalPipeline /></LP></NutritionistRoute>} />
              <Route path="/clinical-enterprise" element={<NutritionistRoute><LP section="Empresa Clínica"><ClinicalEnterprise /></LP></NutritionistRoute>} />
              <Route path="/coach-bodybuilder" element={<NutritionistRoute><LP section="Coach Bodybuilder"><CoachBodybuilder /></LP></NutritionistRoute>} />
              <Route path="/recipe-builder" element={<NutritionistRoute><LP section="Editor de Receitas"><RecipeBuilder /></LP></NutritionistRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<NutritionistRoute><LP section="Admin Dashboard"><AdminDashboard /></LP></NutritionistRoute>} />
              <Route path="/admin/audit-logs" element={<NutritionistRoute><LP section="Audit Logs"><AuditLogs /></LP></NutritionistRoute>} />
              <Route path="/admin/clinical-rules" element={<NutritionistRoute><LP section="Regras Clínicas"><ClinicalRulesAdmin /></LP></NutritionistRoute>} />
              <Route path="/admin/affiliates" element={<NutritionistRoute><LP section="Afiliados"><AdminAffiliates /></LP></NutritionistRoute>} />
              <Route path="/admin/booking-settings" element={<NutritionistRoute><LP section="Config. Agenda"><AdminBookingSettings /></LP></NutritionistRoute>} />
              <Route path="/admin/feature-control" element={<NutritionistRoute><LP section="Controle de Recursos"><AdminFeatureControl /></LP></NutritionistRoute>} />
              <Route path="/admin/pricing" element={<NutritionistRoute><LP section="Preços"><AdminPricing /></LP></NutritionistRoute>} />
              <Route path="/admin/professionals" element={<NutritionistRoute><LP section="Profissionais"><AdminProfessionals /></LP></NutritionistRoute>} />
              <Route path="/admin/subscriptions" element={<NutritionistRoute><LP section="Assinaturas"><AdminSubscriptionMonitor /></LP></NutritionistRoute>} />
              <Route path="/admin/site-editor" element={<NutritionistRoute><LP section="Editor do Site"><AdminSiteEditor /></LP></NutritionistRoute>} />
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
              
              {/* Patient Routes */}
              <Route path="/client/dashboard" element={<PaymentGuardedPatientRoute><LP section="Dashboard"><ClientDashboard /></LP></PaymentGuardedPatientRoute>} />
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
              <Route path="/meal-plan-editor/:id" element={<NutritionistRoute><LP section="Editor de Plano"><MealPlanEditorV2 /></LP></NutritionistRoute>} />
              <Route path="/meal-plan-editor" element={<NutritionistRoute><LP section="Editor de Plano"><MealPlanEditorV2Entry /></LP></NutritionistRoute>} />
              <Route path="/editor" element={<NutritionistRoute><LP section="Editor V3 (Beta)"><MealPlanEditorV3Experimental /></LP></NutritionistRoute>} />
              <Route path="/v3/:patientId" element={<NutritionistRoute><LP section="Editor V3 (Beta)"><MealPlanEditorV3Experimental /></LP></NutritionistRoute>} />
              <Route path="/v3" element={<NutritionistRoute><LP section="Editor V3 (Beta)"><MealPlanEditorV3Experimental /></LP></NutritionistRoute>} />

              {/* Public / Landing */}
              <Route path="/status" element={<LP section="Status"><DiagnosticStatus /></LP>} />
              <Route path="/p/:slug" element={<PublicProfile />} />
              <Route path="/booking/:id" element={<PublicBooking />} />
              
              {/* System */}
              <Route path="/teste123" element={<TestDeploy />} />
              <Route path="/404" element={<LP section="404"><NotFound /></LP>} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </SystemStateGuard>
        </Suspense>
      </AnimatePresence>
    </div>
  );
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
          <BuildVersionTag />
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