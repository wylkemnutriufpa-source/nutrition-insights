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
import BiquiniBrancoDetail from "./pages/BiquiniBrancoDetail";
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
import ClinicalIntelligence from "./pages/ClinicalIntelligence";
import Chat from "./pages/Chat";
import Appointments from "./pages/Appointments";
import Landing from "./pages/Landing";
import WeeklyGoals from "./pages/WeeklyGoals";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminFeatureControl from "./pages/AdminFeatureControl";
import AdminTestimonials from "./pages/AdminTestimonials";
import AdminSiteEditor from "./pages/AdminSiteEditor";
import AdminResourceCenter from "./pages/AdminResourceCenter";
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
import Pricing from "./pages/Pricing";
import PatientMealPlan from "./pages/PatientMealPlan";
import BiquiniBrancoLanding from "./pages/BiquiniBrancoLanding";
import Checkin from "./pages/Checkin";
import CheckinPanel from "./pages/CheckinPanel";
import ClientDashboard from "./pages/ClientDashboard";
import ImportPatients from "./pages/ImportPatients";
import AdminProfessionals from "./pages/AdminProfessionals";

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

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isNutritionist, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isNutritionist && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PatientRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isPatient } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isPatient) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
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
              <Route path="/landing" element={<Landing />} />
              <Route path="/biquini-branco" element={<BiquiniBrancoLanding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              
              {/* Shared routes (both roles) */}
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/weekly-goals" element={<ProtectedRoute><WeeklyGoals /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/food-database" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
              <Route path="/feedbacks" element={<ProtectedRoute><Feedbacks /></ProtectedRoute>} />
              <Route path="/supplements" element={<ProtectedRoute><Supplements /></ProtectedRoute>} />

              {/* Nutritionist-only routes */}
              <Route path="/patients" element={<NutritionistRoute><Patients /></NutritionistRoute>} />
              <Route path="/patients/:patientId" element={<NutritionistRoute><PatientDetail /></NutritionistRoute>} />
              <Route path="/protocols" element={<NutritionistRoute><Protocols /></NutritionistRoute>} />
              <Route path="/programs" element={<NutritionistRoute><Programs /></NutritionistRoute>} />
              <Route path="/programs/:programId" element={<NutritionistRoute><ProgramDetail /></NutritionistRoute>} />
              <Route path="/programs/:programId/biquini-branco" element={<NutritionistRoute><BiquiniBrancoDetail /></NutritionistRoute>} />
              <Route path="/meal-plans" element={<NutritionistRoute><MealPlans /></NutritionistRoute>} />
              <Route path="/meal-plans/:id" element={<NutritionistRoute><MealPlanEditor /></NutritionistRoute>} />
              <Route path="/diet-templates" element={<NutritionistRoute><DietTemplates /></NutritionistRoute>} />
              <Route path="/physical-assessment" element={<NutritionistRoute><PhysicalAssessment /></NutritionistRoute>} />
              <Route path="/body-analysis" element={<NutritionistRoute><BodyAnalysis /></NutritionistRoute>} />
              <Route path="/branding" element={<NutritionistRoute><Branding /></NutritionistRoute>} />
              <Route path="/reports" element={<NutritionistRoute><Reports /></NutritionistRoute>} />
              <Route path="/weekly-report" element={<NutritionistRoute><WeeklyReport /></NutritionistRoute>} />
              <Route path="/financial" element={<NutritionistRoute><Financial /></NutritionistRoute>} />
              <Route path="/global-tips" element={<NutritionistRoute><GlobalTips /></NutritionistRoute>} />
              <Route path="/automation" element={<NutritionistRoute><AutomationCenter /></NutritionistRoute>} />
              <Route path="/checkin-panel" element={<NutritionistRoute><CheckinPanel /></NutritionistRoute>} />

              {/* Patient portal */}
              <Route path="/client/dashboard" element={<PatientRoute><ClientDashboard /></PatientRoute>} />

              {/* Patient-only routes */}
              <Route path="/meals" element={<ProtectedRoute><Meals /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
              <Route path="/anamnesis" element={<ProtectedRoute><Anamnesis /></ProtectedRoute>} />
              <Route path="/analyze" element={<ProtectedRoute><AnalyzeMeal /></ProtectedRoute>} />
              <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
              <Route path="/my-diet" element={<ProtectedRoute><PatientMealPlan /></ProtectedRoute>} />
              <Route path="/autobot" element={<ProtectedRoute><AutoBot /></ProtectedRoute>} />
              <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/weight-calculator" element={<ProtectedRoute><WeightCalculator /></ProtectedRoute>} />
              <Route path="/water-calculator" element={<ProtectedRoute><WaterCalculator /></ProtectedRoute>} />
              <Route path="/health-quiz" element={<ProtectedRoute><HealthCheckQuiz /></ProtectedRoute>} />
              <Route path="/checkin" element={<ProtectedRoute><Checkin /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/features" element={<AdminRoute><AdminFeatureControl /></AdminRoute>} />
              <Route path="/admin/testimonials" element={<AdminRoute><AdminTestimonials /></AdminRoute>} />
              <Route path="/admin/site-editor" element={<AdminRoute><AdminSiteEditor /></AdminRoute>} />
              <Route path="/admin/resources" element={<AdminRoute><AdminResourceCenter /></AdminRoute>} />
              <Route path="/admin/import-patients" element={<NutritionistRoute><ImportPatients /></NutritionistRoute>} />
              <Route path="/admin/profissionais" element={<AdminRoute><AdminProfessionals /></AdminRoute>} />

              {/* Public pricing */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
