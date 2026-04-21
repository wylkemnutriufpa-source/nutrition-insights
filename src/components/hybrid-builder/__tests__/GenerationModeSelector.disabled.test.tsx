import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import GenerationModeSelector from "../GenerationModeSelector";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "nutri-1" } }),
}));

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

// Insufficient recipes: 2 lunch / 1 dinner; 0 fixed lunch / 0 fixed dinner
vi.mock("@/integrations/supabase/client", () => {
  const recipes = [
    { meal_type: "lunch", is_fixed: false },
    { meal_type: "lunch", is_fixed: false },
    { meal_type: "dinner", is_fixed: false },
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

describe("GenerationModeSelector — disabled state when minimums not met", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables the weekly mode button and shows the alert when minimums are not met", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

    const weeklyBtn = await screen.findByRole("button", {
      name: /Cardápio Semanal de Marmitas/i,
    });
    await waitFor(() => expect(weeklyBtn).toBeDisabled());

    // Counts shown reflect insufficient state
    expect(
      screen.getByText(/Almoço 2\/7 · Jantar 1\/7/i)
    ).toBeInTheDocument();

    // Alert text mentions configured minimum
    expect(
      screen.getByText(/Cadastre mais receitas em "Receitas\/Marmitas"/i)
    ).toBeInTheDocument();
  });

  it("disables the fixed mode button and shows the alert when fixed minimums are not met", async () => {
    render(<GenerationModeSelector patientId="p-1" onGenerated={() => {}} />);

    const fixedBtn = await screen.findByRole("button", {
      name: /Marmitas Fixas \(Congeladas\)/i,
    });
    await waitFor(() => expect(fixedBtn).toBeDisabled());

    expect(
      screen.getByText(/Almoço fixo 0\/1 · Jantar fixo 0\/1/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Cadastre marmitas com/i)
    ).toBeInTheDocument();
  });
});
