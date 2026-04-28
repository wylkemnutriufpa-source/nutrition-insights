/**
 * WorkspaceRouteGuard — Global route enforcement based on:
 * 1. Auth Role (nutritionist, personal, admin, patient)
 * 2. Workspace Context (professional vs patient — for hybrid users)
 * 3. Feature permissions & subscription status
 *
 * RULES:
 * ─────────────────────────────────────────────────────────
 * PATIENT CONTEXT → blocks professional routes:
 *   /admin, /patients, /diet-templates, /onboarding-pipeline,
 *   /meal-plans, /editor-v2, /protocols, /programs, /branding,
 *   /reports, /financial, /automation, /control-tower, /team,
 *   /clinical-*, /coach-bodybuilder, /invite-patient, etc.
 *
 * PROFESSIONAL CONTEXT → blocks patient-only routes:
 *   /my-diet, /my-workouts, /my-story, /body-projection,
 *   /patient-overview, /patient-intelligence, /client/dashboard,
 *   /meals, /achievements, /challenges, /checkin, /journey, etc.
 *
 * ADMIN routes → only accessible by admin role (any context)
 * NUTRITIONIST routes → only nutritionist or admin
 * PERSONAL routes → only personal or admin
 * PATIENT routes → only patient role (or hybrid in patient context)
 *
 * Fallback: redirects to "/" which renders the correct dashboard.
 * ─────────────────────────────────────────────────────────
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useAppState } from "@/hooks/useAppState";
import { getSystemDecision, logDecision, type GovernanceContext } from "@/lib/governance";

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

  return null;
}
