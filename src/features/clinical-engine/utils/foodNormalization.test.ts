import { describe, it, expect } from "vitest";
import { normalizeFoodMeasurement, recalculateMacros, applyClinicalSafety } from "./foodNormalization";

describe("foodNormalization (V3 Engine)", () => {
  describe("normalizeFoodMeasurement", () => {
    it("should normalize bread slices to approx 25g", () => {
      const res = normalizeFoodMeasurement({ name: "Pão de Forma", quantity: 50 } as any);
      expect(res.displayQuantity).toBe(2);
      expect(res.displayUnit).toBe("fatias");
      expect(res.normalizedGrams).toBe(50);
    });

    it("should normalize eggs to units of 50g", () => {
      const res = normalizeFoodMeasurement({ name: "Ovo de Galinha", quantity: 100 } as any);
      expect(res.displayQuantity).toBe(2);
      expect(res.displayUnit).toBe("unidades");
    });

    it("should default to grams for generic foods", () => {
      const res = normalizeFoodMeasurement({ name: "Arroz", quantity: 150 } as any);
      expect(res.displayUnit).toBe("g");
      expect(res.displayQuantity).toBe(150);
    });
  });

  describe("recalculateMacros", () => {
    const mockFood = { calories: 100, protein: 10, carbs: 10, fat: 2, portionValue: 100 } as any;

    it("should calculate correct macros for 200g (2x ratio)", () => {
      const res = recalculateMacros(mockFood, 200);
      expect(res.calories).toBe(200);
      expect(res.protein).toBe(20);
    });

    it("should calculate correct macros for 50g (0.5x ratio)", () => {
      const res = recalculateMacros(mockFood, 50);
      expect(res.calories).toBe(50);
      expect(res.protein).toBe(5);
    });
  });

  describe("applyClinicalSafety", () => {
    it("should enforce minimum 80g for main protein sources", () => {
      expect(applyClinicalSafety("Frango", 30)).toBe(80);
      expect(applyClinicalSafety("Carne Moída", 150)).toBe(150);
    });

    it("should enforce minimum 15g for cheese", () => {
      expect(applyClinicalSafety("Queijo Muçarela", 5)).toBe(15);
    });
  });
});
