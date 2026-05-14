/**
 * ══════════════════════════════════════════════════════════════════
 * ROUTE PROTECTION — SYSTEM CORE
 * ESTABILIZAÇÃO SOBERANA LOCKDOWN
 * QUALQUER ALTERAÇÃO AQUI PODE IMPACTAR TODO O RUNTIME
 * ══════════════════════════════════════════════════════════════════
 */
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { lazy, Suspense, useEffect } from "react";
import PageLoader from "@/components/common/PageLoader";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootRouter } from "@/components/auth/RootRouter";
import { LP } from "./RouteHelpers";
import { SandboxV3Guard } from "./SandboxV3Guard";

// Domain Routes
import { authRoutes } from "./auth.routes";
import { adminRoutes } from "./admin.routes";
import { editorRoutes } from "./editor.routes";
import { patientRoutes } from "./patient.routes";

// Core / Common Pages
const Index = lazy(() => import("../pages/Index"));
const ClientDashboard = lazy(() => import("../pages/ClientDashboard"));
const AnalyzeMeal = lazy(() => import("../pages/AnalyzeMeal"));
const Settings = lazy(() => import("../pages/Settings"));
const Branding = lazy(() => import("../pages/Branding"));
const Integrations = lazy(() => import("../pages/Integrations"));
const Reports = lazy(() => import("../pages/Reports"));
const Library = lazy(() => import("../pages/Library"));
const Chat = lazy(() => import("../pages/Chat"));
const Notifications = lazy(() => import("../pages/Notifications"));
const WaterCalculator = lazy(() => import("../pages/WaterCalculator"));
const WeightCalculator = lazy(() => import("../pages/WeightCalculator"));
const ConsentRequired = lazy(() => import("../pages/ConsentRequired"));
const Programs = lazy(() => import("../pages/Programs"));
const ProgramDetail = lazy(() => import("../pages/ProgramDetail"));
const OnboardingEntry = lazy(() => import("../components/onboarding/OnboardingEntry"));
const OnboardingPaciente = lazy(() => import("../pages/OnboardingPaciente"));
const OnboardingProfissional = lazy(() => import("../pages/OnboardingProfissional"));
const Landing = lazy(() => import("../pages/Landing"));
const Pricing = lazy(() => import("../pages/Pricing"));
const TermsOfUse = lazy(() => import("../pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Curiosidades = lazy(() => import("../pages/Curiosidades"));
const GlobalTips = lazy(() => import("../pages/GlobalTips"));
const UserGuide = lazy(() => import("../pages/UserGuide"));
const SystemPresentation = lazy(() => import("../pages/SystemPresentation"));
const HealthCheckQuiz = lazy(() => import("../pages/HealthCheckQuiz"));
const PublicBooking = lazy(() => import("../pages/PublicBooking"));
const PublicPlans = lazy(() => import("../pages/PublicPlans"));
const PublicProfile = lazy(() => import("../pages/PublicProfile"));
const PublicProgram = lazy(() => import("../pages/PublicProgram"));
const QuickLink = lazy(() => import("../pages/QuickLink"));
const BiquiniBrancoLanding = lazy(() => import("../pages/BiquiniBrancoLanding"));
const BiquiniBrancoDetail = lazy(() => import("../pages/BiquiniBrancoDetail"));
const MyReferrals = lazy(() => import("../pages/MyReferrals"));
const MyPublicProfile = lazy(() => import("../pages/MyPublicProfile"));
const SovereignDashboard = lazy(() => import("../pages/SovereignDashboard"));
const V3LibrarySandbox = lazy(() => import("../pages/V3LibrarySandbox"));

export const AppRoutes = () => {
  const { authStatus, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log(`[RASTREADOR] AppRoutes montado/atualizado | path: ${location.pathname} | authStatus: ${authStatus} | user: ${!!user}`);
  }, [location.pathname, authStatus, user]);

  return (
    <Routes>
      <Route path="/" element={<RootRouter />} />
      
      {/* Fragments */}
      {authRoutes}
      {adminRoutes}
      {editorRoutes}
      {patientRoutes}

      {/* Shared / Core Protected Routes */}
      <Route path="/index" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Index /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Index /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/analyze-meal" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AnalyzeMeal /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Settings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/branding" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Branding /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Integrations /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Reports /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Library /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Chat /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Notifications /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/water-calculator" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WaterCalculator /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/weight-calculator" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeightCalculator /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/consent" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ConsentRequired /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/programs" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Programs /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/programs/:programId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ProgramDetail /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/my-referrals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MyReferrals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MyPublicProfile /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/sovereign" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SovereignDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/sandbox-v3" element={<SandboxV3Guard><Suspense fallback={<PageLoader />}><V3LibrarySandbox /></Suspense></SandboxV3Guard>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingEntry /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/onboarding/paciente" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingPaciente /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/onboarding/profissional" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OnboardingProfissional /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />

      {/* Public Pages */}
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
      
      {/* Miscellaneous / Intelligence */}
      <Route path="/curiosidades" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Curiosidades /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/global-tips" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><GlobalTips /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/user-guide" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><UserGuide /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/apresentacao" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemPresentation /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />
      <Route path="/health-quiz" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><HealthCheckQuiz /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />

      {/* Protocolos Especiais */}
      <Route path="/biquini-branco" element={<Suspense fallback={<PageLoader />}><BiquiniBrancoLanding /></Suspense>} />
      <Route path="/biquini-branco/:programId" element={<Suspense fallback={<PageLoader />}><BiquiniBrancoDetail /></Suspense>} />

      {/* Fallback */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
