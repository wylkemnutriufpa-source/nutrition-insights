import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";

export function usePatientPoints() {
  const { user } = useAuth();

  async function awardPoints(actionKey: string, metadata: Record<string, any> = {}) {
    if (!user) return null;
    const { data, error } = await supabase.rpc("award_points", {
      _patient_id: user.id,
      _action_key: actionKey,
      _metadata: metadata,
    });
    if (error) {
      console.error("award_points error:", error);
      return null;
    }
    const result = data as any;
    // Points awarded silently — no toast to avoid inducing clicks

    return result;
  }

  return { awardPoints };
}
