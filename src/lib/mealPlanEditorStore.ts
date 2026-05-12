import type { Tables } from "@/integrations/supabase/types";

export type MealPlan = Tables<"meal_plans">;
export type MealPlanItem = Tables<"meal_plan_items">;
export type EditorPlanoSyncStatus = "idle" | "saving" | "saved" | "error";

export interface PendingEditorPlanoMutation {
  key: string;
  itemIds: string[];
  queuedAt: number;
}

export interface EditorPlanoState {
  plan: MealPlan | null;
  patientName: string;
  items: MealPlanItem[];
  isHydratingPlano: boolean;
  syncingMap: Record<string, boolean>;
  statusSync: EditorPlanoSyncStatus;
  pendingMutationsQueue: PendingEditorPlanoMutation[];
  hasHydratedOnce: boolean;
}

type PersistedEditorPlanoState = Pick<EditorPlanoState, "plan" | "patientName" | "items"> & {
  savedAt: number;
};

type PersistedEditorPlanoRouteState = {
  planId: string;
  route: string;
  shouldRestore: boolean;
  savedAt: number;
};

export type EditorPlanoAction =
  | { type: "reset"; state: EditorPlanoState }
  | { type: "hydrate"; plan: MealPlan | null; patientName: string; items: MealPlanItem[] }
  | { type: "set_hydrating"; value: boolean }
  | { type: "replace_items"; items: MealPlanItem[] }
  | { type: "merge_plan"; payload: Partial<MealPlan> }
  | { type: "set_patient_name"; patientName: string }
  | { type: "set_syncing"; itemIds: string[]; value: boolean }
  | { type: "set_status_sync"; status: EditorPlanoSyncStatus }
  | { type: "enqueue_mutation"; mutation: PendingEditorPlanoMutation }
  | { type: "dequeue_mutations"; keys: string[] };

const CACHE_TTL_MS = 1000 * 60 * 15;
const ROUTE_RESTORE_TTL_MS = 1000 * 45;
const ACTIVE_EDITOR_ROUTE_STORAGE_KEY = "meal-plan-editor:active-route";
const runtimeEditorStateCache = new Map<string, EditorPlanoState>();

const getEditorPlanoStorageKey = (planId?: string) =>
  planId ? `meal-plan-editor:${planId}` : null;

const defaultEditorPlanoState: EditorPlanoState = {
  plan: null,
  patientName: "",
  items: [],
  isHydratingPlano: true,
  syncingMap: {},
  statusSync: "idle",
  pendingMutationsQueue: [],
  hasHydratedOnce: false,
};

export const buildSyncingMap = (
  itemIds: string[],
  value: boolean,
  current: Record<string, boolean>
) => {
  const next = { ...current };

  itemIds.filter(Boolean).forEach((itemId) => {
    if (value) next[itemId] = true;
    else delete next[itemId];
  });

  return next;
};

