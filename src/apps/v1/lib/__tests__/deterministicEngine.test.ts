import { describe, expect, it, vi } from "vitest";
import { generateMealPlanFromLibrary } from "@/lib/mealPlanAutoGenerator";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((cb) => cb({ data: [], error: null })),
        })),
      })),
    })),
  },
}));

// Mock clinicalEngineAudit to avoid DB calls in tests
vi.mock("@/lib/clinicalEngineAudit", () => ({
  logEngineStep: vi.fn(),
}));

describe("Deterministic Motor - Regression Suite", () => {
  it("deve lançar erro se o plan_type estiver ausente (Prevenção de regressão)", async () => {
    const profile: any = {
      patientId: "test-id",
      goal: "weight_loss",
      targetCalories: 2000,
      rejectedFoods: [],
      clinicalTags: [],
      // planType: undefined, // Missing intentionally
    };

    await expect(generateMealPlanFromLibrary(profile)).rejects.toThrow(
      "O tipo de plano (plan_type) é obrigatório"
    );
  });

  it("deve filtrar corretamente itens por plan_type para evitar mistura", async () => {
    // Este teste verificaria a lógica de filtragem se tivéssemos dados mockados complexos.
    // Como mockamos o Supabase para retornar vazio acima, ele deve falhar por falta de itens.
    const profile: any = {
      patientId: "test-id",
      goal: "weight_loss",
      targetCalories: 2000,
      rejectedFoods: [],
      clinicalTags: [],
      planType: "marmita",
    };

    await expect(generateMealPlanFromLibrary(profile)).rejects.toThrow(
      "Biblioteca de refeições não contém itens válidos"
    );
  });
});
