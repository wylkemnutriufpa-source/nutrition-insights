import { describe, it, expect } from "vitest";
import { formatInternationalWhatsApp, validateWhatsApp, normalizeWhatsApp } from "../whatsapp";

describe("whatsapp utils", () => {
  describe("formatInternationalWhatsApp", () => {
    it("should format a standard 11-digit Brazil number", () => {
      expect(formatInternationalWhatsApp("91981234567")).toBe("+5591981234567");
    });

    it("should preserve existing + prefix", () => {
      expect(formatInternationalWhatsApp("+1234567890")).toBe("+1234567890");
    });

    it("should handle already long numbers missing +", () => {
      expect(formatInternationalWhatsApp("5591981234567")).toBe("+5591981234567");
    });

    it("should return empty for empty input", () => {
      expect(formatInternationalWhatsApp("")).toBe("");
    });
    
    it("should handle null/undefined as strings (fallback behavior)", () => {
       // @ts-ignore
      expect(() => formatInternationalWhatsApp(null)).toThrow();
    });
  });

  describe("validateWhatsApp", () => {
    it("should return invalid for null or empty", () => {
      expect(validateWhatsApp("").isValid).toBe(false);
      // @ts-ignore
      expect(validateWhatsApp(null).isValid).toBe(false);
    });

    it("should validate a correct Brazil number", () => {
      expect(validateWhatsApp("91981234567").isValid).toBe(true);
    });

    it("should fail for too short number", () => {
      expect(validateWhatsApp("123").isValid).toBe(false);
    });

    it("should fail for too long number", () => {
      expect(validateWhatsApp("1234567890123456").isValid).toBe(false);
    });

    it("should fail for invalid Brazil length", () => {
      expect(validateWhatsApp("919812345").isValid).toBe(false);
    });
  });

  describe("normalizeWhatsApp", () => {
    it("should remove all non-digits", () => {
      expect(normalizeWhatsApp("(91) 98123-4567")).toBe("91981234567");
    });

    it("should return empty for no digits", () => {
      expect(normalizeWhatsApp("abc")).toBe("");
    });
  });
});
