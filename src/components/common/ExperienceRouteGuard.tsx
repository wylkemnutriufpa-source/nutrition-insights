import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";
import { useAppState } from "@/hooks/useAppState";
import { getSystemDecision, logDecision, type GovernanceContext } from "@/lib/governance";

/**
 * Automatically redirects to "/" if the current route is not allowed
 * by the active experience mode + role. Place inside <BrowserRouter>.
 */
export default function ExperienceRouteGuard() {
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus } = usePatientJourneyStatus();
  const { user, profile, isNutritionist, isAdmin, isPersonal } = useAuth();
  const { isReady, isDegraded } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;

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
      isAdmin,
      isPersonal
    };

    const decision = getSystemDecision(ctx);

    if (decision.type === 'REDIRECT' && decision.target && decision.target !== location.pathname) {
      logDecision(decision);
      navigate(decision.target, { replace: true });
    } else if (decision.type === 'BLOCK' && decision.target) {
      logDecision(decision);
      navigate(decision.target, { replace: true });
    }
  }, [location.pathname, mode, role, journeyStatus, user, profile, isReady, isDegraded, navigate]);

  return null;
}
