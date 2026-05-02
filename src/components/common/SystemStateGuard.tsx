import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { validateSystemState, fjLog } from "@/utils/dataSafety";
import { useLocation, Navigate } from "react-router-dom";
import { getSystemDecision, logDecision, GovernanceContext, PUBLIC_ROUTES, ONBOARDING_ALLOWED_ROUTES } from "@/lib/governance";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { HardFailLinkage } from "./HardFailLinkage";
import { logAudit, getSessionCorrelationId } from "@/lib/auditLog";

/**
 * Global Guard to ensure the system is in a consistent state.
 * Implements Enterprise Governance V4.9
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, isPatient, isAdmin, isNutritionist, isPersonal } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const location = useLocation();

  const isReady = !authLoading && !tenantLoading && !journeyLoading;

  const decision = useMemo(() => {
    if (!isReady) return { type: 'ALLOW' as const, reason: 'System loading' };

    const ctx: GovernanceContext = {
      pathname: location.pathname,
      user,
      profile,
      journeyStatus: journeyStatus as any,
      anamnesisStatus: journeyStatus === 'ready_for_plan' || journeyStatus === 'active_plan' ? 'completed' : 'pending',
      mode,
      role,
      isReady,
      isDegraded: false, // We'll handle this separately if needed
      isNutritionist,
      isPersonal,
      isAdmin,
      versionMismatch: (window as any).__FJ_VERSION_MISMATCH__
    };

    const d = getSystemDecision(ctx);
    if (d.type !== 'ALLOW') logDecision(d);
    return d;
  }, [location.pathname, user, profile, journeyStatus, mode, role, isReady, isNutritionist, isPersonal, isAdmin]);

  // Track blocked renders for audit
  useEffect(() => {
    if (decision.type === 'BLOCK' || decision.type === 'REDIRECT') {
      logAudit(
        "GLOBAL_GUARD_BLOCK",
        "navigation",
        user?.id,
        { 
          path: location.pathname, 
          decision: decision.type, 
          reason: decision.reason,
          target: decision.target 
        },
        "blocked"
      );
    }
  }, [decision, location.pathname, user?.id]);

  if (!isReady) return null;

  if (decision.type === 'BLOCK' && decision.target === '/hard-fail-linkage') {
    return <HardFailLinkage />;
  }

  if (decision.type === 'REDIRECT' && decision.target && decision.target !== location.pathname) {
    return <Navigate to={decision.target} replace />;
  }

  if (decision.type === 'RELOAD') {
    window.location.reload();
    return null;
  }

  return <>{children}</>;
}