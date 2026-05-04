import { Routes, Route, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { lazy, Suspense, useEffect } from "react";
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
// Removed MealPlanEditorV2Redirect as it was mixing V2 and V3 logic.
// Routes now point directly to their respective editors.
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
const JobDashboard = lazy(() => import("../components/dev/JobDashboard"));


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
const OperationalChecklist = lazy(() => import("../pages/OperationalChecklist"));

function LP({ children, section }: { children: React.ReactNode; section?: string }) {
  return (
    <SafePage pageName={section || "Página"}>
      {children}
    </SafePage>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuth();
  if (authStatus === "loading") return null;
  if (authStatus !== "authenticated") return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { authStatus } = useAuth();
  if (authStatus === "loading") return null;
  if (authStatus !== "authenticated") return <Navigate to="/auth" replace />;
  // Fallback seguro: se autenticado, tenta ir para welcome ou auth de novo se tudo falhar
  return <Navigate to="/welcome" replace />;
}

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function PatientRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}


function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={target} replace />;
}

function HomeRedirect() {
  const { authStatus } = useAuth();
  
  if (authStatus === "loading") return null;
  
  if (authStatus === "authenticated") {
    return <DashboardRedirect />;
  }
  
  // Direto para auth se não estiver logado
  return <Navigate to="/auth" replace />;
}


export const AppRoutes = () => {
  const { authStatus } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/confirm" element={<AuthConfirm />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/index" element={<Index />} />
      
      <Route 
        path="*" 
        element={
          authStatus === "authenticated" 
            ? <Navigate to="/welcome" replace /> 
            : <Navigate to="/auth" replace />
        } 
      />
    </Routes>
  );
};
