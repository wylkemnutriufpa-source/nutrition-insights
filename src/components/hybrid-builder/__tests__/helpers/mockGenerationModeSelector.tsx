import { vi } from "vitest";

/**
 * Shared mock factories and presets for GenerationModeSelector tests.
 *
 * Why this shape: `vi.mock(...)` calls are hoisted to the top of the *test
 * file* by vitest's transformer — they are NOT hoisted across module
 * boundaries. So we can't put `vi.mock(...)` inside this helper and expect
 * it to take effect in the importing test file.
 *
 * Instead, this module exposes:
 *   - A `mockState` object created via `vi.hoisted` so it exists before
 *     the hoisted `vi.mock` factories run.
 *   - `setMockState(opts)` to mutate that state from the test (call BEFORE
 *     `render`).
 *   - `installMocks()` — a single helper that registers ALL the standard
 *     `vi.mock` calls. Test files call this at module top-level. The mock
 *     factories close over `mockState`, so different scenarios just call
 *     `setMockState({...})` before rendering.
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

export interface MockStateOptions {
  counts?: RecipeCounts;
  settings?: MarmitaSettingsLike;
  settingsLoading?: boolean;
  user?: { id: string } | null;
}

export const READY_COUNTS: RecipeCounts = {
  lunch: 7,
  dinner: 7,
  fixedLunch: 1,
  fixedDinner: 1,
};

export const INSUFFICIENT_COUNTS: RecipeCounts = {
  lunch: 2,
  dinner: 1,
  fixedLunch: 0,
  fixedDinner: 0,
};

const DEFAULT_SETTINGS = {
  weekly_min_lunch: 7,
  weekly_min_dinner: 7,
  fixed_min_lunch: 1,
  fixed_min_dinner: 1,
};

/**
 * Hoisted state container — created before `vi.mock` factories execute.
 * Test files mutate this via `setMockState` before rendering.
 */
export const mockState = vi.hoisted(() => ({
  user: { id: "nutri-1" } as { id: string } | null,
  settings: { ...DEFAULT_SETTINGS },
  settingsLoading: false,
  recipes: [] as Array<{ meal_type: string; is_fixed: boolean }>,
}));

export function buildRecipes(counts: RecipeCounts = {}) {
  const { lunch = 0, dinner = 0, fixedLunch = 0, fixedDinner = 0 } = counts;
  return [
    ...Array.from({ length: lunch }, () => ({ meal_type: "lunch", is_fixed: false })),
    ...Array.from({ length: dinner }, () => ({ meal_type: "dinner", is_fixed: false })),
    ...Array.from({ length: fixedLunch }, () => ({ meal_type: "lunch", is_fixed: true })),
    ...Array.from({ length: fixedDinner }, () => ({ meal_type: "dinner", is_fixed: true })),
  ];
}

/** Update the shared mock state. Call BEFORE `render(...)`. */
export function setMockState(opts: MockStateOptions = {}) {
  if (opts.counts !== undefined) mockState.recipes = buildRecipes(opts.counts);
  if (opts.settings !== undefined)
    mockState.settings = { ...DEFAULT_SETTINGS, ...opts.settings };
  if (opts.settingsLoading !== undefined) mockState.settingsLoading = opts.settingsLoading;
  if (opts.user !== undefined) mockState.user = opts.user;
}

// Initialize with sane defaults so tests don't need to call setMockState
// when the default scenario is fine.
mockState.recipes = buildRecipes(READY_COUNTS);

/**
 * Register all `vi.mock(...)` calls needed for GenerationModeSelector.
 * MUST be called at module top-level in the test file (vitest hoists it).
 *
 * Note: paths to sibling components are relative to the *test file*, which
 * lives in `src/components/hybrid-builder/__tests__/`. We assume that
 * convention here.
 */
export function installGenerationModeSelectorMocks() {
  vi.mock("@/lib/auth", () => ({
    useAuth: () => ({ user: mockState.user }),
  }));

  vi.mock("@/stores/mealPlanEditorV2Store", () => ({
    useMealPlanEditorV2Store: () => ({ planId: "plan-1", hydrate: vi.fn() }),
  }));

  vi.mock("sonner", () => ({
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
  }));

  vi.mock("@/components/strategy-advisor/StrategyAdvisorPanel", () => ({
    default: () => null,
  }));
  vi.mock("../MealRecipeSelector", () => ({ default: () => null }));
  vi.mock("../MarmitaSettingsDialog", () => ({ default: () => null }));

  vi.mock("@/hooks/useMarmitaSettings", () => ({
    useMarmitaSettings: () => ({
      settings: mockState.settings,
      loading: mockState.settingsLoading,
    }),
  }));

  vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: mockState.recipes, error: null }),
          }),
        }),
      }),
      functions: { invoke: vi.fn() },
    },
  }));
}
