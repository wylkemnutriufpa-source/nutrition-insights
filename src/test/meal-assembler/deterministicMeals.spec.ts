import { describe, it, expect } from "vitest";
import { composeMeal } from "../../../supabase/functions/_shared/meal-assembler/index.ts";
import { lunchSlots, targetsFor } from "./_fixtures.ts";

describe("composeMeal — determinism", () => {
  it("same input produces byte-equal output (1000x)", () => {
    const slots = lunchSlots();
    const targets = targetsFor(slots);
    const ref = composeMeal({ slots, targets, sex: "M", seed: "trace-1" });
    expect(ref.ok).toBe(true);
    const refJson = JSON.stringify({ items: ref.items, totals: ref.totals });

    for (let i = 0; i < 1000; i++) {
      const r = composeMeal({ slots: lunchSlots(), targets, sex: "M", seed: "trace-1" });
      expect(JSON.stringify({ items: r.items, totals: r.totals })).toBe(refJson);
    }
  });

  it("output length equals input slot count and order is preserved", () => {
    const slots = lunchSlots();
    const r = composeMeal({ slots, targets: targetsFor(slots), sex: "M" });
    expect(r.items.map((i) => i.role)).toEqual(slots.map((s) => s.role));
    expect(r.items.map((i) => i.food_id)).toEqual(slots.map((s) => s.food.id));
  });

  it("metadata exposes assembler version and slot count", () => {
    const slots = lunchSlots();
    const r = composeMeal({ slots, targets: targetsFor(slots), sex: "F" });
    expect(r.metadata.assembler_version).toMatch(/^1\.0\.0-onda2b$/);
    expect(r.metadata.slot_count).toBe(slots.length);
    expect(r.metadata.sex).toBe("F");
  });
});
