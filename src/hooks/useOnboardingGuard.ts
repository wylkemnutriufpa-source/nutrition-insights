/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";

export type OnboardingRequirement = "none" | "must_complete" | "loading";

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
  return ONBOARDING_ALLOWED_ROUTES.some(route => pathname.startsWith(route));
}

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading } = useAuth();
  const location = useLocation();

  const requirement: OnboardingRequirement = useMemo(() => {
    // Wait for BOTH auth (roles) and journey status to load
    if (journeyLoading || authLoading) return "loading";
    
    // REDIRECT PROTECTION: Do not suggest completion if we are already on an allowed route
    if (isOnboardingAllowedRoute(location.pathname)) {
      return "none";
    }

    // Se o estado for 'awaiting_consent' ou 'lead_created', o paciente PRECISA aceitar o consentimento primeiro
    if (journeyStatus === "awaiting_consent" || journeyStatus === "lead_created") {
      return "must_complete";
    }

    return "none";
  }, [journeyStatus, journeyLoading, authLoading, location.pathname]);

  return { requirement };
}