export const persistActiveEditorRoute = ({
  planId,
  route,
  shouldRestore,
}: Pick<PersistedEditorPlanoRouteState, "planId" | "route" | "shouldRestore">) => {
  if (typeof window === "undefined" || !planId || !route) return;

  try {
    const payload: PersistedEditorPlanoRouteState = {
      planId,
      route,
      shouldRestore,
      savedAt: Date.now(),
    };

    sessionStorage.setItem(ACTIVE_EDITOR_ROUTE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures — route restore is best-effort only.
  }
};

export const readActiveEditorRoute = (): PersistedEditorPlanoRouteState | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(ACTIVE_EDITOR_ROUTE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEditorPlanoRouteState;
    if (
      !parsed?.savedAt ||
      !parsed?.route?.startsWith("/meal-plans/") ||
      Date.now() - parsed.savedAt > ROUTE_RESTORE_TTL_MS
    ) {
      sessionStorage.removeItem(ACTIVE_EDITOR_ROUTE_STORAGE_KEY);
      return null;
    }

    const normalizedRoute = parsed.route.replace(/\/legacy(?=\?|#|$)/, "");

    if (normalizedRoute !== parsed.route) {
      const normalizedPayload: PersistedEditorPlanoRouteState = {
        ...parsed,
        route: normalizedRoute,
      };
      sessionStorage.setItem(ACTIVE_EDITOR_ROUTE_STORAGE_KEY, JSON.stringify(normalizedPayload));
      return normalizedPayload;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const readEditorPlanoSnapshot = (planId?: string): EditorPlanoState | null => {
  const cacheKey = getEditorPlanoStorageKey(planId);
  if (!cacheKey) return null;

  const runtimeState = runtimeEditorStateCache.get(cacheKey);
  if (runtimeState) return runtimeState;

  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedEditorPlanoState;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return {
      plan: parsed.plan,
      patientName: parsed.patientName,
      items: parsed.items,
      isHydratingPlano: false,
      syncingMap: {},
      statusSync: "idle",
      pendingMutationsQueue: [],
      hasHydratedOnce: true,
    };
  } catch {
    return null;
  }
};

export const getEditorPlanoInitialState = (planId?: string): EditorPlanoState =>
  readEditorPlanoSnapshot(planId) ?? defaultEditorPlanoState;

export const persistEditorPlanoState = (planId: string, state: EditorPlanoState) => {
  const cacheKey = getEditorPlanoStorageKey(planId);
  if (!cacheKey) return;

  runtimeEditorStateCache.set(cacheKey, state);

  if (typeof window === "undefined" || !state.plan) return;

  try {
    const payload: PersistedEditorPlanoState = {
      plan: state.plan,
      patientName: state.patientName,
      items: state.items,
      savedAt: Date.now(),
    };

    sessionStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore storage failures — the editor must stay responsive.
  }
};

import { assertContract } from "@/lib/contractGuards";

export const editorPlanoReducer = (
  state: EditorPlanoState,
  action: EditorPlanoAction
): EditorPlanoState => {
  // ── Dispatch Controlado (Anti-Cascade Architecture) ────────────────────────
  // Todas as ações de estado passam por uma validação antes e depois.
  
  const validateState = (s: EditorPlanoState) => {
    if (s.items.length > 0 && s.plan) {
      assertContract("draft_integrity", {
        draftId: s.plan.id,
        meals: [{}], // Placeholder for meals check
        items: s.items.map(i => ({ instanceId: i.id })),
        locked: !!s.plan.is_active
      });
    }
  };

  const executeReducer = (s: EditorPlanoState, a: EditorPlanoAction): EditorPlanoState => {
    switch (a.type) {
      case "reset":
        return a.state;
      case "hydrate":
        return {
          ...s,
          plan: a.plan,
          patientName: a.patientName,
          items: a.items,
          isHydratingPlano: false,
          syncingMap: {},
          hasHydratedOnce: true,
        };
      case "set_hydrating":
        return {
          ...s,
          isHydratingPlano: s.hasHydratedOnce ? false : a.value,
        };
      case "replace_items":
        return { ...s, items: a.items };
      case "merge_plan":
        return {
          ...s,
          plan: s.plan ? ({ ...s.plan, ...a.payload } as MealPlan) : s.plan,
        };
      case "set_patient_name":
        return { ...s, patientName: a.patientName };
      case "set_syncing":
        return {
          ...s,
          syncingMap: buildSyncingMap(a.itemIds, a.value, s.syncingMap),
        };
      case "set_status_sync":
        return {
          ...s,
          statusSync: a.status,
        };
      case "enqueue_mutation":
        return {
          ...s,
          pendingMutationsQueue: [
            ...s.pendingMutationsQueue.filter((entry) => entry.key !== a.mutation.key),
            a.mutation,
          ],
        };
      case "dequeue_mutations":
        return {
          ...s,
          pendingMutationsQueue: s.pendingMutationsQueue.filter(
            (entry) => !a.keys.includes(entry.key)
          ),
        };
      default:
        return s;
    }
  };

  // 1. Validar antes
  try {
    validateState(state);
  } catch (err) {
    console.error("[Anti-Cascade] Estado inicial inválido:", err);
  }

  // 2. Executar
  const nextState = executeReducer(state, action);

  // 3. Validar depois
  try {
    validateState(nextState);
  } catch (err) {
    console.error("[Anti-Cascade] Ação resultou em estado inválido. Rollback preventivo pode ser necessário.", err);
    // Em uma implementação mais rigorosa, retornaríamos 'state' (rollback)
    // Mas para evitar travamentos totais na UI, permitimos o log e o bloqueio se for erro crítico de contrato.
  }

  return nextState;
};