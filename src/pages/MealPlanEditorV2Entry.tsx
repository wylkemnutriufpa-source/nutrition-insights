import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { readActiveEditorRoute } from "@/lib/mealPlanEditorStore";
import { supabase } from "@/integrations/supabase/client";

export default function MealPlanEditorV2Entry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!user?.id) return;

    const activeEditorRoute = readActiveEditorRoute();
    if (activeEditorRoute?.shouldRestore) {
      navigate(activeEditorRoute.route, { replace: true });
      return;
    }

    let cancelled = false;

    const openLatestPlanInV2 = async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("nutritionist_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data?.id) {
        navigate("/meal-plans", { replace: true });
        return;
      }

      navigate(`/meal-plans/${data.id}`, { replace: true });
    };

    void openLatestPlanInV2();

    return () => {
      cancelled = true;
    };
  }, [navigate, user?.id]);

  return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </DashboardLayout>
  );
}
