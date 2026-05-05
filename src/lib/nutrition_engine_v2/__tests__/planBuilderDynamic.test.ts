import { describe, it, expect } from "vitest";
import { buildDynamicPlan } from "../planBuilderDynamic";
import { calcMetrics } from "../calculations";
import { FoodRecord } from "../planBuilder";
import { MealStructure } from "../mealStructureBuilder";

describe("planBuilderDynamic (V2.1)", () => {
  const mockMetrics = calcMetrics({
    weight_kg: 70,
    height_cm: 170,
    sex: "M",
    age: 30,
    activity_level: "moderate",
    goal: "maintain"
  });

  const mockFoods: FoodRecord[] = [
    { id: "1", name: "Arroz Integral", calories: 124, protein: 2.6, carbs: 25.8, fat: 1, fiber: 1.8 },
    { id: "2", name: "Frango Grelhado", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
    { id: "3", name: "Feijão Preto", calories: 91, protein: 6, carbs: 14, fat: 0.5, fiber: 8.4 },
    { id: "4", name: "Ovo Cozido", calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 }
  ];

  const mockStructure: MealStructure[] = [
    { id: "m1", name: "Café da Manhã", time: "08:00", period: "morning", type_hint: "breakfast" },
    { id: "m2", name: "Almoço", time: "12:00", period: "afternoon", type_hint: "lunch" }
  ];

  const mockDistributions = [
    { meal_id: "m1", kcal_target: 500, percentage: 0.25 },
    { meal_id: "m2", kcal_target: 1500, percentage: 0.75 }
  ];

  it("should build a plan with correct structure and totals", () => {
    const plan = buildDynamicPlan(mockMetrics, "maintain", mockFoods, mockStructure, mockDistributions);
    
    expect(plan.meals.length).toBe(2);
    expect(plan.meals[0].name).toBe("Café da Manhã");
    expect(plan.meals[1].name).toBe("Almoço");
    expect(plan.engine_version).toBe("v2.1.0-dynamic");
  });

  it("should handle empty foods list gracefully", () => {
    const plan = buildDynamicPlan(mockMetrics, "maintain", [], mockStructure, mockDistributions);
    expect(plan.meals.every(m => m.items.length === 0)).toBe(true);
    expect(plan.unresolved_items.length).toBeGreaterThan(0);
  });

  it("should clamp scale between 0.4 and 2.0", () => {
    // Caso 1: Meta muito baixa (força 0.4)
    const lowDist = [{ meal_id: "m1", kcal_target: 10, percentage: 1 }];
    const planLow = buildDynamicPlan(mockMetrics, "maintain", mockFoods, [mockStructure[0]], lowDist);
    
    // Caso 2: Meta muito alta (força 2.0)
    const highDist = [{ meal_id: "m1", kcal_target: 10000, percentage: 1 }];
    const planHigh = buildDynamicPlan(mockMetrics, "maintain", mockFoods, [mockStructure[0]], highDist);

    expect(planLow.meals[0].totals.kcal).toBeGreaterThan(10); // clamped at 0.4
    expect(planHigh.meals[0].totals.kcal).toBeLessThan(10000); // clamped at 2.0
  });
});
