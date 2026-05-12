import { describe, it, expect } from "vitest";
import { validatePortion } from "../portionValidation";

describe("portionValidation", () => {
  it("should validate correct portions with units", () => {
    expect(validatePortion("150g")).toBe(true);
    expect(validatePortion("1.5kg")).toBe(true);
    expect(validatePortion("0,5kg")).toBe(true);
    expect(validatePortion("200 ml")).toBe(true);
    expect(validatePortion("1L")).toBe(true);
    expect(validatePortion("2 ovos")).toBe(true);
    expect(validatePortion("1 fatia")).toBe(true);
    expect(validatePortion("3 colheres")).toBe(true);
  });

  it("should accept empty string as valid (optional field logic)", () => {
    expect(validatePortion("")).toBe(true);
    expect(validatePortion("  ")).toBe(true);
  });

  it("should reject portions without units", () => {
    expect(validatePortion("150")).toBe(false);
  });

  it("should reject invalid units", () => {
    expect(validatePortion("150 bananas")).toBe(false);
    expect(validatePortion("150 gramas")).toBe(false); // Only 'g' supported in units array
  });

  it("should handle mixed case units", () => {
    expect(validatePortion("150G")).toBe(true);
    expect(validatePortion("1 ML")).toBe(true);
  });

  it("should reject malicious data or junk", () => {
    expect(validatePortion("150g; DROP TABLE users")).toBe(false);
    expect(validatePortion("<script>alert(1)</script>")).toBe(false);
    expect(validatePortion("   150g   ")).toBe(true); // trims correctly
  });

  it("should handle large numbers", () => {
    expect(validatePortion("999999g")).toBe(true);
  });
});
