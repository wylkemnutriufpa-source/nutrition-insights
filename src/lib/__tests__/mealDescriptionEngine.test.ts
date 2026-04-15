import { describe, expect, it } from "vitest";
import { buildFoodDescriptionFromItems, syncProteinDescriptionPortions } from "@/lib/mealDescriptionEngine";

describe("syncProteinDescriptionPortions", () => {
  it("clamps oversized lunch protein portions to the clinical standard", () => {
    const result = syncProteinDescriptionPortions(
      "• 220g peito de frango grelhado\n• 5 col. sopa arroz\n• Salada verde",
      "lunch",
      52,
      52,
      true,
    );

    expect(result).toContain("• 180g peito de frango grelhado");
    expect(result).not.toContain("220g peito de frango");
  });

  it("does not alter non-protein food lines", () => {
    const result = syncProteinDescriptionPortions(
      "• 100g iogurte natural",
      "evening_snack",
      15,
      10,
      false,
    );

    expect(result).toBe("• 100g iogurte natural");
  });
});

describe("buildFoodDescriptionFromItems", () => {
  it("preserves unit-based portions for bread and tapioca instead of converting to grams", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Pão integral", portion_grams: 25, portion_reference: "1 fatia" },
      { food_name: "Tapioca", portion_grams: 60, portion_reference: "1 tapioca média" },
    ]);

    expect(result).toContain("• Pão integral — 1 unidade P");
    expect(result).toContain("• Tapioca — 1 unidade M");
    expect(result).not.toContain("25g");
    expect(result).not.toContain("60g");
  });

  it("keeps meaningful non-gram references for other foods", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Banana", portion_grams: 100, portion_reference: "1 unidade" },
    ]);

    expect(result).toContain("• Banana — 1 unidade");
    expect(result).not.toContain("100g");
  });
});