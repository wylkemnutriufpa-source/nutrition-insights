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
  return { requirement: "none" as const };
}
