import { describe, it, expect } from "vitest";
import { isProtein, isCarb, isFruit, calculateItemMacros, getDeterministicSuggestions } from "./v3Motor";

describe("v3Motor", () => {
  describe("Nutritional Categories", () => {
    it("should identify proteins correctly", () => {
      expect(isProtein("Frango Grelhado")).toBe(true);
      expect(isProtein("Patinho Moído")).toBe(true);
      expect(isProtein("Alface")).toBe(false);
    });

    it("should identify carbs correctly", () => {
      expect(isCarb("Arroz Branco")).toBe(true);
      expect(isCarb("Batata Doce")).toBe(true);
      expect(isCarb("Azeite")).toBe(false);
    });
  });

  describe("calculateItemMacros", () => {
    const mockFood = { calories: 100, protein: 10, measurementType: 'gram' };

    it("should calculate correctly for grams (factor = quantity/100)", () => {
      const res = calculateItemMacros(mockFood as any, 200);
      expect(res.kcal).toBe(200);
      expect(res.protein).toBe(20);
    });

    it("should calculate correctly for units (factor = quantity)", () => {
      const mockUnit = { ...mockFood, measurementType: 'unit' };
      const res = calculateItemMacros(mockUnit as any, 2);
      expect(res.kcal).toBe(200);
      expect(res.protein).toBe(20);
    });
  });

  describe("getDeterministicSuggestions", () => {
    const foods = [
      { id: "1", name: "Frango", measurementType: "gram" },
      { id: "2", name: "Carne", measurementType: "gram" },
      { id: "3", name: "Peixe", measurementType: "gram" },
      { id: "4", name: "Arroz", measurementType: "gram" }
    ] as any;

    it("should suggest other proteins for a protein item", () => {
      const suggestions = getDeterministicSuggestions("Frango", foods, "gram");
      const proteinNames = suggestions.map(f => f.name);
      expect(proteinNames).toContain("Carne");
      expect(proteinNames).toContain("Peixe");
    });

    it("should handle items not in main categories by falling back to measurementType", () => {
      const suggestions = getDeterministicSuggestions("Alface", foods, "gram");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].measurementType).toBe("gram");
    });
  });
});