import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Meals from "./pages/Meals";
import Achievements from "./pages/Achievements";
import Challenges from "./pages/Challenges";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import MealPlans from "./pages/MealPlans";
import MealPlanEditor from "./pages/MealPlanEditor";
import Anamnesis from "./pages/Anamnesis";
import AnalyzeMeal from "./pages/AnalyzeMeal";
import Settings from "./pages/Settings";
import Protocols from "./pages/Protocols";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import Checklist from "./pages/Checklist";
import DietTemplates from "./pages/DietTemplates";
import PhysicalAssessment from "./pages/PhysicalAssessment";
import Feedbacks from "./pages/Feedbacks";
import GlobalTips from "./pages/GlobalTips";
import Recipes from "./pages/Recipes";
import ShoppingList from "./pages/ShoppingList";
import FoodDatabase from "./pages/FoodDatabase";
import BodyAnalysis from "./pages/BodyAnalysis";
import Branding from "./pages/Branding";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import Chat from "./pages/Chat";
import Appointments from "./pages/Appointments";
import Landing from "./pages/Landing";
import WeeklyGoals from "./pages/WeeklyGoals";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminFeatureControl from "./pages/AdminFeatureControl";
import AdminTestimonials from "./pages/AdminTestimonials";
import AutomationCenter from "./pages/AutomationCenter";
import WeightCalculator from "./pages/WeightCalculator";
import WaterCalculator from "./pages/WaterCalculator";
import HealthCheckQuiz from "./pages/HealthCheckQuiz";
import AutoBot from "./pages/AutoBot";
import Journey from "./pages/Journey";
import Library from "./pages/Library";
import Financial from "./pages/Financial";
import WeeklyReport from "./pages/WeeklyReport";
import Supplements from "./pages/Supplements";

const queryClient = new QueryClient();

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

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
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
          <meta name="description" content="Plataforma completa para nutricionistas: planos alimentares, IA, gamificação, avaliações físicas e gestão de pacientes." />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <link rel="canonical" href="https://fitjourney.app" />
        </Helmet>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DarkModeInit />
            <Routes>
              <Route path="/landing" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/meals" element={<ProtectedRoute><Meals /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
              <Route path="/patients/:patientId" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
              <Route path="/protocols" element={<ProtectedRoute><Protocols /></ProtectedRoute>} />
              <Route path="/programs" element={<ProtectedRoute><Programs /></ProtectedRoute>} />
              <Route path="/programs/:programId" element={<ProtectedRoute><ProgramDetail /></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
              <Route path="/meal-plans" element={<ProtectedRoute><MealPlans /></ProtectedRoute>} />
              <Route path="/meal-plans/:id" element={<ProtectedRoute><MealPlanEditor /></ProtectedRoute>} />
              <Route path="/diet-templates" element={<ProtectedRoute><DietTemplates /></ProtectedRoute>} />
              <Route path="/physical-assessment" element={<ProtectedRoute><PhysicalAssessment /></ProtectedRoute>} />
              <Route path="/anamnesis" element={<ProtectedRoute><Anamnesis /></ProtectedRoute>} />
              <Route path="/analyze" element={<ProtectedRoute><AnalyzeMeal /></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute><Feedbacks /></ProtectedRoute>} />
              <Route path="/global-tips" element={<ProtectedRoute><GlobalTips /></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
              <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
              <Route path="/food-database" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
              <Route path="/body-analysis" element={<ProtectedRoute><BodyAnalysis /></ProtectedRoute>} />
              <Route path="/branding" element={<ProtectedRoute><Branding /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/weekly-goals" element={<ProtectedRoute><WeeklyGoals /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/features" element={<ProtectedRoute><AdminFeatureControl /></ProtectedRoute>} />
              <Route path="/admin/testimonials" element={<ProtectedRoute><AdminTestimonials /></ProtectedRoute>} />
              {/* Automation */}
              <Route path="/automation" element={<ProtectedRoute><AutomationCenter /></ProtectedRoute>} />
              {/* Calculators */}
              <Route path="/weight-calculator" element={<ProtectedRoute><WeightCalculator /></ProtectedRoute>} />
              <Route path="/water-calculator" element={<ProtectedRoute><WaterCalculator /></ProtectedRoute>} />
              <Route path="/health-quiz" element={<ProtectedRoute><HealthCheckQuiz /></ProtectedRoute>} />
              {/* Lote 2 */}
              <Route path="/autobot" element={<ProtectedRoute><AutoBot /></ProtectedRoute>} />
              <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/financial" element={<ProtectedRoute><Financial /></ProtectedRoute>} />
              <Route path="/weekly-report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
