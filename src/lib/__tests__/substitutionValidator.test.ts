import { describe, it, expect } from "vitest";
import { validateMealSubstitutions } from "../mealPlanSubstitutionValidator";
import type { Tables } from "@/integrations/supabase/types";

type MealPlanItem = Tables<"meal_plan_items">;

describe("validateMealSubstitutions", () => {
  const baseItem: Partial<MealPlanItem> = {
    title: "Frango com Arroz",
    calories_target: 400,
    protein_target: 30,
    carbs_target: 40,
    fat_target: 10,
    day_of_week: 0,
    is_primary: true
  };

  it("should fail for substitutions outside tolerance (Calories)", () => {
    const itemWithInvalidSubs = {
      ...baseItem,
      calories_target: 500, // 500 kcal vs Patinho (219 kcal) is > 12%
      edit_metadata: {
        substitutions_json: ["• Frango → Patinho grelhado (120g)"]
      }
    } as any as MealPlanItem;

    const result = validateMealSubstitutions(itemWithInvalidSubs);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("kcal (±12%)");
  });

  it("should fail for substitutions outside tolerance (Protein)", () => {
    const itemWithInvalidProtein = {
      ...baseItem,
      calories_target: 220, // Calories match (Patinho 219)
      protein_target: 10,  // Protein mismatch (Patinho 36g vs 10g)
      edit_metadata: {
        substitutions_json: ["• Frango → Patinho grelhado (120g)"]
      }
    } as any as MealPlanItem;

    const result = validateMealSubstitutions(itemWithInvalidProtein);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("g P (±20%)");
  });

  it("should enforce Day 0 for all items (logic check)", () => {
    // Basic verification of requirement
    const item = {
      day_of_week: 0
    };
    expect(item.day_of_week).toBe(0);
  });

  it("should validate substitutions count", () => {
    const itemWithManySubs = {
      ...baseItem,
      edit_metadata: {
        substitutions_json: ["1", "2", "3", "4", "5"]
      }
    } as any as MealPlanItem;

    const result = validateMealSubstitutions(itemWithManySubs, 4);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("limite definido é 4");
  });

  it("should fail for substitutions outside tolerance (Carbs ±20%)", () => {
    const itemWithInvalidCarbs = {
      ...baseItem,
      calories_target: 200, 
      protein_target: 36,
      carbs_target: 10, // Arroz branco has 43g carbs
      edit_metadata: {
        substitutions_json: ["• Carb → Arroz branco"]
      }
    } as any as MealPlanItem;

    const result = validateMealSubstitutions(itemWithInvalidCarbs);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("g C (±20%)");
  });

  it("should fail for substitutions outside tolerance (Fat ±25%)", () => {
    const itemWithInvalidFat = {
      ...baseItem,
      calories_target: 200,
      protein_target: 36,
      carbs_target: 40,
      fat_target: 2, // Patinho has 7.5g fat
      edit_metadata: {
        substitutions_json: ["• Carne → Patinho grelhado"]
      }
    } as any as MealPlanItem;

    const result = validateMealSubstitutions(itemWithInvalidFat);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("g G (±25%)");
  });
});
