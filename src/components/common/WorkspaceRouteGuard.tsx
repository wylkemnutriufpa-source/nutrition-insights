import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAppState } from "@/hooks/useAppState";
import { getSystemDecision, logDecision, type GovernanceContext } from "@/lib/governance";

/**
 * WorkspaceRouteGuard — Consolidates all role-based and context-based
 * routing rules into the central Governance Engine.
 */
export default function WorkspaceRouteGuard() {
  const { user, profile, loading, isNutritionist, isPersonal, isAdmin, isPatient } = useAuth();
  const { isProfessionalContext, isPatientContext, isHybridUser } = useWorkspaceContext();
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus } = usePatientJourneyStatus();
  const { isReady, isDegraded } = useAppState();
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !isReady) return;

    const ctx: GovernanceContext = {
      pathname: location.pathname,
      user,
      profile,
      journeyStatus: journeyStatus as any,
      mode,
      role,
      isReady,
      isDegraded,
      isHybrid: isHybridUser,
      isPatientContext,
      isProfessionalContext,
      isNutritionist,
      isPersonal,
      isAdmin
    };

    const decision = getSystemDecision(ctx);

    if (decision.type === 'REDIRECT' && decision.target && decision.target !== location.pathname) {
      logDecision(decision);
      navigate(decision.target, { replace: true });
    }
  }, [
    location.pathname, loading, user, profile, isNutritionist, isPersonal, isAdmin, isPatient, 
    isProfessionalContext, isPatientContext, isHybridUser, journeyStatus, mode, role, isReady, isDegraded, navigate
  ]);

  return null;
}
