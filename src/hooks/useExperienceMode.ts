import { useAuth } from "@/lib/auth";

import { createContext } from "react";

export type ExperienceMode = "basic" | "pro" | "advanced";
export type ExperienceRole = "nutritionist" | "patient";

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  role: ExperienceRole;
  isBasic: boolean;
  isPro: boolean;
  isAdvanced: boolean;
  minMode: (min: ExperienceMode) => boolean;
  setMode: (m: ExperienceMode) => Promise<void>;
  // Compatibility properties
  isRouteAllowed: (route: string) => boolean;
  isLoading: boolean;
  failedMode: ExperienceMode | null;
  lastError: any | null;
  isOffline: boolean;
  pendingQueueSize: number;
  queueStats: any;
  retryLastMode: () => void;
}

export const ExperienceModeContext = createContext<any>({});

const MODE_LEVEL: Record<ExperienceMode, number> = { basic: 0, pro: 1, advanced: 2 };

export function checkMinMode(current: ExperienceMode, min: ExperienceMode): boolean {
  return MODE_LEVEL[current] >= MODE_LEVEL[min];
}

/**
 * Hook simplificado de ExperienceMode.
 * Consome diretamente do Auth e não possui efeitos colaterais de navegação.
 */
export function useExperienceMode(): ExperienceModeContextValue {
  const auth = useAuth();
  
  const mode = (auth.experienceMode as ExperienceMode) || "basic";
  const role = (auth.experienceRole as ExperienceRole) || "nutritionist";

  return {
    mode,
    role,
    isBasic: mode === "basic",
    isPro: mode === "pro",
    isAdvanced: mode === "advanced",
    minMode: (min: ExperienceMode) => checkMinMode(mode, min),
    setMode: auth.setMode as any,
    // Compatibility
    isRouteAllowed: () => true, // NEVER block routes as per user instruction
    isLoading: auth.loading,
    failedMode: null,
    lastError: null,
    isOffline: false,
    pendingQueueSize: 0,
    queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
    retryLastMode: () => {},
  };
}

export function useExperienceModeState() {
  return {};
}
