import { vi } from "vitest";

/**
 * Shared mock factories and presets for GenerationModeSelector tests.
 *
 * Why this shape:
 *   - `vi.mock(...)` is hoisted to the top of the *test file* by vitest's
 *     transformer. Calling `vi.mock` from inside a helper function still
 *     works as long as that helper is invoked at module top-level in the
 *     test file (which is how `installGenerationModeSelectorMocks()` is
 *     used below).
 *   - Mock factories must not capture local closures from the helper (those
 *     wouldn't exist when the hoisted mocks first run). Instead, factories
 *     read from a shared object on `globalThis` that tests mutate via
 *     `setMockState(...)` before each render.
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

interface MockState {
  user: { id: string } | null;
  settings: typeof DEFAULT_SETTINGS;
  settingsLoading: boolean;
  recipes: Array<{ meal_type: string; is_fixed: boolean }>;
}

const STATE_KEY = "__GMS_MOCK_STATE__";

function getState(): MockState {
  const g = globalThis as unknown as Record<string, MockState | undefined>;
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = {
      user: { id: "nutri-1" },
      settings: { ...DEFAULT_SETTINGS },
      settingsLoading: false,
      recipes: buildRecipes(READY_COUNTS),
    };
  }
  return g[STATE_KEY] as MockState;
}

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
 * Replace the shared mock state with a fresh snapshot derived from `opts`.
 * Any field not provided is reset to its default — this prevents leakage
 * between test cases.
 * Call BEFORE `render(...)`.
 */
export function setMockState(opts: MockStateOptions = {}) {
  const s = getState();
  s.recipes = buildRecipes(opts.counts ?? READY_COUNTS);
  s.settings = { ...DEFAULT_SETTINGS, ...(opts.settings ?? {}) };
  s.settingsLoading = opts.settingsLoading ?? false;
  s.user = opts.user !== undefined ? opts.user : { id: "nutri-1" };
}

/**
 * Register all `vi.mock(...)` calls needed for GenerationModeSelector.
 * MUST be called at module top-level in the test file (vitest hoists it).
 *
 * Sibling-component paths are relative to test files in
 * `src/components/hybrid-builder/__tests__/`.
 */
export function installGenerationModeSelectorMocks() {
  vi.mock("@/lib/auth", () => ({
    useAuth: () => {
      const g = globalThis as any;
      return { user: g[STATE_KEY]?.user ?? { id: "nutri-1" } };
    },
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
    useMarmitaSettings: () => {
      const g = globalThis as any;
      const s = g[STATE_KEY];
      return {
        settings: s?.settings ?? DEFAULT_SETTINGS,
        loading: s?.settingsLoading ?? false,
      };
    },
  }));

  vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => {
              const g = globalThis as any;
              return Promise.resolve({ data: g[STATE_KEY]?.recipes ?? [], error: null });
            },
          }),
        }),
      }),
      functions: { invoke: vi.fn() },
    },
  }));
}
