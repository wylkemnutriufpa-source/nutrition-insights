import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Navigate } from "react-router-dom";
import { getSystemDecision, logDecision, GovernanceContext } from "@/lib/governance";
import { recordDecision } from "@/lib/governanceTelemetry";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { logAudit } from "@/lib/auditLog";

/**
 * MÍNIMO VIÁVEL - Governança Simplificada
 * Objetivo: Auth obrigatório + Log de decisões + Sem loops.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, isAdmin, isNutritionist, isPersonal, isPatient } = useAuth();
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus, loading: journeyLoading, isTransitioning } = usePatientJourneyStatus();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const location = useLocation();

  // Loop detector: 5 redirects em 2s
  const redirectsRef = useRef<number[]>([]);

  const isReady = !authLoading && !journeyLoading && (!isPatient || !consentLoading);

  const decision = useMemo(() => {
    // Se não está pronto, permitir renderização inicial sem decisão (evita loops prematuros)
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
      isTransitioning,
    };

    const d = getSystemDecision(ctx);
    
    // Log detalhado para monitoramento
    console.log(`[FJ:MinGuard] Decision: ${d.type} | Path: ${location.pathname} | User: ${user?.id || 'guest'} | State: ${journeyStatus || 'none'}`);
    
    if (d.type !== 'ALLOW') logDecision(d);
    recordDecision(ctx, d);
    return d;
  }, [
    location.pathname, user, profile, journeyStatus, hasConsent, isPatient,
    mode, role, isReady, isNutritionist, isPersonal, isAdmin, isTransitioning,
  ]);

  useEffect(() => {
    if (decision.type === 'REDIRECT' || decision.type === 'BLOCK') {
      const now = Date.now();
      redirectsRef.current = [...redirectsRef.current.filter(t => now - t < 2000), now];
      
      if (redirectsRef.current.length > 5) {
        console.error('[FJ:MinGuard:LOOP] Loop detectado! Interrompendo redirecionamento.', { path: location.pathname, decision });
        return;
      }

      logAudit("GUARD_DECISION", "navigation", user?.id, {
        path: location.pathname,
        decision: decision.type,
        reason: decision.reason,
        target: decision.target,
        state: journeyStatus
      });
    }
  }, [decision, location.pathname, user?.id, journeyStatus]);

  // Se não tem usuário e não é rota pública, o AppRoutes já lida com ProtectedRoute.
  // Aqui lidamos apenas com a decisão da governança.

  if (decision.type === 'REDIRECT' && decision.target && decision.target !== location.pathname) {
    // Só redirecionar se o loop detector permitir
    if (redirectsRef.current.length <= 5) {
      return <Navigate to={decision.target} replace />;
    }
  }

  return <>{children}</>;
}
