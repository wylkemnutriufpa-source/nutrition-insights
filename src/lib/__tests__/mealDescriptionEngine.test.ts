import { describe, expect, it } from "vitest";
import {
  buildFoodDescriptionFromItems,
  syncProteinDescriptionPortions,
  scaleDescriptionQuantities,
  isGenericDescription,
  finalizeMealDescription,
} from "@/lib/mealDescriptionEngine";

describe("Neutralized MealDescriptionEngine — SOBERANIA CLÍNICA", () => {
  describe("buildFoodDescriptionFromItems", () => {
    it("is passive and does not guess unit sizes like P/M/G", () => {
      const result = buildFoodDescriptionFromItems([
        { food_name: "Pão integral", quantity: 25, portion_unit: "fatia" },
      ]);
      expect(result).toContain("• Pão integral — 25 fatia");
      expect(result).not.toContain("unidade P");
    });

    it("uses default 'g' if unit is missing", () => {
      const result = buildFoodDescriptionFromItems([
        { food_name: "Frango", quantity: 150 },
      ]);
      expect(result).toContain("Frango — 150g");
    });
  });

  describe("scaleDescriptionQuantities", () => {
    it("is neutralized and always returns the original description", () => {
      const original = "100g arroz";
      const result = scaleDescriptionQuantities(original, 2.0);
      expect(result).toBe(original);
    });
  });

  describe("syncProteinDescriptionPortions", () => {
    it("is neutralized and does not clamp portions anymore", () => {
      const original = "• 220g peito de frango grelhado";
      const result = syncProteinDescriptionPortions(original, "lunch", 50, 50, true);
      expect(result).toBe(original);
    });
  });

  describe("finalizeMealDescription", () => {
    it("does NOT add beverages or arbitrary structural changes", () => {
      const input = "• Pão integral — 1 fatia";
      const result = finalizeMealDescription(input, "breakfast", false);
      expect(result).not.toContain("Café com leite");
      expect(result).toBe(input);
    });
  });

  describe("isGenericDescription", () => {
    it("detects bare values", () => {
      expect(isGenericDescription("150g")).toBe(true);
      expect(isGenericDescription("Arroz — 150g")).toBe(false);
    });
  });
});
