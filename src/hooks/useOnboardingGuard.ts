/**
 * DEPRECATED for redirects — kept only as a read-only status hook.
 * SystemStateGuard is the SINGLE source of truth for navigation.
 * Pages MUST NOT call navigate() based on this hook's output.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";
import { useAppState } from "./useAppState";
import { useExperienceMode } from "./useExperienceMode";
import { useConsentGuard } from "./useConsentGuard";
import { getSystemDecision, type GovernanceContext } from "@/lib/governance";

export type OnboardingRequirement = "none" | "must_complete" | "loading" | "error_no_link";

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading, user, profile, isNutritionist, isPersonal, isAdmin, isPatient } = useAuth();
  const { mode, role } = useExperienceMode();
  const { isReady, isDegraded } = useAppState();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();

  const requirement: OnboardingRequirement = useMemo(() => {
    if (journeyLoading || authLoading || !isReady || (isPatient && consentLoading)) return "loading";

    const ctx: GovernanceContext = {
      pathname: location.pathname,
      user,
      profile,
      journeyStatus: journeyStatus as any,
      anamnesisStatus: journeyStatus === 'ready_for_plan' || journeyStatus === 'active_plan' ? 'completed' : 'pending',
      hasConsent: isPatient ? hasConsent : true,
      mode,
      role,
      isReady,
      isDegraded,
      isNutritionist,
      isPersonal,
      isAdmin,
    };

    const decision = getSystemDecision(ctx);
    if (decision.type === 'REDIRECT' && (decision.target === '/onboarding' || decision.target === '/onboarding/paciente' || decision.target === '/consent')) {
      return "must_complete";
    }
    if (journeyStatus === "no_link") return "error_no_link";
    return "none";
  }, [journeyStatus, journeyLoading, authLoading, location.pathname, isReady, isDegraded, mode, role, user, profile, isNutritionist, isPersonal, isAdmin, hasConsent, consentLoading, isPatient]);

  return { requirement };
}
