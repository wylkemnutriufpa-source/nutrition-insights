import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { readActiveEditorRoute } from "@v1/lib/mealPlanEditorStore";
import { supabase } from "@v1/integrations/supabase/client";

export default function MealPlanEditorV2Entry() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId?: string }>();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  useEffect(() => {
    if (!user?.id) return;

    const activeEditorRoute = readActiveEditorRoute();
    if (activeEditorRoute?.shouldRestore && !patientId) {
      navigate(activeEditorRoute.route, { replace: true });
      return;
    }

    let cancelled = false;

    const openLatestPlanInV2 = async () => {
      let query = supabase
        .from("meal_plans")
        .select("id")
        .eq("nutritionist_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await withTenantFilter(query, tenantId).maybeSingle();

      if (cancelled) return;

      if (error || !data?.id) {
        // If no plan exists for this patient, we might want to redirect to meal-plans list
        // or patient detail. Standard V2 behavior was redirecting to /meal-plans.
        navigate(patientId ? `/patients/${patientId}` : "/meal-plans", { replace: true });
        return;
      }

      navigate(`/editor-v2/plan/${data.id}`, { replace: true });
    };

    void openLatestPlanInV2();

    return () => {
      cancelled = true;
    };
  }, [navigate, user?.id, patientId, tenantId]);

  return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </DashboardLayout>
  );
}
