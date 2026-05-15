
import { describe, it, expect } from "vitest";
import { scaleTemplateToTarget, resolveMealTemplates } from "../../supabase/functions/_shared/template-resolver.ts";

describe("Sovereign Template Governance: Passive Layer Validation", () => {
  const mockTemplate = {
    id: "tpl-123",
    name: "Omelete de Frango",
    meal_type: "Café da Manhã",
    kcal_base: 400,
    protein_base: 30,
    carbs_base: 10,
    fat_base: 25,
    foods_structure: [
      { name: "Ovo", portion_grams: 100, calories: 150, protein: 13, carbs: 1, fat: 10 },
      { name: "Frango", portion_grams: 100, calories: 160, protein: 30, carbs: 0, fat: 4 }
    ],
    satiety_score: 8,
    complexity_level: "low",
    goal_tags: ["emagrecimento"],
    nutritionist_id: "nutri-1",
    is_global: false
  };

  it("should perform PASSIVE scaling without clinical recalculation", () => {
    // Target 600kcal (1.5x scale)
    const { foods, scaleFactor } = scaleTemplateToTarget(mockTemplate, 600);
    
    expect(scaleFactor).toBe(1.5);
    // Verification: scaling must be strictly linear, no clinical adjustment (e.g. protein capping)
    expect(foods[0].portion_grams).toBe(150);
    expect(foods[1].portion_grams).toBe(150);
    expect(foods[0].protein).toBe(19.5); // 13 * 1.5
    expect(foods[1].protein).toBe(45);   // 30 * 1.5
  });

  it("should BLOCK scaling if kcal_base is zero (fail-safe)", () => {
    const corruptTemplate = { ...mockTemplate, kcal_base: 0 };
    const { foods, scaleFactor } = scaleTemplateToTarget(corruptTemplate, 600);
    
    expect(scaleFactor).toBe(1);
    expect(foods[0].portion_grams).toBe(100); // Remained unchanged
  });

  it("should NOT resolve templates based on text-based heuristics (clinical_tags only)", () => {
    const templates = [mockTemplate];
    const resolved = resolveMealTemplates(templates, {
      goal: "lose_weight",
      mealType: "Café da Manhã"
    });

    expect(resolved.length).toBe(1);
    expect(resolved[0].id).toBe("tpl-123");
  });

  it("should enforce that NutriCoreV3 is the sole authority for macro splits", () => {
    // This test ensures the template resolver DOES NOT contain logic to redistribute macros
    // If we wanted 50% protein, the template resolver should NOT touch the template structure internally
    const { foods } = scaleTemplateToTarget(mockTemplate, 400); // 1:1 scale
    
    const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
    expect(totalProtein).toBe(43); // 13 + 30
    // Any change to this total must come from the Clinical Engine calling this, not this layer deciding to "fix" it.
  });
});
