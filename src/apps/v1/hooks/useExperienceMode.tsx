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

/**
 * Pure function to check feature permissions.
 * Extracted to avoid direct circular dependencies if needed and for testability.
 */
export const checkFeaturePermission = (
  feature: string,
  mode: ExperienceMode,
  role: "nutritionist" | "patient"
): boolean => {
  const levels = { basic: 0, pro: 1, advanced: 2 };
  
  // If feature is a mode name, check minimum level
  if (feature === "pro" || feature === "advanced" || feature === "basic") {
    const currentLevel = levels[mode] ?? 0;
    const requiredLevel = levels[feature as ExperienceMode] ?? 0;
    return currentLevel >= requiredLevel;
  }

  const roleMap = featureMap[role] || featureMap.patient;
  const allowedFeatures = roleMap[mode] || roleMap.basic;
  
  if (allowedFeatures === "all") return true;
  return Array.isArray(allowedFeatures) ? allowedFeatures.includes(feature) : false;
};

import { useExperienceContext } from "@/providers/ExperienceProvider";

export function useExperienceMode(): ExperienceModeContextValue {
  return useExperienceContext();
}
