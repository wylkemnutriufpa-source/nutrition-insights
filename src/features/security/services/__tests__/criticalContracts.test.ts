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
    measurementType: "unit" as const,
    quantity: 1
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
      const clean = JSON.parse(JSON.stringify(validDraft));
      const result = validateDraftIntegrity(clean);
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });

    it("should return null for invalid payload structure", () => {
      const invalid = {
        version: 1,
        meals: [{
          id: "m1",
          name: "Café",
          items: [
            { id: "bad" } // missing required fields
          ]
        }]
      };
      const result = validateDraftIntegrity(invalid);
      expect(result).toBeNull();
    });
  });

  describe("validateClinicalValidity", () => {
    it("should return true for valid caloric plan", () => {
      expect(validateClinicalValidity(validDraft)).toBe(true);
    });
  });
});
