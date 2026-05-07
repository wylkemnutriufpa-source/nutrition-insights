import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createMealPlanDraft } from "@/lib/createMealPlanDraft";
import { toast } from "sonner";
import PersonalPremiumDashboard from "@/components/workout/PersonalPremiumDashboard";

/**
 * Cockpit Premium — central hub for nutritionists.
 * Provides quick access to all tools, plan creation, and IFJ intelligence.
 */
export default function CockpitPremium() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const handleNavigate = (tabId: string) => {
    const routeMap: Record<string, string> = {
      // Nutrition
      plans: "/meal-plans",
      templates: "/diet-templates",
      library: "/food-database",
      recipes: "/recipes",
      // Clinical
      ifj: "/clinical-intelligence",
      assessments: "/physical-assessment",
      anamnesis: "/patients",
      // Workspace
      calendar: "/appointments",
      evolution: "/reports",
      periodization: "/protocols",
      cardio: "/body-analysis",
      comparison: "/reports",
      records: "/achievements",
      challenges: "/challenges",
      chat: "/chat",
      export: "/reports",
      preplan: "/automation",
      videos: "/library",
    };

    const route = routeMap[tabId];
    if (route) {
      navigate(route);
    } else {
      toast.info("Módulo em desenvolvimento");
    }
  };

  const handleStartCreating = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      // Navigate to meal plans page which has proper creation flow
      navigate("/meal-plans?action=new");
    } catch {
      toast.error("Erro ao iniciar criação");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PersonalPremiumDashboard
          onNavigate={handleNavigate}
          onStartCreating={handleStartCreating}
          studentsCount={0}
          plansCount={0}
        />
      </div>
    </DashboardLayout>
  );
}
