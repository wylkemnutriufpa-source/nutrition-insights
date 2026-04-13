import { describe, expect, it } from "vitest";
import { syncProteinDescriptionPortions } from "@/lib/mealDescriptionEngine";

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

  it("keeps scaling protein text proportionally for non-main meals", () => {
    const result = syncProteinDescriptionPortions(
      "• 100g iogurte natural",
      "evening_snack",
      15,
      10,
      false,
    );

    expect(result).toBe("• 150g iogurte natural");
  });
});