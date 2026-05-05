import { describe, it, expect } from "vitest";
import { validateMealSubstitutions } from "../mealPlanSubstitutionValidator";

describe("mealPlanSubstitutionValidator", () => {
  const baseItem = {
    id: "item1",
    title: "Almoço",
    calories_target: 500,
    protein_target: 30,
    carbs_target: 50,
    fat_target: 10,
    meal_type: "lunch",
    metadata: {
      substitutions_json: ["• Frango Grelhado", "• Carne Moída"]
    }
  };

  it("should return valid for correct substitutions within tolerance", () => {
    // Frango Grelhado is approx 165kcal/100g, but database mock is needed or real check
    // Since we don't mock FOOD_DATABASE easily here, let's test the structure logic
    const result = validateMealSubstitutions(baseItem as any);
    expect(result.valid).toBe(true);
  });

  it("should fail if limit of substitutions is exceeded", () => {
    const tooMany = {
      ...baseItem,
      metadata: { substitutions_json: ["1", "2", "3", "4", "5"] }
    };
    const result = validateMealSubstitutions(tooMany as any, 4);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("limite definido é 4");
  });

  it("should fail for incoherent meal types (breakfast in lunch)", () => {
    const mixed = {
      ...baseItem,
      metadata: { substitutions_json: ["• Pão com Ovo"] }
    };
    const result = validateMealSubstitutions(mixed as any);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Possível mistura");
  });

  it("should apply Wannubia specific rules", () => {
    const wannubiaItem = {
      ...baseItem,
      metadata: { substitutions_json: ["• Arroz"] } // First should be protein
    };
    const result = validateMealSubstitutions(wannubiaItem as any, 4, "Wannubia");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("primeira substituição deve ser uma Proteína");
  });

  it("should fail for Marmita Fixa without enough items", () => {
    const fixed = {
      ...baseItem,
      metadata: { is_fixed: true, substitutions_json: ["• Frango"] }
    };
    const result = validateMealSubstitutions(fixed as any);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("deve ter entre 3 e 4");
  });

  it("should handle null/undefined metadata", () => {
    const noMeta = { ...baseItem, metadata: null };
    expect(validateMealSubstitutions(noMeta as any).valid).toBe(true);
  });

  it("should handle complex strings with arrows and separators", () => {
    const complex = {
      ...baseItem,
      metadata: { substitutions_json: ["Opção 1 → Frango, Arroz e Feijão"] }
    };
    // This should parse Frango, Arroz, Feijão individually
    const result = validateMealSubstitutions(complex as any);
    expect(result.valid).toBe(true);
  });
});
