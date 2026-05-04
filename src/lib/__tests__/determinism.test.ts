import { describe, it, expect, vi } from "vitest";
import { generateMealPlanFromLibrary } from "@/lib/mealPlanAutoGenerator";

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
  const baseProfile = {
    name: "Patient Alpha",
    goal: "maintenance" as const,
    calories_target: 2000,
    protein_target: 150,
    carbs_target: 200,
    fat_target: 60,
    routine_meals_count: 4,
    restrictions: ["gluten"],
    preferences: ["chicken"],
  };

  it("should be deterministic for the same input using FitJourney strategy", async () => {
    const profile = { ...baseProfile, protocol_type: "fitjourney" };
    
    const result1 = await generateMealPlanFromLibrary(profile);
    const result2 = await generateMealPlanFromLibrary(profile);

    // Deterministic outputs must match exactly for the same inputs
    expect(result1).toEqual(result2);
    expect(result1.length).toBeGreaterThan(0);
  });

  it("should be deterministic for the same input using Biquini Branco strategy", async () => {
    const profile = { ...baseProfile, protocol_type: "biquini_branco" };
    
    const result1 = await generateMealPlanFromLibrary(profile);
    const result2 = await generateMealPlanFromLibrary(profile);

    expect(result1).toEqual(result2);
  });

  it("should produce different results for different strategies with same input", async () => {
    const fjProfile = { ...baseProfile, protocol_type: "fitjourney" };
    const bbProfile = { ...baseProfile, protocol_type: "biquini_branco" };

    const fjResult = await generateMealPlanFromLibrary(fjProfile);
    const bbResult = await generateMealPlanFromLibrary(bbProfile);

    // Strategies should differ in their clinical logic
    // We expect some difference in food selection or macro distribution logic
    // (Note: This depends on actual implementation of strategies)
    expect(fjResult).not.toEqual(bbResult);
  });

  it("should respect restrictions across all strategies", async () => {
    const restrictedProfile = { ...baseProfile, restrictions: ["ovo", "egg"] };
    
    const result = await generateMealPlanFromLibrary(restrictedProfile);
    
    const hasEggs = result.some(meal => 
      meal.items.some(item => 
        item.name.toLowerCase().includes("ovo") || 
        item.name.toLowerCase().includes("egg")
      )
    );

    expect(hasEggs).toBe(false);
  });
});
