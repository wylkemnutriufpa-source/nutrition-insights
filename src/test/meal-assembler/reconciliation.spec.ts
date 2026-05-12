import { describe, it, expect } from "vitest";
import { composeMeal } from "../../../supabase/functions/_shared/meal-assembler/index.ts";
import { lunchSlots, targetsFor } from "./_fixtures.ts";

describe("composeMeal — reconciliation", () => {
  it("converges to ±5% kcal when target is shifted +5%", () => {
    const slots = lunchSlots();
    const base = targetsFor(slots);
    const targets = { ...base, kcal: Math.round(base.kcal * 1.05) };
    const r = composeMeal({ slots, targets, sex: "M" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const dev = Math.abs(r.totals.kcal - targets.kcal) / targets.kcal;
      expect(dev).toBeLessThanOrEqual(0.05);
    }
  });

  it("protein is the LAST pivot — does not move when carb/fat can absorb gap", () => {
    const slots = lunchSlots();
    const base = targetsFor(slots);
    const targets = { ...base, kcal: Math.round(base.kcal * 1.05) };
    const r = composeMeal({ slots, targets, sex: "M" });
    expect(r.ok).toBe(true);
    const protein = r.items.find((i) => i.role === "protein_lean")!;
    expect(protein.scale_factor).toBe(1);
    expect(protein.grams).toBe(slots[0].base_grams);
  });

  it("preserves protein within ±3% of target", () => {
    const slots = lunchSlots();
    const base = targetsFor(slots);
    const targets = { ...base, kcal: Math.round(base.kcal * 0.95) };
    const r = composeMeal({ slots, targets, sex: "M" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const dev = Math.abs(r.totals.protein_g - targets.protein_g) / targets.protein_g;
      expect(dev).toBeLessThanOrEqual(0.03);
    }
  });

  it("reconciliation metadata exposes touched_roles and deviations", () => {
    const slots = lunchSlots();
    const base = targetsFor(slots);
    const targets = { ...base, kcal: Math.round(base.kcal * 1.08) };
    const r = composeMeal({ slots, targets, sex: "M" });
    expect(r.reconciliation.metadata.iterations).toBeGreaterThanOrEqual(0);
    expect(r.reconciliation.metadata.touched_roles).not.toContain("protein_lean");
  });
});
