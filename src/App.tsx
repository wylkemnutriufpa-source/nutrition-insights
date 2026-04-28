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
              <Route path="/cadastro" element={<LP section="Cadastro"><PatientRegister /></LP>} />
              <Route path="/patients" element={<NutritionistRoute><LP section="Pacientes"><Patients /></LP></NutritionistRoute>} />
              <Route path="/client/dashboard" element={<PaymentGuardedPatientRoute><LP section="Dashboard"><ClientDashboard /></LP></PaymentGuardedPatientRoute>} />
              <Route path="/meal-plan-editor-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/meal-plan-editor-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3/:patientId" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/dieta-v3" element={<NutritionistRoute><LP section="Editor V3"><MealPlanEditorV3 /></LP></NutritionistRoute>} />
              <Route path="/diet-builder" element={<NutritionistRoute><LP section="Diet Builder"><DietBuilder /></LP></NutritionistRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><LP section="Ranking"><GlobalRanking /></LP></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<NutritionistRoute><LP section="Audit Logs"><AuditLogs /></LP></NutritionistRoute>} />
              <Route path="/admin/clinical-rules" element={<NutritionistRoute><LP section="Regras Clínicas"><ClinicalRulesAdmin /></LP></NutritionistRoute>} />
              <Route path="*" element={<LP section="404"><NotFound /></LP>} />
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
