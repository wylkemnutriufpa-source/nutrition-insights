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
  const { profile, experienceMode, experienceRole, setMode, loading } = useAuth();

  const mode = experienceMode as ExperienceMode;
  const role = experienceRole;

  const isFeatureEnabled = (feature: string) => {
    const userRole = role === "nutritionist" ? "nutritionist" : "patient";
    const userMode = (mode === "pro" || mode === "advanced") ? mode : "basic";

    const roleMap = featureMap[userRole] || featureMap.patient;
    const allowedFeatures = roleMap[userMode] || roleMap.basic;
    
    if (allowedFeatures === "all") return true;
    return Array.isArray(allowedFeatures) ? allowedFeatures.includes(feature) : false;
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
