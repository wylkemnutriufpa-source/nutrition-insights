import { describe, expect, it } from "vitest";
import { compareMealPlanCollections, haveMealPlanCollectionsChanged } from "./mealPlanPersistenceGuards";

const mealType = "Almoço" as const;

const baseItems = [
  {
    title: "Frango 100g",
    description: "grelhado",
    tipo_refeicao: mealType,
    day_of_week: 1,
    meta_calorias: 220,
    meta_proteinas: 30,
    meta_carboidratos: 12,
    meta_gorduras: 7,
  },
];

describe("mealPlanPersistenceGuards", () => {
  it("detecta diff real entre antes e depois", () => {
    expect(
      haveMealPlanCollectionsChanged(baseItems, [
        { ...baseItems[0], title: "Frango 130g", meta_calorias: 260, meta_proteinas: 38 },
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