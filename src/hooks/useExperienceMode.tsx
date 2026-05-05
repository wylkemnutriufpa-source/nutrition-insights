import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { featureMap } from "@/config/features";

export type ExperienceMode = "basic" | "pro" | "advanced";

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  role: "nutritionist" | "patient";
  setMode: (mode: string) => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
  minMode: (requiredMode: ExperienceMode) => boolean;
  isRouteAllowed: (route: string) => boolean;
  isBasic: boolean;
  isPro: boolean;
  isAdvanced: boolean;
  isLoading: boolean;
  failedMode: ExperienceMode | null;
  retryLastMode: () => void;
  lastError: any;
  isOffline: boolean;
  pendingQueueSize: number;
  queueStats: { processed: number; failed: number; isFull: boolean; hasExpired: boolean };
}


export function useExperienceMode(): ExperienceModeContextValue {
  const { experienceMode, experienceRole, setMode, loading, refreshProfile } = useAuth();

  const mode = (experienceMode as ExperienceMode) || "basic";
  const role = experienceRole;

  // Use state to allow immediate UI feedback while waiting for DB
  const [localMode, setLocalMode] = useState<ExperienceMode>(mode);

  // Keep local state in sync with auth profile when it changes
  useEffect(() => {
    if (mode && mode !== localMode) {
      console.log("[ExperienceMode] Syncing local mode with auth profile:", mode);
      setLocalMode(mode);
    }
  }, [mode]);

  const isFeatureEnabled = (feature: string) => {
    const userRole = role === "nutritionist" ? "nutritionist" : "patient";
    const userMode = (localMode === "pro" || localMode === "advanced") ? localMode : "basic";

    const roleMap = featureMap[userRole] || featureMap.patient;
    const allowedFeatures = roleMap[userMode] || roleMap.basic;
    
    if (allowedFeatures === "all") return true;
    return Array.isArray(allowedFeatures) ? allowedFeatures.includes(feature) : false;
  };

  const minMode = (requiredMode: ExperienceMode) => {
    const levels = { basic: 0, pro: 1, advanced: 2 };
    const currentLevel = levels[localMode] ?? 0;
    const requiredLevel = levels[requiredMode] ?? 0;
    return currentLevel >= requiredLevel;
  };

  const isRouteAllowed = (route: string) => true;

  const wrappedSetMode = async (newMode: string) => {
    console.log("[ExperienceMode] Setting new mode:", newMode);
    // Immediate feedback
    setLocalMode(newMode as ExperienceMode);
    
    try {
      await setMode(newMode);
      // Optional: immediate refresh to ensure absolute sync
      await refreshProfile();
    } catch (err) {
      console.error("[ExperienceMode] Failed to save mode:", err);
      // Revert local state on failure
      setLocalMode(mode);
    }
  };

  return {
    mode: localMode,
    role,
    setMode: wrappedSetMode,
    isFeatureEnabled,
    minMode,
    isRouteAllowed,
    isBasic: localMode === "basic",
    isPro: localMode === "pro",
    isAdvanced: localMode === "advanced",
    isLoading: loading,
    failedMode: null,
    retryLastMode: () => {},
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { processed: 0, failed: 0, isFull: false, hasExpired: false },
  };
}
