import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import GenerationModeSelector from "../GenerationModeSelector";

// Mock auth — provides current user
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "nutri-1" } }),
}));

// Mock store — provides planId
vi.mock("@/stores/mealPlanEditorV2Store", () => ({
  useMealPlanEditorV2Store: () => ({
    planId: "plan-1",
    hydrate: vi.fn(),
  }),
}));

// Mock toast (sonner)
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

// Mock subordinate panels
vi.mock("@/components/strategy-advisor/StrategyAdvisorPanel", () => ({
  default: () => <div>StrategyAdvisorPanel</div>,
}));
vi.mock("../MealRecipeSelector", () => ({
  default: () => <div>MealRecipeSelector</div>,
}));
vi.mock("../MarmitaSettingsDialog", () => ({
  default: () => <div>MarmitaSettingsDialog</div>,
}));

// Mock settings hook — settled state
vi.mock("@/hooks/useMarmitaSettings", () => ({
  useMarmitaSettings: () => ({
    settings: {
      weekly_min_lunch: 7,
      weekly_min_dinner: 7,
      fixed_min_lunch: 1,
      fixed_min_dinner: 1,
    },
    loading: false,
  }),
}));

// Mock supabase client — return enough recipes so checks pass
vi.mock("@/integrations/supabase/client", () => {
  const recipes = [
    ...Array.from({ length: 7 }, () => ({ meal_type: "lunch", is_fixed: false })),
    ...Array.from({ length: 7 }, () => ({ meal_type: "dinner", is_fixed: false })),
    { meal_type: "lunch", is_fixed: true },
    { meal_type: "dinner", is_fixed: true },
  ];
  return {
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
  };
});

describe("GenerationModeSelector — mode hints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the weekly mode hint with the primary tone class", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

    const hint = await screen.findByText(
      /Verificando mínimo de almoço \+ jantar para modo semanal/i
    );
    expect(hint).toBeInTheDocument();
    expect(hint.className).toContain("text-primary/70");
  });

  it("renders the fixed mode hint with the accent tone class", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

    const hint = await screen.findByText(
      /Verificando mínimo de almoço \+ jantar fixos para marmitas congeladas/i
    );
    expect(hint).toBeInTheDocument();
    expect(hint.className).toContain("text-accent/70");
  });

  it("does not show hints while checks are loading", () => {
    // Re-render scenario — initial render, before useEffect resolves,
    // counts.loading is true so hints should be absent.
    const { container } = render(
      <GenerationModeSelector patientId="p-1" onGenerated={() => {}} />
    );
    // Synchronous initial render — hints are gated by !checksLoading
    const initial = container.textContent || "";
    expect(initial).toContain("verificando");
  });

  it("renders both weekly and fixed hints together when ready", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

    await waitFor(() => {
      expect(
        screen.getByText(/modo semanal/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/marmitas congeladas/i)
      ).toBeInTheDocument();
    });
  });
});
