import { createContext, useContext, useState, useCallback, useMemo } from "react";

export type ExperienceMode = "basic" | "pro" | "advanced";

const STORAGE_KEY = "fj_experience_mode";

/**
 * Routes accessible per experience mode.
 * Each mode includes all routes from lower modes.
 */
const BASIC_ROUTES = new Set([
  "/", "/dashboard", "/patients", "/appointments", "/meal-plans",
  "/editor-v2", "/checkin", "/settings", "/notifications", "/chat",
  "/my-diet", "/checklist", "/shopping-list", "/recipes", "/anamnesis",
  "/body-analysis", "/onboarding", "/invite-patient",
]);

const PRO_ROUTES = new Set([
  "/clinical-risk", "/reports", "/clinical-intelligence",
  "/protocols", "/programs", "/food-database", "/supplements",
  "/branding", "/financial", "/analyze-meal",
  "/body-projection", "/patient-overview",
]);

const ADVANCED_ROUTES = new Set([
  "/automation", "/control-tower", "/workspace",
  "/workspace-editor", "/intelligence-settings",
  "/clinical-workspace", "/professional/crm",
  "/admin/import-patients", "/integrations",
  "/team", "/settings/whatsapp", "/campaigns",
]);

export function getVisibleRoutes(mode: ExperienceMode): Set<string> {
  const routes = new Set(BASIC_ROUTES);
  if (mode === "pro" || mode === "advanced") {
    PRO_ROUTES.forEach(r => routes.add(r));
  }
  if (mode === "advanced") {
    ADVANCED_ROUTES.forEach(r => routes.add(r));
  }
  return routes;
}

export function isRouteVisible(route: string, mode: ExperienceMode): boolean {
  const visible = getVisibleRoutes(mode);
  return visible.has(route);
}

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  setMode: (m: ExperienceMode) => void;
  isRouteAllowed: (route: string) => boolean;
}

export const ExperienceModeContext = createContext<ExperienceModeContextValue>({
  mode: "pro",
  setMode: () => {},
  isRouteAllowed: () => true,
});

export function useExperienceMode() {
  return useContext(ExperienceModeContext);
}

/** Use this at the provider level */
export function useExperienceModeState() {
  const [mode, setModeState] = useState<ExperienceMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ExperienceMode;
    return saved && ["basic", "pro", "advanced"].includes(saved) ? saved : "pro";
  });

  const setMode = useCallback((m: ExperienceMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const isRouteAllowed = useCallback((route: string) => {
    return isRouteVisible(route, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, isRouteAllowed }), [mode, setMode, isRouteAllowed]);

  return value;
}
