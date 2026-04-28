/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";

export type OnboardingRequirement = "none" | "must_complete" | "loading" | "error_no_link";

// Routes the patient is allowed to visit even when onboarding is mandatory
const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding",
  "/onboarding-pipeline",
  "/consent",
  "/auth",
  "/reset-password",
  "/settings",
  "/privacy-policy",
  "/termos-de-uso",
  "/support"
];

export function isOnboardingAllowedRoute(pathname: string): boolean {
  // Normalize path to check prefix
  const path = pathname === "/" ? "/" : pathname;
  return ONBOARDING_ALLOWED_ROUTES.some(route => path.startsWith(route));
}

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const requirement: OnboardingRequirement = useMemo(() => {
    // Wait for BOTH auth (roles) and journey status to load
    if (journeyLoading || authLoading) return "loading";
    
    // REDIRECT PROTECTION: Do not suggest completion if we are already on an allowed route
    // This prevents infinite loops
    if (isOnboardingAllowedRoute(location.pathname)) {
      console.log(`[OnboardingGuard] Path allowed, skipping redirect: ${location.pathname}`);
      return "none";
    }

    // JOURNEY STATUS LOGGING
    console.log(`[OnboardingGuard] Path: ${location.pathname} | Status: ${journeyStatus}`);

    if (journeyStatus === "no_link" || journeyStatus === null) {
      console.error("[OnboardingGuard] CRITICAL: Patient has no nutritionist link");
      return "error_no_link";
    }

    // CRITICAL: Define states that MUST BE on onboarding/consent routes
    const isLockedState = 
      journeyStatus === "awaiting_consent" || 
      journeyStatus === "lead_created" || 
      journeyStatus === "onboarding_active";

    if (isLockedState) {
      console.log(`[OnboardingGuard] Locked state (${journeyStatus}) detected on ${location.pathname}. Redirect required.`);
      return "must_complete";
    }

    return "none";
  }, [journeyStatus, journeyLoading, authLoading, location.pathname]);

  return { requirement };
}
