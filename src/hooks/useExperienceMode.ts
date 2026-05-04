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

// ─── VISIBILIDADE DE MENU (NÃO BLOQUEIA ACESSO) ───
const VISIBLE_ROUTES: Record<ExperienceRole, Record<ExperienceMode, string[]>> = {
  nutritionist: {
    basic: ["/", "/dashboard", "/patients", "/appointments", "/onboarding", "/settings"],
    pro: ["/clinical-intelligence", "/reports", "/analyze-meal", "/protocols", "/programs"],
    advanced: ["/automation", "/integrations", "/team", "/branding"]
  },
  patient: {
    basic: ["/", "/dashboard", "/my-diet", "/checkin", "/settings"],
    pro: ["/chat", "/shopping-list", "/recipes", "/journey"],
    advanced: ["/body-projection", "/analyze-meal"]
  }
};

export function isRouteVisible(route: string, mode: ExperienceMode, role: ExperienceRole): boolean {
  const roleRoutes = VISIBLE_ROUTES[role] || VISIBLE_ROUTES.nutritionist;
  
  // Se for advanced, vê tudo
  if (mode === "advanced") return true;
  
  // Acumula rotas permitidas para o nível atual
  const allowed = [...roleRoutes.basic];
  if (mode === "pro") allowed.push(...roleRoutes.pro);
  
  // Verifica se a rota começa com algum dos caminhos permitidos
  return allowed.some(path => route === path || route.startsWith(path + "/"));
}

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
    // Visibility logic (menu only)
    isRouteAllowed: (r: string) => isRouteVisible(r, mode, role),
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
