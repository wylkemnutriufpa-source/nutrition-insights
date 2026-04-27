/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resolvePatientIdentity } from "@/lib/onboardingPlanResolver";

export type OnboardingRequirement = "none" | "must_complete" | "loading";

// Routes the patient is allowed to visit regardless of state
const ONBOARDING_ALLOWED_ROUTES = ["*"];

export function isOnboardingAllowedRoute(_pathname: string): boolean {
  return true;
}

export function useOnboardingGuard() {
  const { status: journeyStatus, loading } = usePatientJourneyStatus();
  const location = useLocation();

  const requirement: OnboardingRequirement = useMemo(() => {
    if (loading) return \"loading\";
    
    // Se o estado for 'awaiting_consent' ou 'lead_created', o paciente PRECISA aceitar o consentimento primeiro
    if (journeyStatus === \"awaiting_consent\" || journeyStatus === \"lead_created\") {
      return \"must_complete\";
    }

    return \"none\";
  }, [journeyStatus, loading]);

  return { requirement };
}
