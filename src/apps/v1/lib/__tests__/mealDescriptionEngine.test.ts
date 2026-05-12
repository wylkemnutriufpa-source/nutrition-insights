import { describe, expect, it } from "vitest";
import {
  buildFoodDescriptionFromItems,
  syncProteinDescriptionPortions,
  scaleDescriptionQuantities,
  isGenericDescription,
  finalizeMealDescription,
} from "@v1/lib/mealDescriptionEngine";

// ── HARDENING: Invalid description prevention ────────────────

describe("buildFoodDescriptionFromItems — hardening", () => {
  it("never produces 'undefined' in output", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Arroz", portion_grams: undefined, portion_reference: undefined },
    ]);
    expect(result).not.toContain("undefined");
    expect(result).toContain("Arroz");
    expect(result).toContain("100g");
  });

  it("never produces 'NaN' in output", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Feijão", portion_grams: NaN, portion_reference: "NaN" },
    ]);
    expect(result).not.toContain("NaN");
    expect(result).toContain("Feijão");
  });

  it("never produces standalone '0g' for zero portion", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Frango", portion_grams: 0 },
    ]);
    // Should fallback to 100g, never " — 0g"
    expect(result).not.toContain(" — 0g");
    expect(result).toContain("Frango");
    expect(result).toContain("100g");
  });

  it("handles negative portion_grams gracefully", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Batata", portion_grams: -50 },
    ]);
    expect(result).not.toContain("-50g");
    expect(result).toContain("100g");
  });

  it("preserves unit-based portions for pão and tapioca", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Pão integral", portion_grams: 25, portion_reference: "1 fatia" },
      { food_name: "Tapioca", portion_grams: 60, portion_reference: "1 tapioca média" },
    ]);
    expect(result).toContain("1 unidade P");
    expect(result).toContain("1 unidade M");
    expect(result).not.toContain("25g");
    expect(result).not.toContain("60g");
  });

  it("keeps meaningful non-gram references", () => {
    const result = buildFoodDescriptionFromItems([
      { food_name: "Banana", portion_grams: 100, portion_reference: "1 unidade" },
    ]);
    expect(result).toContain("1 unidade");
    expect(result).not.toContain("100g");
  });
});

// ── HARDENING: Protein sync ─────────────────────────────────

describe("syncProteinDescriptionPortions — hardening", () => {
  it("clamps oversized lunch protein portions", () => {
    const result = syncProteinDescriptionPortions(
      "• 220g peito de frango grelhado\n• 5 col. sopa arroz\n• Salada verde",
      "lunch", 52, 52, true,
    );
    expect(result).toContain("180g peito de frango grelhado");
    expect(result).not.toContain("220g");
  });

  it("does not alter non-protein lines", () => {
    const result = syncProteinDescriptionPortions(
      "• 100g iogurte natural", "evening_snack", 15, 10, false,
    );
    expect(result).toBe("• 100g iogurte natural");
  });

  it("handles null description gracefully", () => {
    const result = syncProteinDescriptionPortions(null, "lunch", 50, 50, false);
    expect(result).toBeNull();
  });

  it("handles zero previousProtein without division error", () => {
    const result = syncProteinDescriptionPortions(
      "• 150g frango grelhado", "lunch", 50, 0, false,
    );
    expect(result).not.toContain("NaN");
    expect(result).not.toContain("Infinity");
  });
});

// ── HARDENING: Scale quantities ─────────────────────────────

describe("scaleDescriptionQuantities — hardening", () => {
  it("returns original for factor near 1", () => {
    const result = scaleDescriptionQuantities("100g arroz", 1.02);
    expect(result).toBe("100g arroz");
  });

  it("handles null input", () => {
    expect(scaleDescriptionQuantities(null, 1.5)).toBeNull();
  });

  it("handles zero factor", () => {
    expect(scaleDescriptionQuantities("100g arroz", 0)).toBe("100g arroz");
  });

  it("handles negative factor", () => {
    expect(scaleDescriptionQuantities("100g arroz", -1)).toBe("100g arroz");
  });
});

// ── HARDENING: Generic description detection ─────────────────

describe("isGenericDescription", () => {
  it("detects bare gram values", () => {
    expect(isGenericDescription("150g")).toBe(true);
    expect(isGenericDescription("200 kcal")).toBe(true);
  });

  it("detects Meta: without items", () => {
    expect(isGenericDescription("Meta: 2000kcal")).toBe(true);
  });

  it("accepts normal descriptions", () => {
    expect(isGenericDescription("• Arroz — 150g\n• Feijão — 100g")).toBe(false);
  });
});

// ── HARDENING: Finalize meal description ─────────────────────

describe("finalizeMealDescription — hardening", () => {
  it("adds beverage to breakfast if missing", () => {
    const result = finalizeMealDescription("• Pão integral — 1 unidade P", "breakfast", false);
    expect(result).toContain("Café com leite");
  });

  it("does not duplicate beverage if already present", () => {
    const input = "• Café com leite\n• Pão integral";
    const result = finalizeMealDescription(input, "breakfast", false);
    const matches = result.match(/Café com leite/g);
    expect(matches?.length).toBe(1);
  });

  it("preserves substitutions section", () => {
    const input = "• Frango — 150g\n\n🔄 Substituições:\n• Frango → Peixe (150g)";
    const result = finalizeMealDescription(input, "lunch", false);
    expect(result).toContain("🔄 Substituições:");
    expect(result).toContain("Peixe");
  });
});
