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

// Eager
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

// Lazy
const Patients = lazy(() => import("./pages/Patients"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const MealPlanEditorV3 = lazy(() => import("./pages/MealPlanEditorV3Page"));
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
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BodyAnalysis = lazy(() => import("./pages/BodyAnalysis"));
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
              <Route path="/appointments" element={<NutritionistRoute><LP section="Agenda"><Appointments /></LP></NutritionistRoute>} />
              <Route path="/anamnesis" element={<NutritionistRoute><LP section="Anamnese"><Anamnesis /></LP></NutritionistRoute>} />
              <Route path="/meals" element={<NutritionistRoute><LP section="Refeições"><Meals /></LP></NutritionistRoute>} />
              <Route path="/recipes" element={<NutritionistRoute><LP section="Receitas"><Recipes /></LP></NutritionistRoute>} />
              <Route path="/shopping-list" element={<ProtectedRoute><LP section="Lista de Compras"><ShoppingList /></LP></ProtectedRoute>} />
              <Route path="/financial" element={<NutritionistRoute><LP section="Financeiro"><Financial /></LP></NutritionistRoute>} />
              <Route path="/integrations" element={<NutritionistRoute><LP section="Integrações"><Integrations /></LP></NutritionistRoute>} />
              <Route path="/branding" element={<NutritionistRoute><LP section="Marca"><Branding /></LP></NutritionistRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><LP section="Notificações"><Notifications /></LP></ProtectedRoute>} />
              <Route path="/diet-builder" element={<NutritionistRoute><LP section="Diet Builder"><DietBuilder /></LP></NutritionistRoute>} />
              <Route path="/diet-templates" element={<NutritionistRoute><LP section="Templates de Dieta"><DietTemplates /></LP></NutritionistRoute>} />
              <Route path="/food-database" element={<NutritionistRoute><LP section="Banco de Alimentos"><FoodDatabase /></LP></NutritionistRoute>} />
              
              {/* Editor V3 Routes */}
              <Route path="/meal-plan-editor-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/meal-plan-editor-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              
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
              <Route path="/admin/resource-center" element={<NutritionistRoute><LP section="Centro de Recursos"><AdminResourceCenter /></LP></NutritionistRoute>} />
              <Route path="/admin/testimonials" element={<NutritionistRoute><LP section="Depoimentos"><AdminTestimonials /></LP></NutritionistRoute>} />
              <Route path="/patient-intelligence" element={<NutritionistRoute><LP section="Inteligência do Paciente"><PatientIntelligence /></LP></NutritionistRoute>} />
              <Route path="/control-tower" element={<NutritionistRoute><LP section="Torre de Controle"><ClinicalControlTower /></LP></NutritionistRoute>} />
              <Route path="/technical-sheets" element={<NutritionistRoute><LP section="Fichas Técnicas"><TechnicalSheets /></LP></NutritionistRoute>} />
              
              {/* Legal Routes */}
              <Route path="/privacy-policy" element={<LP section="Privacidade"><PrivacyPolicy /></LP>} />
              <Route path="/terms-of-use" element={<LP section="Termos de Uso"><TermsOfUse /></LP>} />
              
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
