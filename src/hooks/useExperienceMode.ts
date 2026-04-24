import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExperienceMode = "basic" | "pro" | "advanced";
export type ExperienceRole = "professional" | "patient";

const STORAGE_KEY = "fj_experience_mode";

/**
 * Routes accessible per experience mode — split by role (professional vs patient).
 * Each mode includes all routes from lower modes.
 *
 * 🔹 BÁSICO: uso essencial diário
 * 🔹 PROFISSIONAL: produtividade adicional
 * 🔹 AVANÇADO: controle total
 */

// ─── PROFISSIONAL ───
const PRO_BASIC_ROUTES = new Set([
  "/", "/dashboard", "/patients", "/appointments",
  "/anamnesis", "/body-analysis",
  "/meal-plans", "/editor-v2",
  "/notifications", "/chat",
  "/settings", "/invite-patient",
  "/onboarding", "/financial",
]);

const PRO_PRO_ROUTES = new Set([
  "/clinical-risk", "/clinical-intelligence", "/clinical-workspace",
  "/reports", "/analyze-meal",
  "/protocols", "/programs",
  "/food-database", "/supplements",
  "/body-projection", "/patient-overview",
  "/workspace-editor",
  "/coach-bodybuilder",
  "/professional/crm",
]);

const PRO_ADVANCED_ROUTES = new Set([
  "/automation",
  "/control-tower", "/intelligence-settings",
  "/integrations", "/team", "/settings/whatsapp",
  "/branding",
  "/admin/import-patients",
]);

// ─── PACIENTE ───
// 🛡️ REGRESSION GUARD: Basic = APENAS plano + feedback. NUNCA adicione mais aqui.
const PATIENT_BASIC_ROUTES = new Set([
  "/", "/dashboard",
  "/my-diet", "/checkin",
  "/settings",
  "/onboarding",
  "/notifications",
]);

const PATIENT_PRO_ROUTES = new Set([
  "/anamnesis", "/body-analysis",
  "/appointments", "/chat",
  "/checklist", "/shopping-list", "/recipes",
  "/journey", "/weekly-goals",
  "/patient-overview",
  "/meal-plans",
  "/recipe-builder",
]);

const PATIENT_ADVANCED_ROUTES = new Set([
  "/body-projection",
  "/analyze-meal",
  "/financial",
]);

function getRouteSets(role: ExperienceRole) {
  if (role === "patient") {
    return { basic: PATIENT_BASIC_ROUTES, pro: PATIENT_PRO_ROUTES, advanced: PATIENT_ADVANCED_ROUTES };
  }
  return { basic: PRO_BASIC_ROUTES, pro: PRO_PRO_ROUTES, advanced: PRO_ADVANCED_ROUTES };
}

export function getVisibleRoutes(mode: ExperienceMode, role: ExperienceRole = "professional"): Set<string> {
  const { basic, pro, advanced } = getRouteSets(role);
  const routes = new Set(basic);
  if (mode === "pro" || mode === "advanced") {
    pro.forEach(r => routes.add(r));
  }
  if (mode === "advanced") {
    advanced.forEach(r => routes.add(r));
  }
  return routes;
}

/**
 * Returns true if a route is allowed for the given mode + role.
 * Routes NOT listed in any experience set are always visible (uncontrolled).
 */
export function isRouteVisible(route: string, mode: ExperienceMode, role: ExperienceRole = "professional"): boolean {
  const allControlled = getVisibleRoutes("advanced", role);
  if (!allControlled.has(route)) return true;
  const visible = getVisibleRoutes(mode, role);
  return visible.has(route);
}

export interface ExperienceModeContextValue {
  mode: ExperienceMode;
  setMode: (m: ExperienceMode) => Promise<void>;
  isRouteAllowed: (route: string) => boolean;
  isBasic: boolean;
  isPro: boolean;
  isAdvanced: boolean;
  isLoading: boolean;
  retryLastMode: () => void;
  failedMode: ExperienceMode | null;
  /** Show content only at given mode or above */
  minMode: (min: ExperienceMode) => boolean;
  /** Effective role used for route gating */
  role: ExperienceRole;
}

export const ExperienceModeContext = createContext<ExperienceModeContextValue>({
  mode: "pro",
  setMode: async () => {},
  isRouteAllowed: () => true,
  isBasic: false,
  isPro: true,
  isAdvanced: false,
  isLoading: false,
  retryLastMode: () => {},
  failedMode: null,
  minMode: () => true,
  role: "professional",
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
export function useExperienceModeState(role: ExperienceRole = "professional") {
  const [mode, setModeState] = useState<ExperienceMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ExperienceMode;
    return saved && ["basic", "pro", "advanced"].includes(saved) ? saved : "basic";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [failedMode, setFailedMode] = useState<ExperienceMode | null>(null);

  const hydratedFromDb = useRef(false);

  // Hydrate from DB on mount
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

  const updateModeInDb = async (m: ExperienceMode, previous: ExperienceMode) => {
    setIsLoading(true);
    setFailedMode(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("experience_mode_locked")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (profile?.experience_mode_locked && m !== 'basic') {
        const error = new Error("Sua conta está restrita ao modo Básico temporariamente.");
        (error as any).code = "MODE_LOCKED";
        throw error;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ experience_mode: m } as any)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      localStorage.setItem(STORAGE_KEY, m);
      setModeState(m);
    } catch (error: any) {
      console.error("Failed to update experience mode:", error);
      setFailedMode(m);
      // Fallback to previous mode
      setModeState(previous);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = useCallback(async (m: ExperienceMode) => {
    const previous = mode;
    // Optimistic update (optional, but requested fallback logic suggests we might want to handle it carefully)
    // Actually, the user asked for "fallback for when the update fails", implying we might change it then revert.
    // Let's do it properly.
    await updateModeInDb(m, previous);
  }, [mode]);

  const retryLastMode = useCallback(() => {
    if (failedMode) {
      setMode(failedMode);
    }
  }, [failedMode, setMode]);

  const isRouteAllowed = useCallback((route: string) => {
    return isRouteVisible(route, mode, role);
  }, [mode, role]);

  const isBasic = mode === "basic";
  const isPro = mode === "pro";
  const isAdvanced = mode === "advanced";
  const minMode = useCallback((min: ExperienceMode) => checkMinMode(mode, min), [mode]);

  const value = useMemo<ExperienceModeContextValue>(
    () => ({ 
      mode, 
      setMode, 
      isRouteAllowed, 
      isBasic, 
      isPro, 
      isAdvanced, 
      isLoading, 
      failedMode,
      retryLastMode,
      minMode, 
      role 
    }),
    [mode, setMode, isRouteAllowed, isBasic, isPro, isAdvanced, isLoading, retryLastMode, minMode, role]
  );

  return value;
}
