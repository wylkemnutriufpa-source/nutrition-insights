import { describe, it, expect } from "vitest";
import {
  composeMeal,
  FEMALE_PROTEIN_MAX_GRAMS,
} from "../../../supabase/functions/_shared/meal-assembler/index.ts";
import { FOODS } from "./_fixtures.ts";
import type { SlotSpec } from "../../../supabase/functions/_shared/meal-assembler/mealAssembler.types.ts";

describe("composeMeal — female protein clamp", () => {
  it("clamps protein_lean to 150g for sex=F when base exceeds clamp", () => {
    const slots: SlotSpec[] = [
      { role: "protein_lean", food: FOODS.frango, base_grams: 220 },
      { role: "carb_complex", food: FOODS.arroz,  base_grams: 120 },
      { role: "vegetable",    food: FOODS.brocolis, base_grams: 100 },
    ];
    // Build natural targets but cap protein expectation at the clamp
    const targets = { kcal: 600, protein_g: 50, carbs_g: 35, fat_g: 6 };
    const r = composeMeal({ slots, targets, sex: "F" });
    const protein = r.items.find((i) => i.role === "protein_lean")!;
    expect(protein.grams).toBeLessThanOrEqual(FEMALE_PROTEIN_MAX_GRAMS);
    expect(protein.clamped).toBe("female_protein_150g");
    expect(r.reconciliation.metadata.female_protein_clamp_hit).toBe(true);
  });

  it("does NOT clamp protein for sex=M with same base portion", () => {
    const slots: SlotSpec[] = [
      { role: "protein_lean", food: FOODS.frango, base_grams: 220 },
      { role: "carb_complex", food: FOODS.arroz,  base_grams: 120 },
    ];
    const targets = { kcal: 700, protein_g: 70, carbs_g: 35, fat_g: 8 };
    const r = composeMeal({ slots, targets, sex: "M" });
    const protein = r.items.find((i) => i.role === "protein_lean")!;
    expect(protein.grams).toBeGreaterThan(FEMALE_PROTEIN_MAX_GRAMS - 1);
    expect(protein.clamped).not.toBe("female_protein_150g");
  });

  it("clamp wins over reconciler — protein never exceeds 150g for F", () => {
    const slots: SlotSpec[] = [
      { role: "protein_lean", food: FOODS.frango, base_grams: 150 },
      { role: "carb_complex", food: FOODS.arroz,  base_grams: 50 },
    ];
    // Aggressive kcal target that would normally push protein up
    const targets = { kcal: 900, protein_g: 60, carbs_g: 40, fat_g: 10 };
    const r = composeMeal({ slots, targets, sex: "F" });
    const protein = r.items.find((i) => i.role === "protein_lean")!;
    expect(protein.grams).toBeLessThanOrEqual(FEMALE_PROTEIN_MAX_GRAMS);
  });
});
