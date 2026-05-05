import { describe, it, expect } from "vitest";
import { validateDraftIntegrity, validateClinicalValidity } from "../criticalContracts";

describe("criticalContracts", () => {
  const createValidItem = (id: string, instanceId: string) => ({
    id,
    instanceId,
    name: "Ovo",
    kcal: 80,
    protein: 6,
    carbs: 1,
    fat: 5,
    portionValue: 1,
    portionUnitLabel: "un",
    measurementType: "unit" as const
  });

  const validDraft = {
    version: 1,
    meals: [{
      id: "m1",
      name: "Café",
      items: [createValidItem("f1", "inst1")]
    }]
  };

  describe("validateDraftIntegrity", () => {
    it("should return valid data for correct payload", () => {
      const result = validateDraftIntegrity(validDraft);
      expect(result).toBeDefined();
      expect(result.meals[0].items[0].instanceId).toBe("inst1");
    });

    it("should throw error for duplicate instanceIds", () => {
      const invalid = {
        version: 1,
        meals: [{
          id: "m1",
          name: "Café",
          items: [
            createValidItem("f1", "inst1"),
            createValidItem("f2", "inst1") // DUPLICATE
          ]
        }]
      };
      expect(() => validateDraftIntegrity(invalid)).toThrow("Duplicate instanceId found");
    });
  });

  describe("validateClinicalValidity", () => {
    it("should return true for valid caloric plan", () => {
      expect(validateClinicalValidity(validDraft)).toBe(true);
    });

    it("should throw error if items exist but total kcal is 0", () => {
      const invalid = {
        version: 1,
        meals: [{
          id: "m1",
          name: "Café",
          items: [{ ...createValidItem("f1", "inst1"), kcal: 0 }]
        }]
      };
      expect(() => validateClinicalValidity(invalid)).toThrow("Clinical Validity Violation");
    });
  });
});
