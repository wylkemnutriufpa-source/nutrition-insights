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
 * Centralized rule for allowed (non-blocking) states.
 * States like lead_created and awaiting_consent are FLUID - they should not block the dashboard
 * because components like OnboardingProgressModal will take over to guide the user.
 */
export const IS_FLUID_STATE = (status: JourneyStatus) => 
  status === "active" || status === "onboarding_active";

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

    let cancelled = false;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("nutritionist_patients")
        .select("journey_status")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setStatus((data as any)?.journey_status || "active");
        setLoading(false);
      }
    };

    fetchStatus();

    // Listen for realtime changes to journey_status
    const channel = supabase
      .channel(`journey-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "nutritionist_patients",
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.journey_status;
          if (newStatus) setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, isPatient]);

  const canAccessOnboarding = status === "lead_created" || status === "awaiting_consent" || status === "onboarding_active" || status === "onboarding_completed" || status === "draft_ready_for_review" || status === "plan_published" || status === "active_followup" || status === "active" || status === "clinical_followup_active";

  return { status, loading, canAccessOnboarding };
}
