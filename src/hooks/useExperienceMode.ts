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
  "/workspace-editor", "/clinical-workspace",
]);

const ADVANCED_ROUTES = new Set([
  "/automation", "/control-tower",
  "/intelligence-settings",
  "/professional/crm",
  "/admin/import-patients", "/integrations",
  "/team", "/settings/whatsapp",
  "/coach-bodybuilder",
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

/**
 * Returns true if a route is allowed for the given mode.
 * Routes NOT listed in any experience set are always visible (uncontrolled).
 * Routes IN a set are only visible if the set is included in the current mode.
 */
export function isRouteVisible(route: string, mode: ExperienceMode): boolean {
  const allControlled = getVisibleRoutes("advanced");
  // If the route is not controlled by experience mode, allow it
  if (!allControlled.has(route)) return true;
  // Otherwise check if it's in the current mode's visible set
  const visible = getVisibleRoutes(mode);
  return visible.has(route);
}

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  setMode: (m: ExperienceMode) => void;
  isRouteAllowed: (route: string) => boolean;
  isBasic: boolean;
  isPro: boolean;
  isAdvanced: boolean;
  /** Show content only at given mode or above */
  minMode: (min: ExperienceMode) => boolean;
}

export const ExperienceModeContext = createContext<ExperienceModeContextValue>({
  mode: "pro",
  setMode: () => {},
  isRouteAllowed: () => true,
  isBasic: false,
  isPro: true,
  isAdvanced: false,
  minMode: () => true,
});

export function useExperienceMode() {
  return useContext(ExperienceModeContext);
}

const MODE_LEVEL: Record<ExperienceMode, number> = { basic: 0, pro: 1, advanced: 2 };

/** Helper: returns true if current mode >= min */
export function checkMinMode(current: ExperienceMode, min: ExperienceMode): boolean {
  return MODE_LEVEL[current] >= MODE_LEVEL[min];
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

  const isBasic = mode === "basic";
  const isPro = mode === "pro";
  const isAdvanced = mode === "advanced";
  const minMode = useCallback((min: ExperienceMode) => checkMinMode(mode, min), [mode]);

  const value = useMemo<ExperienceModeContextValue>(
    () => ({ mode, setMode, isRouteAllowed, isBasic, isPro, isAdvanced, minMode }),
    [mode, setMode, isRouteAllowed, isBasic, isPro, isAdvanced, minMode]
  );

  return value;
}
