import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect, lazy, Suspense } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";

// ── EAGER LOADED (CRITICAL) ───────────────────────────
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// ── LAZY LOADED PAGES ────────────────────────────────
// Core / Shared
const Chat = lazy(() => import("./pages/Chat"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const FoodDatabase = lazy(() => import("./pages/FoodDatabase"));
const Recipes = lazy(() => import("./pages/Recipes"));
const Feedbacks = lazy(() => import("./pages/Feedbacks"));

// Nutritionist Flow
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Protocols = lazy(() => import("./pages/Protocols"));
const Programs = lazy(() => import("./pages/Programs"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const MealPlans = lazy(() => import("./pages/MealPlans"));
const MealPlanEditor = lazy(() => import("./pages/MealPlanEditor"));
const DietTemplates = lazy(() => import("./pages/DietTemplates"));
const PhysicalAssessment = lazy(() => import("./pages/PhysicalAssessment"));
const Branding = lazy(() => import("./pages/Branding"));
const Reports = lazy(() => import("./pages/Reports"));
const Financial = lazy(() => import("./pages/Financial"));
const AutomationCenter = lazy(() => import("./pages/AutomationCenter"));

// Patient Flow
const Meals = lazy(() => import("./pages/Meals"));
const AnalyzeMeal = lazy(() => import("./pages/AnalyzeMeal"));
const Journey = lazy(() => import("./pages/Journey"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const PatientMealPlan = lazy(() => import("./pages/PatientMealPlan"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function DarkModeInit() {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);
  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Helmet>
          <title>FitJourney — Plataforma para Nutricionistas</title>
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DarkModeInit />
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Dashboard & Home */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                
                {/* Rotas Nutricionista */}
                <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
                <Route path="/patients/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
                <Route path="/protocols" element={<ProtectedRoute><Protocols /></ProtectedRoute>} />
                <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
                <Route path="/programs/:programId" element={<ProtectedRoute><ProgramDetail /></ProtectedRoute>} />
                <Route path="/meal-plans" element={<ProtectedRoute><MealPlans /></ProtectedRoute>} />
                <Route path="/meal-plans/:id" element={<ProtectedRoute><MealPlanEditor /></ProtectedRoute>} />
                <Route path="/diet-templates" element={<ProtectedRoute><DietTemplates /></ProtectedRoute>} />
                <Route path="/physical-assessment" element={<ProtectedRoute><PhysicalAssessment /></ProtectedRoute>} />
                <Route path="/branding" element={<ProtectedRoute><Branding /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
                <Route path="/automation" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />

                {/* Rotas Paciente */}
                <Route path="/client/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
                <Route path="/meals" element={<ProtectedRoute><Meals /></ProtectedRoute>} />
                <Route path="/analyze" element={<ProtectedRoute><AnalyzeMeal /></ProtectedRoute>} />
                <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
                <Route path="/patient/plan" element={<ProtectedRoute><PatientMealPlan /></ProtectedRoute>} />

                {/* Rotas Admin */}
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

                {/* Shared */}
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/food-database" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
                <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
                <Route path="/feedbacks" element={<ProtectedRoute><Feedbacks /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
