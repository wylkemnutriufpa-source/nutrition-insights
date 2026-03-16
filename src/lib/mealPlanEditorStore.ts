import type { Tables } from "@/integrations/supabase/types";

export type MealPlan = Tables<"meal_plans">;
export type MealPlanItem = Tables<"meal_plan_items">;

export interface EditorPlanoState {
  plan: MealPlan | null;
  patientName: string;
  items: MealPlanItem[];
  isHydratingPlano: boolean;
  syncingMap: Record<string, boolean>;
}

type PersistedEditorPlanoState = Pick<EditorPlanoState, "plan" | "patientName" | "items"> & {
  savedAt: number;
};

export type EditorPlanoAction =
  | { type: "reset"; state: EditorPlanoState }
  | { type: "hydrate"; plan: MealPlan | null; patientName: string; items: MealPlanItem[] }
  | { type: "set_hydrating"; value: boolean }
  | { type: "replace_items"; items: MealPlanItem[] }
  | { type: "merge_plan"; payload: Partial<MealPlan> }
  | { type: "set_patient_name"; patientName: string }
  | { type: "set_syncing"; itemIds: string[]; value: boolean };

const CACHE_TTL_MS = 1000 * 60 * 15;
const runtimeEditorStateCache = new Map<string, EditorPlanoState>();

const getEditorPlanoStorageKey = (planId?: string) =>
  planId ? `meal-plan-editor:${planId}` : null;

const defaultEditorPlanoState: EditorPlanoState = {
  plan: null,
  patientName: "",
  items: [],
  isHydratingPlano: true,
  syncingMap: {},
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

export const editorPlanoReducer = (
  state: EditorPlanoState,
  action: EditorPlanoAction
): EditorPlanoState => {
  switch (action.type) {
    case "reset":
      return action.state;
    case "hydrate":
      return {
        plan: action.plan,
        patientName: action.patientName,
        items: action.items,
        isHydratingPlano: false,
        syncingMap: {},
      };
    case "set_hydrating":
      return { ...state, isHydratingPlano: action.value };
    case "replace_items":
      return { ...state, items: action.items };
    case "merge_plan":
      return {
        ...state,
        plan: state.plan ? ({ ...state.plan, ...action.payload } as MealPlan) : state.plan,
      };
    case "set_patient_name":
      return { ...state, patientName: action.patientName };
    case "set_syncing":
      return {
        ...state,
        syncingMap: buildSyncingMap(action.itemIds, action.value, state.syncingMap),
      };
    default:
      return state;
  }
};
