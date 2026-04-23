import { describe, it, expect } from "vitest";
import { 
  validatePortion, 
  getPortionAutocompleteOptions, 
  PORTION_UNITS 
} from "../portionValidation";

describe("portionValidation Logic Layer", () => {
  describe("validatePortion", () => {
    it("should return true for empty or whitespace strings", () => {
      expect(validatePortion("")).toBe(true);
      expect(validatePortion("   ")).toBe(true);
    });

    it("should return true for valid formats (number + unit)", () => {
      expect(validatePortion("150g")).toBe(true);
      expect(validatePortion("1.5kg")).toBe(true);
      expect(validatePortion("200 ml")).toBe(true);
      expect(validatePortion("2 ovos")).toBe(true);
      expect(validatePortion("1 fatia")).toBe(true);
      expect(validatePortion("0,5l")).toBe(true);
    });

    it("should return false for invalid formats", () => {
      expect(validatePortion("150")).toBe(false); // No unit
      expect(validatePortion("gramas")).toBe(false); // No number
      expect(validatePortion("150xyz")).toBe(false); // Invalid unit
      expect(validatePortion("abc 123")).toBe(false); // Wrong order
    });

    it("should be case insensitive", () => {
      expect(validatePortion("150G")).toBe(true);
      expect(validatePortion("2 OVOS")).toBe(true);
    });
  });

  describe("getPortionAutocompleteOptions", () => {
    it("should return all units if no number is present", () => {
      const options = getPortionAutocompleteOptions("");
      expect(options).toEqual([...PORTION_UNITS]);
    });

    it("should prepend the number if present", () => {
      const options = getPortionAutocompleteOptions("150");
      expect(options).toContain("150g");
      expect(options).toContain("150ml");
      expect(options).toHaveLength(PORTION_UNITS.length);
    });

    it("should work with decimals", () => {
      const options = getPortionAutocompleteOptions("1.5");
      expect(options).toContain("1.5kg");
      expect(options).toContain("1.5l");
    });
  });
});
