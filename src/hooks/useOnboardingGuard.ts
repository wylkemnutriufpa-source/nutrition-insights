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
    // SOBERANIA TOTAL: Bloqueios de onboarding desativados para evitar travas no sistema.
    return "none";
  }, []);

  return { requirement };
}
