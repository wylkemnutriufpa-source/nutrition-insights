import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { ExperienceMode, ExperienceModeContextValue, checkFeaturePermission } from "@/hooks/useExperienceMode";
import { supabase } from "@/integrations/supabase/client";

const ExperienceContext = createContext<ExperienceModeContextValue | undefined>(undefined);

export const ExperienceProvider = ({ children }: { children: ReactNode }) => {
  const { 
    experienceMode: authMode, 
    experienceRole: authRole, 
    setMode: authSetMode, 
    loading: authLoading,
    user 
  } = useAuth();

  const [mode, setModeState] = useState<ExperienceMode>(authMode);
  const [role, setRoleState] = useState<"nutritionist" | "patient">(authRole);

  // Sync state with auth context whenever it changes
  useEffect(() => {
    setModeState(authMode);
    setRoleState(authRole);
  }, [authMode, authRole]);

  // Realtime subscription to profile changes (redundant with auth.tsx but ensures UI reaction here)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`experience-mode-sync-${user.id}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "profiles", 
          filter: `user_id=eq.${user.id}` 
        },
        (payload) => {
          const newMode = payload.new.experience_mode as ExperienceMode;
          if (newMode && ["basic", "pro", "advanced"].includes(newMode)) {
            console.log("[ExperienceProvider] Syncing mode from Realtime:", newMode);
            setModeState(newMode);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const setMode = async (newMode: string) => {
    // Optimistic update
    setModeState(newMode as ExperienceMode);
    await authSetMode(newMode);
  };

  const minMode = (requiredMode: ExperienceMode) => {
    return checkFeaturePermission(requiredMode, mode, role);
  };

  const isFeatureEnabled = (feature: string) => {
    return checkFeaturePermission(feature, mode, role);
  };

  const isRouteAllowed = (route: string) => {
    const cleanRoute = route.split('?')[0].split('#')[0].replace(/^\//, '');
    if (!cleanRoute || cleanRoute === 'dashboard') return true;
    return isFeatureEnabled(cleanRoute);
  };

  const value: ExperienceModeContextValue = {
    mode,
    role,
    setMode,
    isFeatureEnabled,
    minMode,
    isRouteAllowed,
    isBasic: mode === "basic",
    isPro: mode === "pro",
    isAdvanced: mode === "advanced",
    isLoading: authLoading,
    failedMode: null,
    retryLastMode: () => {},
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { processed: 0, failed: 0, isFull: false, hasExpired: false },
  };

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
};

export const useExperienceContext = () => {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperienceContext must be used within an ExperienceProvider");
  }
  return context;
};
