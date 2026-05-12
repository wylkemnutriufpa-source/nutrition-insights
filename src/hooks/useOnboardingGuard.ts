/**
 * Simple status hook to check if onboarding is needed.
 * This hook DOES NOT perform any redirects.
 */
import { useMemo } from "react";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";

export type OnboardingRequirement = "none" | "must_complete" | "loading" | "error_no_link";

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading, isPatient } = useAuth();

  const requirement: OnboardingRequirement = useMemo(() => {
    if (journeyLoading || authLoading) return "loading";
    if (!isPatient) return "none";

    // Informational only
    if (journeyStatus === "no_link") return "error_no_link";
    if (journeyStatus === "onboarding_slides" || journeyStatus === "anamnesis" || journeyStatus === "collecting_profile") {
      return "must_complete";
    }
    
    return "none";
  }, [journeyStatus, journeyLoading, authLoading, isPatient]);

  return { requirement };
}
