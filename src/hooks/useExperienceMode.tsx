
import { useAuth } from "@/lib/auth";

export type ExperienceMode = "basic" | "pro" | "advanced";

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

export function useExperienceMode() {
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
    isLoading: loading,
    failedMode: null,
    retryLastMode: () => {},
  };
}
