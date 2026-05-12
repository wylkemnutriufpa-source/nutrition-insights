import { describe, it, expect } from "vitest";
import { composeMeal } from "../../../supabase/functions/_shared/meal-assembler/index.ts";
import { SLOT_ELASTICITY } from "../../../supabase/functions/_shared/weekly-composer/slotElasticity.ts";
import { lunchSlots } from "./_fixtures.ts";

describe("composeMeal — elasticity bounds", () => {
  it("never scales an item below its min elasticity", () => {
    const slots = lunchSlots();
    // Force absurdly low kcal target to push items toward min
    const r = composeMeal({ slots, targets: { kcal: 100, protein_g: 30, carbs_g: 5, fat_g: 1 }, sex: "M" });
    for (const item of r.items) {
      const e = SLOT_ELASTICITY[item.role];
      const minGrams = item.base_grams * e.min;
      expect(item.grams).toBeGreaterThanOrEqual(minGrams - 1e-6);
    }
  });

  it("never scales a non-protein item above its max elasticity", () => {
    const slots = lunchSlots();
    const r = composeMeal({ slots, targets: { kcal: 5000, protein_g: 200, carbs_g: 600, fat_g: 80 }, sex: "M" });
    for (const item of r.items) {
      const e = SLOT_ELASTICITY[item.role];
      const maxGrams = item.base_grams * e.max;
      expect(item.grams).toBeLessThanOrEqual(maxGrams + 1e-6);
    }
  });

  it("flags clamped items in metadata", () => {
    const slots = lunchSlots();
    const r = composeMeal({ slots, targets: { kcal: 5000, protein_g: 200, carbs_g: 600, fat_g: 80 }, sex: "M" });
    const anyClamped = r.items.some((i) => i.clamped === "max_elasticity");
    expect(anyClamped).toBe(true);
  });
});
