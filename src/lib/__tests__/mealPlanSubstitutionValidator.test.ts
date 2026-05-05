import { describe, it, expect } from "vitest";
import { validateMealSubstitutions } from "../mealPlanSubstitutionValidator";

describe("mealPlanSubstitutionValidator", () => {
  const baseItem = {
    id: "item1",
    title: "Almoço",
    calories_target: 0, // Disable macro check for structure tests
    meal_type: "lunch",
    metadata: {
      substitutions_json: ["• Frango Grelhado", "• Carne Moída"]
    }
  };

  it("should return valid for correct substitutions structure", () => {
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
      metadata: { substitutions_json: ["• Pão de forma"] }
    };
    const result = validateMealSubstitutions(mixed as any);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Possível mistura");
  });

  it("should apply Wannubia specific rules", () => {
    const wannubiaItem = {
      ...baseItem,
      metadata: { substitutions_json: ["• Arroz"] } 
    };
    const result = validateMealSubstitutions(wannubiaItem as any, 4, "Wannubia");
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("primeira substituição deve ser uma Proteína"))).toBe(true);
  });

  it("should fail for Marmita Fixa without enough items", () => {
    const fixed = {
      ...baseItem,
      metadata: { is_fixed: true, substitutions_json: ["• Frango"] }
    };
    const result = validateMealSubstitutions(fixed as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("deve ter entre 3 e 4"))).toBe(true);
  });

  it("should handle null/undefined metadata", () => {
    const noMeta = { ...baseItem, metadata: null };
    expect(validateMealSubstitutions(noMeta as any).valid).toBe(true);
  });

  it("should handle complex strings with arrows and separators", () => {
    const complex = {
      ...baseItem,
      metadata: { substitutions_json: ["Opção 1 → Frango"] }
    };
    const result = validateMealSubstitutions(complex as any);
    expect(result.valid).toBe(true);
  });
});
