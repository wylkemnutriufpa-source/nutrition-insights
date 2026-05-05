import { describe, it, expect } from "bun:test";
import { calculateNutritionalScore, validatePlanClinically } from "./nutritionalEvaluator";
import { Meal } from "../types/clinical-types";

describe("nutritionalEvaluator", () => {
  const mockMeals: Meal[] = [
    {
      id: "1",
      name: "Almoço",
      items: [
        { id: "i1", name: "Frango Grelhado", quantity: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, measurementType: 'gram' },
        { id: "i2", name: "Arroz Integral", quantity: 100, calories: 124, protein: 2.6, carbs: 25.8, fat: 1, measurementType: 'gram' }
      ]
    }
  ];

  describe("calculateNutritionalScore", () => {
    it("should calculate a high score for a well-balanced plan matching goals", () => {
      const metadata = {
        goalCalories: 289, // 165 + 124
        goalProtein: 33.6,
        goalCarbs: 25.8,
        goalFat: 4.6,
        goal: "Manter peso"
      };
      
      const score = calculateNutritionalScore(mockMeals, metadata);
      expect(score.total).toBeGreaterThan(90);
      expect(score.breakdown.calories).toBe(100);
      expect(score.breakdown.macros).toBe(100);
    });

    it("should penalize plans with missing macros in main meals", () => {
      const poorMeals: Meal[] = [
        { id: "1", name: "Almoço", items: [{ id: "i3", name: "Alface", quantity: 100, calories: 15, protein: 1, carbs: 2, fat: 0, measurementType: 'gram' }] }
      ];
      const score = calculateNutritionalScore(poorMeals);
      expect(score.breakdown.quality).toBeLessThan(80); // Missing protein in Lunch
    });

    it("should handle empty plan with zero score", () => {
      const score = calculateNutritionalScore([]);
      expect(score.total).toBe(0);
    });
  });

  describe("validatePlanClinically", () => {
    it("should return critical issue for extreme caloric deviation", () => {
      const metadata = { goalCalories: 2000 }; // Plan has ~289
      const issues = validatePlanClinically(mockMeals, metadata);
      expect(issues.some(i => i.type === 'calories' && i.severity === 'critical')).toBe(true);
    });

    it("should return critical issue for insufficient protein", () => {
      const metadata = { goalProtein: 100 }; // Plan has 33.6
      const issues = validatePlanClinically(mockMeals, metadata);
      expect(issues.some(i => i.type === 'protein' && i.severity === 'critical')).toBe(true);
    });

    it("should identify empty meals", () => {
      const mealsWithEmpty = [...mockMeals, { id: "2", name: "Lanche", items: [] }];
      const issues = validatePlanClinically(mealsWithEmpty);
      expect(issues.some(i => i.type === 'meal_empty')).toBe(true);
    });
  });
});
