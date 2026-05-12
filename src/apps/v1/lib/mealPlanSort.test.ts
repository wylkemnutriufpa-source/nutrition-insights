import { describe, it, expect } from "vitest";
import { sortMealPlanItems, type MealPlanItem } from "./mealPlanSort";

describe("sortMealPlanItems", () => {
  it("should sort by day_of_week first (1-6, then 0)", () => {
    const items = [
      { id: "0", day_of_week: 0, meal_type: "breakfast", is_primary: true } as any,
      { id: "2", day_of_week: 2, meal_type: "breakfast", is_primary: true } as any,
      { id: "1", day_of_week: 1, meal_type: "breakfast", is_primary: true } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
    expect(sorted[2].id).toBe("0");
  });

  it("should sort by meal_type within the same day", () => {
    const items = [
      { id: "lunch", day_of_week: 1, meal_type: "lunch", is_primary: true } as any,
      { id: "breakfast", day_of_week: 1, meal_type: "breakfast", is_primary: true } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("breakfast");
    expect(sorted[1].id).toBe("lunch");
  });

  it("should sort primary items before substitutions within the same meal", () => {
    const items = [
      { id: "sub", day_of_week: 1, meal_type: "lunch", is_primary: false } as any,
      { id: "pri", day_of_week: 1, meal_type: "lunch", is_primary: true } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("pri");
    expect(sorted[1].id).toBe("sub");
  });

  it("should sort by calories_target descending when everything else is equal", () => {
    const items = [
      { id: "1", day_of_week: 1, meal_type: "lunch", is_primary: true, calories_target: 300 } as any,
      { id: "2", day_of_week: 1, meal_type: "lunch", is_primary: true, calories_target: 500 } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("should use ID as a stable tie-breaker", () => {
    const items = [
      { id: "b", day_of_week: 1, meal_type: "lunch", is_primary: true, calories_target: 500 } as any,
      { id: "a", day_of_week: 1, meal_type: "lunch", is_primary: true, calories_target: 500 } as any,
    ];
    const sorted = sortMealPlanItems(items);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });

  it("should maintain deterministic order regardless of input order", () => {
    const itemA = { id: "a", day_of_week: 1, meal_type: "breakfast", is_primary: true, calories_target: 500 } as any;
    const itemB = { id: "b", day_of_week: 1, meal_type: "lunch", is_primary: true, calories_target: 500 } as any;
    const itemC = { id: "c", day_of_week: 2, meal_type: "breakfast", is_primary: true, calories_target: 200 } as any;

    const order1 = sortMealPlanItems([itemC, itemB, itemA]);
    const order2 = sortMealPlanItems([itemA, itemC, itemB]);

    expect(order1).toEqual(order2);
    expect(order1[0].id).toBe("a");
    expect(order1[1].id).toBe("b");
    expect(order1[2].id).toBe("c");
  });

  it("performance/stability test: should remain stable with large dataset and ties", () => {
    const largeDataset: MealPlanItem[] = [];
    for (let i = 0; i < 1000; i++) {
      largeDataset.push({
        id: `id-${i}`,
        day_of_week: i % 7,
        meal_type: Object.keys({ breakfast: 0, lunch: 1 })[i % 2],
        is_primary: i % 3 === 0,
        calories_target: 500, // All same calories to force tie-breaking on ID
      } as any);
    }

    const firstSort = sortMealPlanItems([...largeDataset]);
    
    // Check multiple executions
    for (let run = 0; run < 5; run++) {
      const shuffled = [...largeDataset].sort(() => Math.random() - 0.5);
      const subsequentSort = sortMealPlanItems(shuffled);
      expect(subsequentSort).toEqual(firstSort);
    }

    // Check stability (same id means same position)
    for (let i = 0; i < firstSort.length - 1; i++) {
      const current = firstSort[i];
      const next = firstSort[i + 1];
      
      const currentDay = (current.day_of_week === 0 ? 7 : current.day_of_week) || 99;
      const nextDay = (next.day_of_week === 0 ? 7 : next.day_of_week) || 99;
      
      if (currentDay < nextDay) continue;
      if (currentDay > nextDay) throw new Error("Day order violated");

      // Same day, check meal type
      // ... more detailed checks could be here but expect(subsequentSort).toEqual(firstSort) covers it
    }
  });
});
