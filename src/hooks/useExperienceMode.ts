import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateCorrelationId,
  logTelemetry,
  recordAudit,
  enqueueAttempt,
  drainQueue,
  buildBlockReason,
  withTimeout,
  withRetries,
  getQueueStats,
  pruneExpired,
  type QueuedAttempt,
  type QueueStats,
} from "@/lib/experienceModeTelemetry";

export type ExperienceMode = "basic" | "pro" | "advanced";
export type ExperienceRole = "professional" | "patient";

const STORAGE_KEY = "fj_experience_mode";

export interface ModeChangeError extends Error {
  code?: "MODE_LOCKED" | "OFFLINE" | "DB_ERROR" | "NOT_AUTH" | "TIMEOUT" | "NETWORK";
  correlationId?: string;
  unlock_date?: string | null;
  blockTitle?: string;
  blockDescription?: string;
  retries?: number;
}

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
  "/workspace",
  "/coach-bodybuilder",
  "/professional/crm",
]);

const PRO_ADVANCED_ROUTES = new Set([
  "/automation",
  "/control-tower", "/intelligence-settings",
  "/integrations", "/team", "/settings/whatsapp",
  "/branding",
  "/import-patients",
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
  /** Last error from a failed attempt — exposes correlationId & block metadata */
  lastError: ModeChangeError | null;
  /** True when last failure was network/offline (vs locked) */
  isOffline: boolean;
  /** Pending offline replay queue size */
  pendingQueueSize: number;
  /** Detailed stats about the offline queue (size, full, expired) */
  queueStats: QueueStats;
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
  lastError: null,
  isOffline: false,
  pendingQueueSize: 0,
  queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
  minMode: () => true,
  role: "professional",
});

