
import { useAuth } from "@/lib/auth";

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

const featureMap = {
  patient: {
    basic: ["diet", "recipes", "feedback"],
    pro: ["diet", "recipes", "feedback", "progress", "tips"],
    advanced: "all",
  },
  nutritionist: {
    basic: ["consultation", "diet", "assessment"],
    pro: ["consultation", "diet", "assessment", "analytics", "reports"],
    advanced: "all",
  },
};

export function useExperienceMode(): ExperienceModeContextValue {
  const { profile, experienceMode, experienceRole, setMode, loading } = useAuth();

  const mode = experienceMode as ExperienceMode;
  const role = experienceRole;

  const isFeatureEnabled = (feature: string) => {
    const userRole = role === "nutritionist" ? "nutritionist" : "patient";
    const userMode = mode;

    const allowedFeatures = featureMap[userRole][userMode];
    
    if (allowedFeatures === "all") return true;
    return allowedFeatures.includes(feature);
  };

  // Mantido apenas para compatibilidade visual ou se algum componente antigo usar
  const minMode = (requiredMode: ExperienceMode) => {
    const levels = { basic: 0, pro: 1, advanced: 2 };
    return levels[mode] >= levels[requiredMode];
  };

  // Mantido para compatibilidade com rotas/menus se necessário
  const isRouteAllowed = (route: string) => {
    // Se quiser implementar lógica de bloqueio de rota baseada em modo no futuro:
    // return isFeatureEnabled(routeToFeature(route));
    return true;
  };

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
