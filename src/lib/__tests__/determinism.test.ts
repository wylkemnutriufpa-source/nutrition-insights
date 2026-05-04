import { describe, it, expect, vi } from "vitest";
import { generateMealPlanFromLibrary, PatientProfile } from "@/lib/mealPlanAutoGenerator";

// Mock clinicalEngineAudit to avoid DB calls in tests
vi.mock("@/lib/clinicalEngineAudit", () => ({
  logEngineStep: vi.fn().mockResolvedValue({}),
}));

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }),
    },
  },
}));

describe("Clinical Engine Determinism Tests", () => {
  const baseProfile: PatientProfile = {
    patientId: "test-patient-uuid",
    goal: "maintenance",
    planType: "normal",
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 60,
    restrictions: ["gluten"],
    rejectedFoods: ["chicken"],
    clinicalTags: []
  };

  it("should be deterministic for the same input using a mocked library", async () => {
    // We mock the return value of supabase to return consistent items
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', title: 'Meal 1', meal_type: 'breakfast', base_calories: 400, protein: 30, carbs: 40, fat: 12, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
          { id: '2', title: 'Meal 2', meal_type: 'morning_snack', base_calories: 200, protein: 15, carbs: 20, fat: 6, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
          { id: '3', title: 'Meal 3', meal_type: 'lunch', base_calories: 600, protein: 45, carbs: 60, fat: 18, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
          { id: '4', title: 'Meal 4', meal_type: 'afternoon_snack', base_calories: 200, protein: 15, carbs: 20, fat: 6, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
          { id: '5', title: 'Meal 5', meal_type: 'dinner', base_calories: 440, protein: 33, carbs: 44, fat: 13, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
          { id: '6', title: 'Meal 6', meal_type: 'evening_snack', base_calories: 160, protein: 12, carbs: 16, fat: 5, plan_type: 'normal', goal_tag: 'maintenance', is_active: true },
        ],
        error: null
      })
    });

    const result1 = await generateMealPlanFromLibrary(baseProfile);
    const result2 = await generateMealPlanFromLibrary(baseProfile);

    // Deterministic outputs must match exactly for the same inputs
    expect(result1.slots).toEqual(result2.slots);
    expect(result1.success).toBe(true);
  });

  it("should block generation if items have different plan types", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: '1', title: 'Marmita', meal_type: 'lunch', base_calories: 600, plan_type: 'marmita', goal_tag: 'maintenance', is_active: true }
        ],
        error: null
      })
    });

    // Profile is 'normal', but only 'marmita' found
    await expect(generateMealPlanFromLibrary(baseProfile)).rejects.toThrow(/Biblioteca de refeições não contém itens válidos/);
  });
});
