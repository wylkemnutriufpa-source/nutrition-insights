import { describe, it, expect } from "vitest";
import { planLegacyConsolidation } from "../legacyDayConsolidation";
import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

const mk = (id: string, day: number, meal: string): MealPlanItem =>
  ({ id, day_of_week: day, meal_type: meal as any } as MealPlanItem);

describe("planLegacyConsolidation", () => {
  it("returns empty when there are no legacy items", () => {
    const r = planLegacyConsolidation([mk("a", 0, "breakfast")]);
    expect(r.toMove).toEqual([]);
    expect(r.legacyCount).toBe(0);
  });

  it("migrates legacy item when day 0 has no item for that meal_type", () => {
    const r = planLegacyConsolidation([mk("legacy", 1, "lunch")]);
    expect(r.toMove).toEqual(["legacy"]);
    expect(r.legacyCount).toBe(1);
  });

  it("skips legacy item when day 0 already has the same meal_type", () => {
    const r = planLegacyConsolidation([
      mk("a", 0, "lunch"),
      mk("legacy", 1, "lunch"),
    ]);
    expect(r.toMove).toEqual([]);
    expect(r.legacyCount).toBe(1);
  });

  it("migrates only non-conflicting meal types in mixed plans", () => {
    const r = planLegacyConsolidation([
      mk("a", 0, "lunch"),
      mk("legacy_lunch", 1, "lunch"),
      mk("legacy_dinner", 1, "dinner"),
    ]);
    expect(r.toMove).toEqual(["legacy_dinner"]);
    expect(r.legacyCount).toBe(2);
  });

  it("force=true migrates everything regardless of conflicts", () => {
    const r = planLegacyConsolidation(
      [mk("a", 0, "lunch"), mk("legacy", 1, "lunch")],
      { force: true }
    );
    expect(r.toMove).toEqual(["legacy"]);
  });
});
