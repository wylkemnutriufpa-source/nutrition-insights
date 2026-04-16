import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExperienceMode = "basic" | "pro" | "advanced";

const STORAGE_KEY = "fj_experience_mode";

/**
 * Routes accessible per experience mode.
 * Each mode includes all routes from lower modes.
 *
 * 🔹 BÁSICO: uso clínico diário — anamnese, avaliação, plano, paciente, feedback, lembretes
 * 🔹 PROFISSIONAL: produtividade — IFJ, motor automático, templates, estratégias, ajustes
 * 🔹 AVANÇADO: controle total — automação, integrações, configs finas, debug, admin
 */
const BASIC_ROUTES = new Set([
  // ── PROFISSIONAL: núcleo clínico diário ──
  "/", "/dashboard", "/patients", "/appointments",
  "/anamnesis", "/body-analysis",
  "/meal-plans", "/editor-v2",
  "/notifications", "/chat",
  "/settings", "/invite-patient",
  "/onboarding", "/financial",
  // ── PACIENTE BÁSICO: APENAS plano + feedback (check-in com peso/foto) ──
  // Regression guard: do NOT add patient routes here. Anything else goes to PRO/ADVANCED.
  "/my-diet", "/checkin",
]);

const PRO_ROUTES = new Set([
  // ── PROFISSIONAL: inteligência e produtividade clínica ──
  "/clinical-risk", "/clinical-intelligence", "/clinical-workspace",
  "/reports", "/analyze-meal",
  "/protocols", "/programs",
  "/food-database", "/supplements",
  "/body-projection", "/patient-overview",
  "/workspace-editor",
  "/coach-bodybuilder",
  "/professional/crm",
  // ── PACIENTE COMPLETO: acompanhamento expandido ──
  "/checklist", "/shopping-list", "/recipes",
  "/journey", "/weekly-goals",
]);

const ADVANCED_ROUTES = new Set([
  // Controle total, automação, configs técnicas
  "/automation",
  "/control-tower", "/intelligence-settings",
  "/integrations", "/team", "/settings/whatsapp",
  "/branding",
  "/admin/import-patients",
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
    return saved && ["basic", "pro", "advanced"].includes(saved) ? saved : "basic";
  });

  const hydratedFromDb = useRef(false);

  // Hydrate from DB on mount (overrides localStorage if DB has a value)
  useEffect(() => {
    if (hydratedFromDb.current) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("experience_mode")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          const dbMode = data?.experience_mode as ExperienceMode;
          if (dbMode && ["basic", "pro", "advanced"].includes(dbMode)) {
            setModeState(dbMode);
            localStorage.setItem(STORAGE_KEY, dbMode);
          }
          hydratedFromDb.current = true;
        });
    });
  }, []);

  const setMode = useCallback((m: ExperienceMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
    // Persist to DB (fire-and-forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .update({ experience_mode: m } as any)
        .eq("user_id", user.id)
        .then(() => {});
    });
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
