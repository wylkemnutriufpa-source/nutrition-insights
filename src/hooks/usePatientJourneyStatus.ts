import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type JourneyStatus =
  | "lead_created"
  | "awaiting_payment"
  | "awaiting_consent"
  | "awaiting_onboarding_release"
  | "onboarding_active"
  | "onboarding_completed"
  | "draft_ready_for_review"
  | "plan_published"
  | "active_followup"
  | "clinical_followup_active"
  | "active" // legacy
  | null;

/**
 * Returns the patient's journey_status from nutritionist_patients.
 * For patients with no link or legacy patients, returns "active".
 */
export function usePatientJourneyStatus() {
  const { user, isPatient } = useAuth();
  const [status, setStatus] = useState<JourneyStatus>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isPatient) { setLoading(false); return; }

    (async () => {
      const { data } = await supabase
        .from("nutritionist_patients")
        .select("journey_status")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setStatus((data as any)?.journey_status || "active");
      setLoading(false);
    })();
  }, [user, isPatient]);

  const canAccessOnboarding = status === "onboarding_active" || status === "active" || status === "clinical_followup_active" || status === "onboarding_completed";

  return { status, loading, canAccessOnboarding };
}
