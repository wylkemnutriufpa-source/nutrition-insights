/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";
import { useAppState } from "./useAppState";
import { useExperienceMode } from "./useExperienceMode";
import { getSystemDecision, type GovernanceContext } from "@/lib/governance";

export type OnboardingRequirement = "none" | "must_complete" | "loading" | "error_no_link";

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading, user, profile, isNutritionist, isPersonal, isAdmin } = useAuth();
  const { mode, role } = useExperienceMode();
  const { isReady, isDegraded } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (journeyLoading || authLoading || !user || !isReady) return;

    const ctx: GovernanceContext = {
      pathname: location.pathname,
      user,
      profile,
      journeyStatus: journeyStatus as any,
      anamnesisStatus: journeyStatus === 'ready_for_plan' || journeyStatus === 'active_plan' ? 'completed' : 'pending',
      mode,
      role,
      isReady,
      isDegraded,
      isNutritionist,
      isPersonal,
      isAdmin
    };

    const decision = getSystemDecision(ctx);

    if (decision.type === 'REDIRECT' && decision.target && decision.target !== location.pathname) {
      navigate(decision.target, { replace: true });
    }
  }, [journeyStatus, journeyLoading, authLoading, location.pathname, user, profile, isReady, isDegraded, mode, role, navigate, isNutritionist, isPersonal, isAdmin]);

  const requirement: OnboardingRequirement = useMemo(() => {
    if (journeyLoading || authLoading || !isReady) return "loading";
    
    const ctx: GovernanceContext = {
      pathname: location.pathname,
      user,
      profile,
      journeyStatus: journeyStatus as any,
      anamnesisStatus: journeyStatus === 'ready_for_plan' || journeyStatus === 'active_plan' ? 'completed' : 'pending',
      mode,
      role,
      isReady,
      isDegraded,
      isNutritionist,
      isPersonal,
      isAdmin
    };

    const decision = getSystemDecision(ctx);
    if (decision.type === 'REDIRECT' && (decision.target === '/onboarding' || decision.target === '/consent')) {
      return "must_complete";
    }
    if (journeyStatus === "no_link") return "error_no_link";

    return "none";
  }, [journeyStatus, journeyLoading, authLoading, location.pathname, isReady, isDegraded, mode, role, user, profile, isNutritionist, isPersonal, isAdmin]);

  return { requirement };
}
