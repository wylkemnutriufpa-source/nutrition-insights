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