export function useExperienceMode() {
  const context = useContext(ExperienceModeContext);
  // Independent access: if context is missing, return a default guest state
  if (!context) {
    return {
      mode: "pro" as ExperienceMode,
      setMode: async () => {},
      isRouteAllowed: () => true,
      isBasic: false,
      isPro: true,
      isAdvanced: false,
      isLoading: false,
      retryLastMode: () => {},
      failedMode: null,
      lastError: null,
      isOffline: false,
      pendingQueueSize: 0,
      queueStats: { size: 0, isFull: false, hasExpired: false, oldestQueuedAt: null },
      minMode: () => true,
      role: "professional" as ExperienceRole,
    };
  }
  return context;
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
  const [isLoading, setIsLoading] = useState(false); // Mudado para false para evitar travamento de renderização se a hidratação falhar ou demorar
  const [failedMode, setFailedMode] = useState<ExperienceMode | null>(() => {
    const saved = sessionStorage.getItem(`${STORAGE_KEY}_failed`);
    return saved && ["basic", "pro", "advanced"].includes(saved) ? saved as ExperienceMode : null;
  });
  const [lastError, setLastError] = useState<ModeChangeError | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [queueStats, setQueueStats] = useState<QueueStats>(() => getQueueStats());
  const pendingQueueSize = queueStats.size;

  const refreshQueueStats = useCallback(() => {
    setQueueStats(getQueueStats());
  }, []);

  const hydratedFromDb = useRef(false);

  // Broadcast channel for cross-tab sync
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("experience_mode_sync");
      channel.addEventListener("message", (event: MessageEvent) => {
        if (event.data?.type === "MODE_UPDATE" && event.data?.mode) {
          const newMode = event.data.mode;
          console.log("[ExperienceMode] Syncing mode from broadcast channel:", newMode);
          setModeState(newMode);
          localStorage.setItem(STORAGE_KEY, newMode);
        }
      });
    } catch {
      // BroadcastChannel may not exist in all envs — storage event is the fallback
    }

    // Fallback: storage event (cross-tab when BroadcastChannel unavailable)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        console.log("[ExperienceMode] Syncing mode from storage event:", event.newValue);
        setModeState(event.newValue as ExperienceMode);
      }
    };
    window.addEventListener("storage", handleStorage);

    // Logout listener to clear session state
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log("[ExperienceMode] User signed out, clearing session state");
        sessionStorage.removeItem(`${STORAGE_KEY}_failed`);
        setFailedMode(null);
        setLastError(null);
      }
    });

    return () => {
      try { channel?.close(); } catch {}
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Hydrate from DB on mount
  useEffect(() => {
    if (hydratedFromDb.current) return;
    
    const hydrate = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          hydratedFromDb.current = true;
          return;
        }

        const fetchPromise = supabase
          .from("profiles")
          .select("experience_mode")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data, error } = await withTimeout(fetchPromise as unknown as Promise<any>);

        if (!error && data?.experience_mode) {
          const dbMode = data.experience_mode as ExperienceMode;
          if (["basic", "pro", "advanced"].includes(dbMode)) {
            setModeState(dbMode);
            localStorage.setItem(STORAGE_KEY, dbMode);
          }
        }
      } catch (e) {
        console.warn("[ExperienceMode] Falha na hidratação inicial:", e);
      } finally {
        setIsLoading(false);
        hydratedFromDb.current = true;
      }
    };

    hydrate();
  }, []);

  /** Internal: perform the actual DB write for a given mode (no state writes).
   * Wrapped with timeout + automatic retries on transient errors so slow
   * connections don't hang the UI and the same correlationId is preserved. */
  const performDbUpdate = useCallback(async (m: ExperienceMode, correlationId: string) => {
    return withRetries(
      async () => {
        const { data: { user } } = await withTimeout(supabase.auth.getUser());
        if (!user) {
          const err: ModeChangeError = Object.assign(new Error("Não autenticado"), {
            code: "NOT_AUTH" as const,
            correlationId,
          });
          throw err;
        }

        const fetchRes = await withTimeout(
          (async () =>
            supabase
              .from("profiles")
              .select("experience_mode_locked, unlock_date")
              .eq("user_id", user.id)
              .maybeSingle())()
        );
        const { data: profile, error: fetchError } = fetchRes as any;

        if (fetchError) {
          const err: ModeChangeError = Object.assign(
            new Error(fetchError.message || "Falha ao consultar perfil"),
            { code: "DB_ERROR" as const, correlationId }
          );
          throw err;
        }

        // Always check admin to enrich audit metadata + bypass lock
        const rolesRes = await withTimeout(
          (async () =>
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id))()
        );
        const { data: rolesData } = rolesRes as any;
        const isAdmin = Array.isArray(rolesData) && rolesData.some((r: any) => r.role === "admin");
        // Stash admin flag on the function for audit enrichment
        (performDbUpdate as any)._lastIsAdmin = isAdmin;
        (performDbUpdate as any)._lastWasLocked = !!profile?.experience_mode_locked;

        if (profile?.experience_mode_locked && m !== 'basic' && !isAdmin) {
          const unlockDate = (profile as any).unlock_date as string | null;
          const block = buildBlockReason({
            attemptedMode: m,
            unlockDate,
            baseReason: "Sua conta está restrita ao modo Básico temporariamente.",
          });
          const error: ModeChangeError = Object.assign(new Error(block.description), {
            code: "MODE_LOCKED" as const,
            correlationId,
            unlock_date: unlockDate,
            blockTitle: block.title,
            blockDescription: block.description,
          });
          throw error;
        }

        const updateRes = await withTimeout(
          (async () =>
            supabase
              .from("profiles")
              .update({ experience_mode: m } as any)
              .eq("user_id", user.id))()
        );
        const { error: updateError } = updateRes as any;

        if (updateError) {
          const err: ModeChangeError = Object.assign(
            new Error(updateError.message || "Falha ao atualizar"),
            { code: "DB_ERROR" as const, correlationId }
          );
          throw err;
        }
      },
      { correlationId }
    );
  }, []);

  const updateModeInDb = useCallback(async (m: ExperienceMode, previous: ExperienceMode) => {
    const correlationId = generateCorrelationId();
    setIsLoading(true);
    setFailedMode(null);
    setLastError(null);
    sessionStorage.removeItem(`${STORAGE_KEY}_failed`);

    logTelemetry("info", correlationId, "Mode change attempt started", {
      attemptedMode: m,
      previousMode: previous,
    });

    // Offline path — queue the attempt and bail
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueAttempt({ correlationId, attemptedMode: m, previousMode: previous });
      refreshQueueStats();
      const err: ModeChangeError = Object.assign(
        new Error("Sem conexão. Tentaremos novamente quando você voltar a ficar online."),
        { code: "OFFLINE" as const, correlationId }
      );
      setFailedMode(m);
      setLastError(err);
      sessionStorage.setItem(`${STORAGE_KEY}_failed`, m);
      setModeState(previous);
      setIsLoading(false);
      logTelemetry("warn", correlationId, "Offline — attempt queued", { attemptedMode: m });
      await recordAudit({
        correlationId,
        attemptedMode: m,
        previousMode: previous,
        outcome: "offline_queued",
        reason: "Network unavailable",
      });
      throw err;
    }

    const startedAt = Date.now();
    try {
      await performDbUpdate(m, correlationId);
      const durationMs = Date.now() - startedAt;
      logTelemetry("info", correlationId, "Mode change succeeded", { mode: m, durationMs });
      localStorage.setItem(STORAGE_KEY, m);
      setModeState(m);

      // Notify other tabs
      try {
        const channel = new BroadcastChannel("experience_mode_sync");
        channel.postMessage({ type: "MODE_UPDATE", mode: m });
        channel.close();
      } catch {}

      await recordAudit({
        correlationId,
        attemptedMode: m,
        previousMode: previous,
        outcome: "success",
        metadata: {
          duration_ms: durationMs,
          is_admin: !!(performDbUpdate as any)._lastIsAdmin,
          was_locked: !!(performDbUpdate as any)._lastWasLocked,
        },
      });
    } catch (error: any) {
      const errCode = error?.code || "DB_ERROR";
      const durationMs = Date.now() - startedAt;
      logTelemetry("error", correlationId, "Mode change failed", {
        code: errCode,
        message: error?.message,
        durationMs,
        retries: error?.retries ?? 0,
      });
      setFailedMode(m);
      sessionStorage.setItem(`${STORAGE_KEY}_failed`, m);
      // Ensure correlationId is attached
      if (!error.correlationId) error.correlationId = correlationId;
      setLastError(error);
      // Fallback to previous mode
      setModeState(previous);

      await recordAudit({
        correlationId,
        attemptedMode: m,
        previousMode: previous,
        outcome: errCode === "MODE_LOCKED" ? "blocked" : "failed",
        reason: error?.message,
        errorCode: errCode,
        unlockDate: error?.unlock_date,
        metadata: {
          duration_ms: durationMs,
          retries: error?.retries ?? 0,
          is_admin: !!(performDbUpdate as any)._lastIsAdmin,
          was_locked: !!(performDbUpdate as any)._lastWasLocked,
        },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [performDbUpdate]);

  const setMode = useCallback(async (m: ExperienceMode) => {
    const previous = mode;
    await updateModeInDb(m, previous);
  }, [mode, updateModeInDb]);

  const retryLastMode = useCallback(() => {
    if (failedMode) {
      setMode(failedMode).catch(() => { /* error already surfaced */ });
    }
  }, [failedMode, setMode]);

  // Online/offline + queue drain
  useEffect(() => {
    const onOnline = async () => {
      setIsOffline(false);
      logTelemetry("info", "system", "Network back online — draining queue");
      const result = await drainQueue(async (item: QueuedAttempt) => {
        await performDbUpdate(item.attemptedMode, item.correlationId);
        // Apply the most recent successfully-replayed mode
        localStorage.setItem(STORAGE_KEY, item.attemptedMode);
        setModeState(item.attemptedMode);
        try {
          const channel = new BroadcastChannel("experience_mode_sync");
          channel.postMessage({ type: "MODE_UPDATE", mode: item.attemptedMode });
          channel.close();
        } catch {}
      });
      refreshQueueStats();
      if (result.replayed > 0) {
        setFailedMode(null);
        setLastError(null);
        sessionStorage.removeItem(`${STORAGE_KEY}_failed`);
      }
    };
    const onOffline = () => {
      setIsOffline(true);
      logTelemetry("warn", "system", "Network went offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Try draining at mount in case we already have items
    if (typeof navigator !== "undefined" && navigator.onLine) {
      onOnline();
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [performDbUpdate]);

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
      lastError,
      isOffline,
      pendingQueueSize,
      queueStats,
      retryLastMode,
      minMode,
      role,
    }),
    [mode, setMode, isRouteAllowed, isBasic, isPro, isAdvanced, isLoading, failedMode, lastError, isOffline, pendingQueueSize, queueStats, retryLastMode, minMode, role]
  );

  return value;
}
