import { describe, it, expect } from "vitest";
import { parseBodyAssessment, generateBodyCompositionFlags } from "../bodyAssessmentParser";

describe("bodyAssessmentParser", () => {
  describe("parseBodyAssessment", () => {
    it("should extract weight and height correctly", () => {
      const text = "O paciente pesa 80.5kg e tem altura de 1,75m";
      const result = parseBodyAssessment(text);
      expect(result.assessment.weight_kg).toBe(80.5);
      expect(result.assessment.height_m).toBe(1.75);
    });

    it("should convert height in cm to meters", () => {
      const text = "Altura: 180cm";
      const result = parseBodyAssessment(text);
      expect(result.assessment.height_m).toBe(1.80);
    });

    it("should extract BMI and body fat", () => {
      const text = "IMC: 24.5 e BF: 15";
      const result = parseBodyAssessment(text);
      expect(result.assessment.bmi).toBe(24.5);
      expect(result.assessment.body_fat_percent).toBe(15);
    });

    it("should handle empty or unrelated text", () => {
      const result = parseBodyAssessment("");
      expect(result.assessment).toEqual({});
      expect(result.fieldsDetected).toEqual([]);
    });

    it("should warn about values out of range", () => {
      const text = "Peso: 500kg"; // Limit is 350
      const result = parseBodyAssessment(text);
      expect(result.assessment.weight_kg).toBeUndefined();
      expect(result.warnings.some(w => w.field === "weight_kg")).toBe(true);
    });
  });

  describe("generateBodyCompositionFlags", () => {
    it("should flag obesity if BMI > 30", () => {
      const assessment = { bmi: 32 };
      const flags = generateBodyCompositionFlags(assessment);
      expect(flags.some(f => f.flag_key === "obesity_risk")).toBe(true);
    });

    it("should flag high body fat for males", () => {
      const assessment = { body_fat_percent: 28 };
      const flags = generateBodyCompositionFlags(assessment, "male");
      expect(flags.some(f => f.flag_key === "high_body_fat_male")).toBe(true);
    });

    it("should return empty array for normal values", () => {
      const assessment = { bmi: 22, body_fat_percent: 15 };
      const flags = generateBodyCompositionFlags(assessment, "male");
      expect(flags).toHaveLength(0);
    });

    it("should handle missing assessment data", () => {
      const flags = generateBodyCompositionFlags({});
      expect(flags).toHaveLength(0);
    });
  });
});
