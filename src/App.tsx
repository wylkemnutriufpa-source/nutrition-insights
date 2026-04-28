import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenantContext";
import { supabase } from "@/integrations/supabase/client";
import { ExperienceModeContext, useExperienceModeState, useExperienceMode } from "@/hooks/useExperienceMode";
import { lazy, Suspense, useEffect, useState } from "react";
import { AppStateProvider, useAppState } from "@/hooks/useAppState";
import { DegradedModeBanner } from "@/components/common/DegradedModeBanner";
import { HardFailLinkage } from "@/components/common/HardFailLinkage";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { GlobalErrorBoundary, CriticalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { CelebrationProvider } from "@/components/common/SuccessCelebration";
import PageLoader from "@/components/common/PageLoader";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";
import { CommandPaletteProvider } from "@/components/common/CommandPalette";
import NeuralScreensaver from "@/components/common/NeuralScreensaver";
import FitIntelligenceAssistant from "@/components/intelligence/FitIntelligenceAssistant";
import IFJPatientCoach from "@/components/intelligence/modules/IFJPatientCoach";
import ExperienceRouteGuard from "@/components/common/ExperienceRouteGuard";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { MobileAutoFixer } from "@/components/common/MobileAutoFixer";
import { AnimatePresence } from "framer-motion";
import SafePage from "@/components/common/SafePage";
import PatientReadyGuard from "@/components/common/PatientReadyGuard";
import { UpdateBanner } from "@/components/common/UpdateBanner";
import { SystemStateGuard } from "@/components/common/SystemStateGuard";


// Eager
import GatewayPage from "./pages/GatewayPage";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import NotFound from "./pages/NotFound";

// Lazy
const Index = lazy(() => import("./pages/Index"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const MealPlans = lazy(() => import("./pages/MealPlans"));
const MealPlanEditorV2 = lazy(() => import("./pages/MealPlanEditorV2"));
const DietBuilder = lazy(() => import("./pages/diet-builder/DietBuilder"));
const Settings = lazy(() => import("./pages/Settings"));
const Protocols = lazy(() => import("./pages/Protocols"));
const Programs = lazy(() => import("./pages/Programs"));
const Chat = lazy(() => import("./pages/Chat"));
const Appointments = lazy(() => import("./pages/Appointments"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const OnboardingTracker = lazy(() => import("./pages/OnboardingTracker"));
const PatientRegister = lazy(() => import("./pages/PatientRegister"));
const GlobalRanking = lazy(() => import("./pages/GlobalRanking"));
const OnboardingProfissional = lazy(() => import("./pages/OnboardingProfissional"));
const OnboardingPaciente = lazy(() => import("./pages/OnboardingPaciente"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const PatientOverview = lazy(() => import("./pages/PatientOverview"));
const PatientWorkouts = lazy(() => import("./pages/PatientWorkouts"));
const PatientIntelligence = lazy(() => import("./pages/PatientIntelligence"));
const Anamnesis = lazy(() => import("./pages/Anamnesis"));
const Checklist = lazy(() => import("./pages/Checklist"));
const PatientMealPlan = lazy(() => import("./pages/PatientMealPlan"));
const DiagnosticStatus = lazy(() => import("./pages/DiagnosticStatus"));
const PatientLanding = lazy(() => import("./pages/PatientLanding"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const InvitationStatus = lazy(() => import("./pages/InvitationStatus"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
const PhytotherapyProtocols = lazy(() => import("./pages/PhytotherapyProtocols"));
const ClinicalCRM = lazy(() => import("./pages/ClinicalCRM"));
const ClinicalBrain = lazy(() => import("./pages/ClinicalBrain"));
const IntelligenceSettings = lazy(() => import("./pages/IntelligenceSettings"));
const PersonalDashboard = lazy(() => import("./pages/PersonalDashboard"));
const PersonalStudents = lazy(() => import("./pages/PersonalStudents"));
const PersonalWorkouts = lazy(() => import("./pages/PersonalWorkouts"));
const FitnessAnamnesis = lazy(() => import("./pages/FitnessAnamnesis"));
const ConsentRequired = lazy(() => import("./pages/ConsentRequired"));
const PaymentRequired = lazy(() => import("./pages/PaymentRequired"));
const SystemDiagnostics = lazy(() => import("./pages/SystemDiagnostics"));
const ClinicalHealthDashboard = lazy(() => import("./pages/ClinicalHealthDashboard"));
const RealtimeDebugCenter = lazy(() => import("./pages/RealtimeDebugCenter"));
const CoachBodybuilder = lazy(() => import("./pages/CoachBodybuilder"));
const SystemHealthLive = lazy(() => import("./pages/SystemHealthLive"));
const OperationalDashboard = lazy(() => import("./pages/OperationalDashboard"));
const CockpitPremium = lazy(() => import("./pages/CockpitPremium"));
const ClinicalWorkspace = lazy(() => import("./pages/ClinicalWorkspace"));
const WorkspaceEditor = lazy(() => import("./pages/WorkspaceEditor"));
const WeightTrajectory = lazy(() => import("./pages/WeightTrajectory"));
const MetabolicTwin = lazy(() => import("./pages/MetabolicTwin"));
const PopulationNutritionIntelligence = lazy(() => import("./pages/PopulationNutritionIntelligence"));
const PlatformGovernance = lazy(() => import("./pages/PlatformGovernance"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const ClinicalPipeline = lazy(() => import("./pages/ClinicalPipeline"));
const Integrations = lazy(() => import("./pages/Integrations"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));

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

function PatientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPatient } = useAuth();
  if (loading) return user ? <>{children}</> : <PageLoader />;
  if (!user || !isPatient) return <Navigate to="/" replace />;
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
  const { isNutritionist, isPersonal, isAdmin, isPatient, loading } = useAuth();
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
            <Route path="/diet-builder" element={<NutritionistRoute><LP section="Diet Builder"><DietBuilder /></LP></NutritionistRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><LP section="Ranking"><GlobalRanking /></LP></ProtectedRoute>} />
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
