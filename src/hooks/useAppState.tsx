import { useAuth } from "@/lib/auth";
import { useMemo } from "react";

export function useAppState() {
  const { user, profile, loading: authLoading } = useAuth();
  
  const isOrphan = useMemo(() => profile?.is_orphan === true, [profile]);
  
  const isLoading = authLoading;
  const isReady = !authLoading;
  
  // Degraded if user is logged in but profile failed to load
  const isDegraded = !!(user && !profile && !authLoading);

  return {
    isReady,
    isDegraded,
    isLoading,
    isOrphan,
  };
}

// AppStateProvider removed to simplify boot. 
// Components can now call useAppState() directly as it consumes useAuth.
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}