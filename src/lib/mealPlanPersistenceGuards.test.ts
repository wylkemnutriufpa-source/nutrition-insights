import { describe, expect, it } from "vitest";
import { compareMealPlanCollections, haveMealPlanCollectionsChanged } from "./mealPlanPersistenceGuards";

const baseItems = [
  {
    title: "Frango 100g",
    description: "grelhado",
    meal_type: "lunch",
    day_of_week: 1,
    calories_target: 220,
    protein_target: 30,
    carbs_target: 12,
    fat_target: 7,
  },
];

describe("mealPlanPersistenceGuards", () => {
  it("detecta diff real entre antes e depois", () => {
    expect(
      haveMealPlanCollectionsChanged(baseItems, [
        { ...baseItems[0], title: "Frango 130g", calories_target: 260, protein_target: 38 },
      ])
    ).toBe(true);
  });

  it("confirma match quando o persistido bate com o esperado", () => {
    const result = compareMealPlanCollections(baseItems, [{ ...baseItems[0] }]);
    expect(result.matches).toBe(true);
    expect(result.expectedCount).toBe(1);
    expect(result.persistedCount).toBe(1);
  });
});