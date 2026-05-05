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
  const { experienceMode, experienceRole, setMode, loading } = useAuth();

  const mode = (experienceMode as ExperienceMode) || "basic";
  const role = experienceRole;

  const minMode = (requiredMode: ExperienceMode) => {
    const levels = { basic: 0, pro: 1, advanced: 2 };
    const currentLevel = levels[mode] ?? 0;
    const requiredLevel = levels[requiredMode] ?? 0;
    return currentLevel >= requiredLevel;
  };

  const isFeatureEnabled = (feature: string) => {
    // Se a feature for o nome de um modo, usamos minMode
    if (feature === "pro" || feature === "advanced" || feature === "basic") {
      return minMode(feature as ExperienceMode);
    }

    const userRole = role === "nutritionist" ? "nutritionist" : "patient";
    // For feature mapping, pro and advanced are treated as having their own lists
    const userMode = (mode === "pro" || mode === "advanced") ? mode : "basic";

    const roleMap = featureMap[userRole] || featureMap.patient;
    const allowedFeatures = roleMap[userMode] || roleMap.basic;
    
    if (allowedFeatures === "all") return true;
    return Array.isArray(allowedFeatures) ? allowedFeatures.includes(feature) : false;
  };

  const isRouteAllowed = (route: string) => true;

  return {
    mode,
    role,
    setMode,
    isFeatureEnabled,
    minMode,
    isRouteAllowed,
    isBasic: mode === "basic",
    isPro: mode === "pro",
    isAdvanced: mode === "advanced",
    isLoading: loading,
    failedMode: null,
    retryLastMode: () => {},
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { processed: 0, failed: 0, isFull: false, hasExpired: false },
  };
}
