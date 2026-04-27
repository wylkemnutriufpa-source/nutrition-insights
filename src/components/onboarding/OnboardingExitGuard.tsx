import { useEffect } from "react";
import { usePatientJourneyStatus, IS_FLUID_STATE } from "@/hooks/usePatientJourneyStatus";

interface OnboardingExitGuardProps {
  /** 
   * If provided, overrides the default journey-based logic. 
   * Useful when we want to force enable/disable from props.
   */
  enabled?: boolean;
}

/**
 * OnboardingExitGuard v2.0.0
 * Prevents patients from accidentally leaving the onboarding flow.
 * Uses centralized IS_FLUID_STATE to maintain consistency with other guards.
 */
export default function OnboardingExitGuard({ enabled }: OnboardingExitGuardProps) {
  const { status: journeyStatus, loading } = usePatientJourneyStatus();

  // If enabled prop is not provided, we use the journey-based logic:
  // We only guard if the state is "fluid" (early onboarding), but not yet "active" (finished).
  // Once active, the user is free to move around.
  const isEarlyOnboarding = journeyStatus !== null && 
    (journeyStatus === "lead_created" || journeyStatus === "awaiting_consent" || journeyStatus === "onboarding_active");
    
  const isActiveGuard = enabled ?? (isEarlyOnboarding && !loading);

  useEffect(() => {
    if (!isActiveGuard) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Standard way to show "Are you sure?" browser dialog
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isActiveGuard]);

  return null;
}
