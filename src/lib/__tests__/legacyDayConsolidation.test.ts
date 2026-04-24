import { describe, it, expect } from "vitest";
import {
  planLegacyConsolidation,
  buildMigrationUndoSnapshot,
  formatMealTypeCounts,
  MEAL_TYPE_LABELS,
} from "../legacyDayConsolidation";
import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

const mk = (id: string, day: number, meal: string): MealPlanItem =>
  ({ id, day_of_week: day, meal_type: meal as any } as MealPlanItem);

describe("planLegacyConsolidation", () => {
  it("returns empty when there are no legacy items", () => {
    const r = planLegacyConsolidation([mk("a", 0, "breakfast")]);
    expect(r.toMove).toEqual([]);
    expect(r.legacyCount).toBe(0);
    expect(r.conflicts).toEqual([]);
    expect(r.movedByMealType).toEqual({});
    expect(r.conflictsByMealType).toEqual({});
  });

  it("migrates legacy item when day 0 has no item for that meal_type", () => {
    const r = planLegacyConsolidation([mk("legacy", 1, "lunch")]);
    expect(r.toMove).toEqual(["legacy"]);
    expect(r.legacyCount).toBe(1);
    expect(r.movedByMealType).toEqual({ lunch: 1 });
    expect(r.conflicts).toEqual([]);
  });

  it("skips legacy item when day 0 already has the same meal_type", () => {
    const r = planLegacyConsolidation([
      mk("a", 0, "lunch"),
      mk("legacy", 1, "lunch"),
    ]);
    expect(r.toMove).toEqual([]);
    expect(r.legacyCount).toBe(1);
    expect(r.conflicts).toEqual([
      { itemId: "legacy", mealType: "lunch", fromDay: 1 },
    ]);
    expect(r.conflictsByMealType).toEqual({ lunch: 1 });
  });

  it("migrates only non-conflicting meal types in mixed plans", () => {
    const r = planLegacyConsolidation([
      mk("a", 0, "lunch"),
      mk("legacy_lunch", 1, "lunch"),
      mk("legacy_dinner", 1, "dinner"),
    ]);
    expect(r.toMove).toEqual(["legacy_dinner"]);
    expect(r.legacyCount).toBe(2);
    expect(r.movedByMealType).toEqual({ dinner: 1 });
    expect(r.conflictsByMealType).toEqual({ lunch: 1 });
  });

  it("force=true migrates everything regardless of conflicts", () => {
    const r = planLegacyConsolidation(
      [mk("a", 0, "lunch"), mk("legacy", 1, "lunch")],
      { force: true }
    );
    expect(r.toMove).toEqual(["legacy"]);
    expect(r.movedByMealType).toEqual({ lunch: 1 });
    expect(r.conflicts).toEqual([]);
  });

  it("aggregates moved counts across multiple meal types", () => {
    const r = planLegacyConsolidation([
      mk("l1", 1, "breakfast"),
      mk("l2", 2, "breakfast"),
      mk("l3", 3, "lunch"),
      mk("l4", 4, "dinner"),
    ]);
    expect(r.toMove.length).toBe(4);
    expect(r.movedByMealType).toEqual({ breakfast: 2, lunch: 1, dinner: 1 });
  });
});

describe("buildMigrationUndoSnapshot", () => {
  it("captures previous day for each migrated item", () => {
    const items = [
      mk("a", 0, "breakfast"),
      mk("b", 1, "lunch"),
      mk("c", 3, "dinner"),
    ];
    const snap = buildMigrationUndoSnapshot(items, ["b", "c"]);
    expect(snap).toEqual([
      { itemId: "b", previousDay: 1 },
      { itemId: "c", previousDay: 3 },
    ]);
  });

  it("ignores items already at day 0 (nothing to undo)", () => {
    const items = [mk("a", 0, "breakfast")];
    const snap = buildMigrationUndoSnapshot(items, ["a"]);
    expect(snap).toEqual([]);
  });

  it("ignores ids not present in items list", () => {
    const items = [mk("a", 1, "breakfast")];
    const snap = buildMigrationUndoSnapshot(items, ["a", "ghost"]);
    expect(snap).toEqual([{ itemId: "a", previousDay: 1 }]);
  });
});

describe("formatMealTypeCounts", () => {
  it("returns dash for empty maps", () => {
    expect(formatMealTypeCounts({})).toBe("—");
  });

  it("formats counts using PT-BR meal labels", () => {
    const formatted = formatMealTypeCounts({ breakfast: 2, lunch: 1 });
    expect(formatted).toContain(`${MEAL_TYPE_LABELS.breakfast}: 2`);
    expect(formatted).toContain(`${MEAL_TYPE_LABELS.lunch}: 1`);
  });

  it("falls back to raw key when label is unknown", () => {
    expect(formatMealTypeCounts({ unknown_meal: 3 })).toContain("unknown_meal: 3");
  });
});
