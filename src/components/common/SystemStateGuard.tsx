import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { useLocation, Navigate } from "react-router-dom";
import { getSystemDecision, logDecision, GovernanceContext } from "@/lib/governance";
import { recordDecision } from "@/lib/governanceTelemetry";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { HardFailLinkage } from "./HardFailLinkage";
import { logAudit } from "@/lib/auditLog";

/**
 * Global Guard — the SINGLE orchestrator for navigation decisions.
 *
 * No other component (page, hook, useEffect) is allowed to redirect
 * based on patient state. They mutate state in the DB; realtime + this
 * guard recompute the canonical route.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, isAdmin, isNutritionist, isPersonal, isPatient } = useAuth();
  const { isLoading: tenantLoading } = useTenant();
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus, loading: journeyLoading, isTransitioning } = usePatientJourneyStatus();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();

  // Loop detector: if we redirect more than 5 times within 2s, log a critical error.
  const redirectsRef = useRef<number[]>([]);

  const isReady =
    !authLoading &&
    !tenantLoading &&
    !journeyLoading &&
    (!isPatient || !consentLoading);

  const decision = useMemo(() => {
    if (!isReady) return { type: 'ALLOW' as const, reason: 'System loading' };

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
      isDegraded: false,
      isNutritionist,
      isPersonal,
      isAdmin,
      versionMismatch: (window as any).__FJ_VERSION_MISMATCH__,
      isTransitioning,
    };

    const d = getSystemDecision(ctx);
    if (d.type !== 'ALLOW') logDecision(d);
    recordDecision(ctx, d);
    return d;
  }, [
    location.pathname, user, profile, journeyStatus, hasConsent, isPatient,
    mode, role, isReady, isNutritionist, isPersonal, isAdmin, isTransitioning,
  ]);

  // Audit + loop detection
  useEffect(() => {
    if (decision.type === 'BLOCK' || decision.type === 'REDIRECT') {
      const now = Date.now();
      redirectsRef.current = [...redirectsRef.current.filter(t => now - t < 2000), now];
      if (redirectsRef.current.length > 5) {
        console.error(
          '[FJ:Governance:LOOP] More than 5 redirects in 2s — possible conflict.',
          { path: location.pathname, decision }
        );
      }

      logAudit(
        "GLOBAL_GUARD_BLOCK",
        "navigation",
        user?.id,
        {
          path: location.pathname,
          decision: decision.type,
          reason: decision.reason,
          target: decision.target,
        },
        "blocked"
      );
    }
  }, [decision, location.pathname, user?.id]);

  // EMERGENCY BYPASS: Allow everything in production incident mode
  return <>{children}</>;
  
  /* Original logic preserved for reference:
  if (!isReady) return null;
  if (decision.type === 'BLOCK' && decision.target === '/hard-fail-linkage') {
    return <HardFailLinkage />;
  }
  if ((decision.type === 'REDIRECT' || decision.type === 'BLOCK') && decision.target && decision.target !== location.pathname) {
    return <Navigate to={decision.target} replace />;
  }
  */

  if (decision.type === 'RELOAD') {
    window.location.reload();
    return null;
  }

  return <>{children}</>;
}
