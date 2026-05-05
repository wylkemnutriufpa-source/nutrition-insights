import { describe, it, expect } from "vitest";
import { validateDraftIntegrity, validateClinicalValidity } from "../services/criticalContracts";

describe("criticalContracts", () => {
  const validDraft = {
    version: 1,
    meals: [{
      id: "m1",
      name: "Café",
      items: [{
        id: "f1",
        instanceId: "inst1",
        name: "Ovo",
        kcal: 80,
        protein: 6,
        carbs: 1,
        fat: 5,
        portionValue: 1,
        portionUnitLabel: "un",
        measurementType: "unit"
      }]
    }]
  };

  describe("validateDraftIntegrity", () => {
    it("should return valid data for correct payload", () => {
      expect(validateDraftIntegrity(validDraft)).toEqual(validDraft);
    });

    it("should throw error for missing meals", () => {
      const invalid = { ...validDraft, meals: [] };
      expect(() => validateDraftIntegrity(invalid)).toThrow("Draft Integrity Contract Violated");
    });

    it("should throw error for duplicate instanceIds", () => {
      const invalid = JSON.parse(JSON.stringify(validDraft));
      invalid.meals[0].items.push({ ...invalid.meals[0].items[0], instanceId: "inst1" });
      expect(() => validateDraftIntegrity(invalid)).toThrow("Duplicate instanceId found");
    });

    it("should handle null/undefined and junk data", () => {
      expect(() => validateDraftIntegrity(null)).toThrow();
      expect(() => validateDraftIntegrity({})).toThrow();
      expect(() => validateDraftIntegrity({ meals: "junk" })).toThrow();
    });
  });

  describe("validateClinicalValidity", () => {
    it("should return true for valid caloric plan", () => {
      expect(validateClinicalValidity(validDraft)).toBe(true);
    });

    it("should throw error if items exist but total kcal is 0", () => {
      const invalid = JSON.parse(JSON.stringify(validDraft));
      invalid.meals[0].items[0].kcal = 0;
      expect(() => validateClinicalValidity(invalid)).toThrow("Clinical Validity Violation");
    });

    it("should handle empty plans (no items) gracefully", () => {
       const empty = { meals: [{ id: "m1", name: "Empty", items: [] }] };
       expect(validateClinicalValidity(empty)).toBe(true);
    });
  });
});
