import { vi } from "vitest";

/**
 * Shared test helpers for GenerationModeSelector tests.
 *
 * Why: Both "hints" and "disabled state" suites share the same set of
 * external dependencies (auth, store, sonner, sub-panels, settings, supabase).
 * Centralizing the mocks here keeps each test file focused on the scenario it
 * covers and makes adding new scenarios (e.g. partial counts, error states)
 * trivial — just call `setupGenerationModeSelectorMocks(...)` with the
 * counts/settings you want.
 */

export interface RecipeCounts {
  lunch?: number;
  dinner?: number;
  fixedLunch?: number;
  fixedDinner?: number;
}

export interface MarmitaSettingsLike {
  weekly_min_lunch?: number;
  weekly_min_dinner?: number;
  fixed_min_lunch?: number;
  fixed_min_dinner?: number;
}

export interface MockSetupOptions {
  counts?: RecipeCounts;
  settings?: MarmitaSettingsLike;
  settingsLoading?: boolean;
  user?: { id: string } | null;
}

const DEFAULT_SETTINGS: Required<MarmitaSettingsLike> = {
  weekly_min_lunch: 7,
  weekly_min_dinner: 7,
  fixed_min_lunch: 1,
  fixed_min_dinner: 1,
};

/**
 * Build a recipe array matching the shape returned by the supabase query
 * (`select("meal_type, is_fixed")`) from desired counts.
 */
export function buildRecipes(counts: RecipeCounts = {}) {
  const { lunch = 0, dinner = 0, fixedLunch = 0, fixedDinner = 0 } = counts;
  return [
    ...Array.from({ length: lunch }, () => ({ meal_type: "lunch", is_fixed: false })),
    ...Array.from({ length: dinner }, () => ({ meal_type: "dinner", is_fixed: false })),
    ...Array.from({ length: fixedLunch }, () => ({ meal_type: "lunch", is_fixed: true })),
    ...Array.from({ length: fixedDinner }, () => ({ meal_type: "dinner", is_fixed: true })),
  ];
}

/**
 * Convenience preset: enough recipes to satisfy the default 7+7 / 1+1 minimums.
 */
export const READY_COUNTS: RecipeCounts = {
  lunch: 7,
  dinner: 7,
  fixedLunch: 1,
  fixedDinner: 1,
};

/**
 * Convenience preset: clearly insufficient counts for both modes.
 */
export const INSUFFICIENT_COUNTS: RecipeCounts = {
  lunch: 2,
  dinner: 1,
  fixedLunch: 0,
  fixedDinner: 0,
};

/**
 * Register all mocks needed to render <GenerationModeSelector /> in isolation.
 * Must be called at module top-level (before the component import) because
 * `vi.mock` is hoisted.
 */
export function setupGenerationModeSelectorMocks(opts: MockSetupOptions = {}) {
  const {
    counts = READY_COUNTS,
    settings = {},
    settingsLoading = false,
    user = { id: "nutri-1" },
  } = opts;
  const finalSettings = { ...DEFAULT_SETTINGS, ...settings };
  const recipes = buildRecipes(counts);

  vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user }) }));

  vi.mock("@/stores/mealPlanEditorV2Store", () => ({
    useMealPlanEditorV2Store: () => ({ planId: "plan-1", hydrate: vi.fn() }),
  }));

  vi.mock("sonner", () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
  }));

  vi.mock("@/components/strategy-advisor/StrategyAdvisorPanel", () => ({
    default: () => <div>StrategyAdvisorPanel</div>,
  }));
  vi.mock("../MealRecipeSelector", () => ({
    default: () => <div>MealRecipeSelector</div>,
  }));
  vi.mock("../MarmitaSettingsDialog", () => ({
    default: () => <div>MarmitaSettingsDialog</div>,
  }));

  vi.mock("@/hooks/useMarmitaSettings", () => ({
    useMarmitaSettings: () => ({ settings: finalSettings, loading: settingsLoading }),
  }));

  vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: recipes, error: null }),
          }),
        }),
      }),
      functions: { invoke: vi.fn() },
    },
  }));
}
