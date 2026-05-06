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
const EditorV2Page = lazyDebug(() => import("../pages/MealPlanEditorV2"), "MealPlanEditorV2");
const EditorV2EntryPage = lazyDebug(() => import("../pages/MealPlanEditorV2Entry"), "MealPlanEditorV2Entry");
const EditorV3Page = lazyDebug(() => import("../features/editor-v3").then(m => ({ default: m.EditorV3Page })), "Editor V3");
// Standardized editor routes for V2 and V3

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
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings.tsx"));
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
  const { authStatus, roles, loading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      console.warn(`[RASTREADOR] Redirect para /auth disparado por: ProtectedRoute`);
      console.log(`[RASTREADOR] Estado: user=${!!user}, roles=${roles}, path=${location.pathname}`);
    }
  }, [authStatus, roles, location.pathname, user]);

  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    return null;
  }
  
  if (authStatus !== "authenticated") {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Routes are now direct, no internal redirects to dashboard here.


function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || "");
  });
  return <Navigate to={target} replace />;
}

// HomeRedirect removed. Root route handles logic.


export const AppRoutes = () => {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log(`[RASTREADOR] AppRoutes montado/atualizado | path: ${location.pathname} | authStatus: ${authStatus} | user: ${!!user}`);
  }, [location.pathname, authStatus, user]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          authStatus === "loading" ? (
            <PageLoader />
          ) : authStatus === "authenticated" ? (
            (() => {
              const search = window.location.search;
              console.log("[NAV] Root path redirecting to /welcome", { authStatus, search });
              return <Navigate to={`/welcome${search}`} replace />;
            })()
          ) : (
            <Auth />
          )
        }
      />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/confirm" element={<AuthConfirm />} />
      <Route path="/welcome" element={<Welcome />} />
      
      {/* Rotas Core - Dashboard Central */}
      <Route path="/index" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Index /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Index /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/client/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/client/meals" element={<Navigate to="/meals" replace />} />
      <Route path="/client/patient-meal-plan" element={<Navigate to="/patient-meal-plan" replace />} />
      <Route path="/client/journey" element={<Navigate to="/journey" replace />} />
      <Route path="/client/checklist" element={<Navigate to="/checklist" replace />} />
      <Route path="/client/achievements" element={<Navigate to="/achievements" replace />} />


      {/* Mapeamento de Rotas do Nutritionist (Conforme imports acima) */}
      <Route path="/physical-assessment" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PhysicalAssessment /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Patients /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patients/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientDetail /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MyPublicProfile /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/analyze-meal" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AnalyzeMeal /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/diet-builder" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><DietBuilder /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/meal-plans" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MealPlans /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/editor" element={<Navigate to="/editor-v3" replace />} />
      <Route path="/editor-v3" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/editor-v3/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/editor-v2" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2EntryPage /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/editor-v2/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2EntryPage /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/editor-v2/plan/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      
      {/* Legacy routes for compatibility */}
      <Route path="/meal-plans/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/meal-plans/editor/v2" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2EntryPage /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/meal-plans/editor/v2/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV2Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/meal-plans/editor/v3" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/v3" element={<Navigate to="/editor-v3" replace />} />
      <Route path="/v3/:patientId" element={<RedirectWithParams to="/editor-v3/:patientId" />} />
      <Route path="/recipes" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Recipes /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Appointments /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Financial /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Settings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/branding" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Branding /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Integrations /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Reports /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Library /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/automation" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AutomationCenter /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/food-database" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><FoodDatabase /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><CampaignCenter /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/lab-interpreter" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><LabInterpreter /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/mission-control" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MissionControl /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/workspace-editor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WorkspaceEditor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/control-tower" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalControlTower /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/cockpit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><CockpitPremium /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-workspace" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalWorkspace /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/coach-bodybuilder" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><CoachBodybuilder /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/protocols" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Protocols /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/technical-sheets" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><TechnicalSheets /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-brain" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalBrain /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/intelligence-settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><IntelligenceSettings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Chat /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Notifications /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/reset-password" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ResetPassword /></Suspense></ProtectedRoute>} />
      <Route path="/supplements" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Supplements /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/water-calculator" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WaterCalculator /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/weight-calculator" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeightCalculator /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient-meal-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/workouts" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientWorkouts /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/personal/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/personal/students" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalStudents /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/personal/workouts" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalWorkouts /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/personal-dashboard" element={<Navigate to="/personal/dashboard" replace />} />
      <Route path="/body-analysis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><BodyAnalysis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/body-projection" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><BodyProjectionExperience /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/consent" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ConsentRequired /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      
      {/* Rotas de Admin */}
      <Route path="/admin/affiliates" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminAffiliates /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/pricing" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminPricing /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/professionals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminProfessionals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/feature-control" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminFeatureControl /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/protocols" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminNutritionProtocols /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/guide-engine" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminGuideEngine /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/marketing" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminMarketingContent /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/marketing-content" element={<Navigate to="/admin/marketing" replace />} />
      <Route path="/admin/menu-config" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminMenuConfig /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/patient-features" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminPatientFeatures /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/qa" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><QAChecklist /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSettings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/ai-settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AIUsageDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/security" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SecurityDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/health" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemHealthLive /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/growth" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><GrowthDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/testimonials" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminTestimonials /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/resources" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminResourceCenter /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/landing-pages" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSiteEditor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/booking-settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminBookingSettings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/subscription-monitor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSubscriptionMonitor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/admin/migrations" element={<Navigate to="/schema-monitor" replace />} />
      <Route path="/admin/experimental" element={<Navigate to="/admin/feature-control" replace />} />
      <Route path="/admin/performance" element={<Navigate to="/dashboard" replace />} />
      <Route path="/my-referrals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MyReferrals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      
      {/* Rotas Extras e Inteligência */}
      <Route path="/ranking" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><GlobalRanking /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/ambassador" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AmbassadorDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/curiosidades" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Curiosidades /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/global-tips" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><GlobalTips /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/weekly-goals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeeklyGoals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/user-guide" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><UserGuide /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/apresentacao" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemPresentation /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/health-quiz" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><HealthCheckQuiz /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-intelligence" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ProfessionalClinicalAnalytics /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/weekly-report" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeeklyReport /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-risk" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalRiskDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/therapeutic-intelligence" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><TherapeuticIntelligence /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-orchestration" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalOrchestration /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/clinical-predictions" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalPredictions /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/weight-trajectory" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeightTrajectory /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      
      {/* Rotas de Paciente */}
      <Route path="/journey" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Journey /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Achievements /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Challenges /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/checkin" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Checkin /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/meals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Meals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/shopping-list" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ShoppingList /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient-meal-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient-overview" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientOverview /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/my-diet" element={<Navigate to="/patient-meal-plan" replace />} />
      <Route path="/patient-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient-plan/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient/plan/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/patient/view/:token" element={<Suspense fallback={<PageLoader />}><PatientPlanPage /></Suspense>} />
      <Route path="/anamnesis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Anamnesis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/programs" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Programs /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/programs/:programId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ProgramDetail /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/checkin-panel" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><CheckinPanel /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/checklist" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Checklist /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/feedbacks" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Feedbacks /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/fitness-anamnesis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><FitnessAnamnesis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/in-office/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><InOfficeWizard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/in-office" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><InOfficeSelector /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      
      {/* Onboarding */}
      <Route path="/onboarding" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingEntry /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/onboarding/paciente" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingPaciente /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/onboarding/profissional" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingProfissional /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />

      {/* Public/Special */}
      <Route path="/landing" element={<LP><Landing /></LP>} />
      <Route path="/pricing" element={<LP section="Preços"><Pricing /></LP>} />
      <Route path="/terms" element={<LP section="Termos"><TermsOfUse /></LP>} />
      <Route path="/privacy" element={<LP section="Privacidade"><PrivacyPolicy /></LP>} />
      
      {/* Public Booking / Profiles */}
      <Route path="/booking/:slug" element={<Suspense fallback={<PageLoader />}><PublicBooking /></Suspense>} />
      <Route path="/plans/:slug" element={<Suspense fallback={<PageLoader />}><PublicPlans planType="patient_prestige" /></Suspense>} />
      <Route path="/profile/:slug" element={<Suspense fallback={<PageLoader />}><PublicProfile /></Suspense>} />
      <Route path="/program/:programId" element={<Suspense fallback={<PageLoader />}><PublicProgram /></Suspense>} />
      <Route path="/quick-link/:nutriId" element={<Suspense fallback={<PageLoader />}><QuickLink /></Suspense>} />
      
      {/* Protocolos Especiais */}
      <Route path="/biquini-branco" element={<Suspense fallback={<PageLoader />}><BiquiniBrancoLanding /></Suspense>} />
      <Route path="/biquini-branco/:programId" element={<Suspense fallback={<PageLoader />}><BiquiniBrancoDetail /></Suspense>} />
      
      
      {/* Fallback */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  );
};

