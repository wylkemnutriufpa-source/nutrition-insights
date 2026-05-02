import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ensureContext } from "@/components/common/SystemShield";
import { useAuth } from "@/lib/auth";
import { getSystemDecision, GovernanceContext, logDecision } from "@/lib/governance";
import { useExperienceMode } from "./useExperienceMode";
import { usePatientJourneyStatus } from "./usePatientJourneyStatus";
import { useLocation } from "react-router-dom";

interface AppStateContextType {
  isReady: boolean;
  isDegraded: boolean;
  isLoading: boolean;
  isOrphan: boolean;
}

const AppStateContext = createContext<AppStateContextType>({
  isReady: false,
  isDegraded: false,
  isLoading: true,
  isOrphan: false,
});

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, isNutritionist, isAdmin, isPersonal } = useAuth();
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const location = useLocation();
  
  const [isReady, setIsReady] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isOrphan = useMemo(() => profile?.is_orphan === true, [profile]);

  useEffect(() => {
    if (authLoading || journeyLoading) {
      setIsLoading(true);
      return;
    }

    if (user && profile) {
      setIsReady(true);
      setIsLoading(false);
      setIsDegraded(false);
    } else if (user && !profile) {
      // User without profile (possibly error loading profile)
      // Allow ready state but mark as potentially degraded
      setIsReady(true);
      setIsLoading(false);
      setIsDegraded(true);
    } else if (!user) {
      setIsReady(true);
      setIsLoading(false);
      setIsDegraded(false);
    } else {
      setIsLoading(true);
    }
  }, [user, profile, authLoading, journeyLoading]);


  // Governance Effect
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
      isPersonal,
      versionMismatch: (window as any).__FJ_VERSION_MISMATCH__
    };

    const decision = getSystemDecision(ctx);
    if (decision.type !== 'ALLOW') {
      logDecision(decision);
    }
  }, [location.pathname, user, profile, journeyStatus, mode, role, isReady, isDegraded]);

  useEffect(() => {
    (window as any).__FJ_READY__ = isReady;
  }, [isReady]);

  return (
    <AppStateContext.Provider value={{ isReady, isDegraded, isLoading, isOrphan }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  // Independent access: if context is missing, return a default state
  if (!context) {
    return {
      isReady: false,
      isDegraded: false,
      isLoading: true,
      isOrphan: false,
    };
  }
  return context;
}
