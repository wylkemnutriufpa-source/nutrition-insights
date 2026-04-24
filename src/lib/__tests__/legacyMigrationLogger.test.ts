import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  __setLegacyMigrationSinks,
  __resetLegacyMigrationSinks,
  logConsolidationPlan,
  logUndoMigration,
  type LegacyMigrationLogEvent,
} from "../legacyMigrationLogger";
import {
  planLegacyConsolidation,
  buildMigrationUndoSnapshot,
} from "../legacyDayConsolidation";

const mk = (id: string, day: number, meal: string) =>
  ({ id, day_of_week: day, meal_type: meal } as any);

describe("legacyMigrationLogger", () => {
  let events: LegacyMigrationLogEvent[];

  beforeEach(() => {
    events = [];
    __setLegacyMigrationSinks([(e) => events.push(e)]);
  });

  afterEach(() => {
    __resetLegacyMigrationSinks();
  });

  it("logs plan + 1 event per moved item with itemId, mealType, fromDay, effectiveDay", () => {
    const items = [mk("a", 1, "lunch"), mk("b", 2, "dinner")];
    const plan = planLegacyConsolidation(items);
    const itemsById = new Map(
      items.map((i) => [i.id, { meal_type: i.meal_type, day_of_week: i.day_of_week }] as const)
    );

    logConsolidationPlan(plan, {
      effectiveDay: 1,
      forceCanonical: false,
      itemsById,
    });

    const planEvent = events.find((e) => e.event === "migration:plan");
    expect(planEvent).toBeTruthy();
    expect(planEvent?.movedTotal).toBe(2);
    expect(planEvent?.effectiveDay).toBe(1);
    expect(planEvent?.movedByMealType).toEqual({ lunch: 1, dinner: 1 });

    const moved = events.filter((e) => e.event === "migration:item-moved");
    expect(moved).toHaveLength(2);

    const a = moved.find((e) => e.itemId === "a");
    expect(a?.mealType).toBe("lunch");
    expect(a?.fromDay).toBe(1);
    expect(a?.toDay).toBe(0);
    expect(a?.effectiveDay).toBe(1);

    const b = moved.find((e) => e.itemId === "b");
    expect(b?.mealType).toBe("dinner");
    expect(b?.fromDay).toBe(2);
  });

  it("logs conflicts separately preserving fromDay and mealType", () => {
    const items = [
      mk("d0_lunch", 0, "lunch"),
      mk("legacy_lunch", 3, "lunch"),
      mk("legacy_dinner", 3, "dinner"),
    ];
    const plan = planLegacyConsolidation(items);
    const itemsById = new Map(
      items.map((i) => [i.id, { meal_type: i.meal_type, day_of_week: i.day_of_week }] as const)
    );
    logConsolidationPlan(plan, { effectiveDay: 0, itemsById });

    const conflicts = events.filter((e) => e.event === "migration:conflict");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].itemId).toBe("legacy_lunch");
    expect(conflicts[0].mealType).toBe("lunch");
    expect(conflicts[0].fromDay).toBe(3);
  });

  it("logs undo with aggregator + 1 event per item including target previousDay", () => {
    const items = [mk("a", 4, "breakfast"), mk("b", 5, "snack")];
    const plan = planLegacyConsolidation(items);
    const undoSnap = buildMigrationUndoSnapshot(items, plan.toMove);
    const itemsById = new Map(
      items.map((i) => [i.id, { meal_type: i.meal_type }] as const)
    );

    logUndoMigration(undoSnap, { effectiveDay: 0, forceCanonical: true, itemsById });

    const agg = events.find((e) => e.event === "migration:undo");
    expect(agg?.movedTotal).toBe(2);
    expect(agg?.forceCanonical).toBe(true);

    const items_evt = events.filter((e) => e.event === "migration:undo-item");
    expect(items_evt).toHaveLength(2);
    const a = items_evt.find((e) => e.itemId === "a");
    expect(a?.toDay).toBe(4);
    expect(a?.fromDay).toBe(0);
    expect(a?.mealType).toBe("breakfast");
  });

  it("every event carries an ISO timestamp", () => {
    const items = [mk("a", 1, "lunch")];
    const plan = planLegacyConsolidation(items);
    const itemsById = new Map(
      items.map((i) => [i.id, { meal_type: i.meal_type, day_of_week: i.day_of_week }] as const)
    );
    logConsolidationPlan(plan, { effectiveDay: 1, itemsById });

    for (const e of events) {
      expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});
