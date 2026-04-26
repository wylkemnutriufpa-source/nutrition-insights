import { describe, it, expect } from "vitest";
import { sortMealPlanItems, type MealPlanItem } from "./mealPlanSort";

describe("sortMealPlanItems", () => {
  it("should sort primary items before substitutions", () => {
    const items = [
      { id: "2", is_primary: false, calories_target: 500 } as any,
      { id: "1", is_primary: true, calories_target: 300 } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
  });

  it("should sort by calories_target descending when both are primary", () => {
    const items = [
      { id: "1", is_primary: true, calories_target: 300 } as any,
      { id: "2", is_primary: true, calories_target: 500 } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("should use ID as a stable tie-breaker for same calories_target", () => {
    const items = [
      { id: "b", is_primary: true, calories_target: 500 } as any,
      { id: "a", is_primary: true, calories_target: 500 } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });

  it("should maintain deterministic order regardless of input order", () => {
    const itemA = { id: "a", is_primary: true, calories_target: 500 } as any;
    const itemB = { id: "b", is_primary: true, calories_target: 500 } as any;
    const itemC = { id: "c", is_primary: false, calories_target: 200 } as any;

    const order1 = sortMealPlanItems([itemC, itemB, itemA]);
    const order2 = sortMealPlanItems([itemA, itemC, itemB]);

    expect(order1).toEqual(order2);
    expect(order1[0].id).toBe("a");
    expect(order1[1].id).toBe("b");
    expect(order1[2].id).toBe("c");
  });
});
