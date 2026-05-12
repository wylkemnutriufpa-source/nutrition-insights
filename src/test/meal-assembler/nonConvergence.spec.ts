import { describe, it, expect } from "vitest";
import {
  composeMeal,
  reconcileMeal,
} from "../../../supabase/functions/_shared/meal-assembler/index.ts";
import { lunchSlots } from "./_fixtures.ts";

describe("composeMeal — non-convergence", () => {
  it("returns explicit failure when kcal target is impossible (too low)", () => {
    const r = composeMeal({
      slots: lunchSlots(),
      targets: { kcal: 50, protein_g: 30, carbs_g: 5, fat_g: 1 },
      sex: "M",
    });
    expect(r.ok).toBe(false);
    const rec = r.reconciliation;
    expect(rec.ok).toBe(false);
    if (!rec.ok) {
      expect(["KCAL_OUT_OF_TOLERANCE", "ITERATION_LIMIT_EXCEEDED"]).toContain(rec.reason);
      expect(rec.requires_review).toBe(true);
      expect(rec.message.length).toBeGreaterThan(0);
      expect(rec.items.length).toBe(4);
    }
  });

  it("returns INVALID_TARGETS for kcal=0", () => {
    const rec = reconcileMeal(lunchSlots(), { kcal: 0, protein_g: 30, carbs_g: 5, fat_g: 1 }, "M");
    expect(rec.ok).toBe(false);
    if (!rec.ok) {
      expect(rec.reason).toBe("INVALID_TARGETS");
      expect(rec.requires_review).toBe(true);
    }
  });

  it("returns EMPTY_SLOTS for empty input", () => {
    const rec = reconcileMeal([], { kcal: 600, protein_g: 30, carbs_g: 60, fat_g: 10 }, "M");
    expect(rec.ok).toBe(false);
    if (!rec.ok) {
      expect(rec.reason).toBe("EMPTY_SLOTS");
      expect(rec.items).toEqual([]);
    }
  });

  it("never throws — always returns a structured result", () => {
    expect(() =>
      composeMeal({
        slots: lunchSlots(),
        targets: { kcal: -1, protein_g: -1, carbs_g: -1, fat_g: -1 },
        sex: "M",
      })
    ).not.toThrow();
  });

  it("respects maxIterations cap (deterministic)", () => {
    const r = composeMeal({
      slots: lunchSlots(),
      targets: { kcal: 5000, protein_g: 200, carbs_g: 600, fat_g: 80 },
      sex: "M",
      options: { maxIterations: 2 },
    });
    expect(r.reconciliation.metadata.iterations).toBeLessThanOrEqual(2);
  });
});
