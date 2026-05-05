import { describe, it, expect } from "vitest";
import { safeNum, fmtMacro, safeMultiplier, isMacroInconsistent } from "./formatMacros";

describe("formatMacros utils", () => {
  describe("safeNum", () => {
    it("should return finite numbers as is", () => {
      expect(safeNum(10)).toBe(10);
      expect(safeNum("20.5")).toBe(20.5);
    });

    it("should return 0 for NaN, Infinity, null, undefined", () => {
      expect(safeNum(NaN)).toBe(0);
      expect(safeNum(Infinity)).toBe(0);
      expect(safeNum(null)).toBe(0);
      expect(safeNum(undefined)).toBe(0);
      expect(safeNum("abc")).toBe(0);
    });
  });

  describe("fmtMacro", () => {
    it("should round numbers to string", () => {
      expect(fmtMacro(10.6)).toBe("11");
      expect(fmtMacro(10.4)).toBe("10");
    });

    it("should return fallback for non-finite or negative numbers", () => {
      expect(fmtMacro(null)).toBe("0");
      expect(fmtMacro(-10, "N/A")).toBe("N/A");
    });
  });

  describe("safeMultiplier", () => {
    it("should calculate correct multiplier", () => {
      expect(safeMultiplier(100, 50)).toBe(2);
    });

    it("should return fallback if base is 0 or invalid", () => {
      expect(safeMultiplier(100, 0)).toBe(1);
      expect(safeMultiplier(100, null, 2)).toBe(2);
    });
  });

  describe("isMacroInconsistent", () => {
    it("should return false if macros match calories (4/4/9)", () => {
      // 100kcal: 10g prot (40), 10g carb (40), 2.22g fat (20)
      expect(isMacroInconsistent(100, 10, 10, 2.22)).toBe(false);
    });

    it("should return true if there is a significant gap", () => {
      expect(isMacroInconsistent(100, 10, 10, 10)).toBe(true); // 40+40+90 = 170 vs 100
    });

    it("should handle 0 calories as consistent", () => {
      expect(isMacroInconsistent(0, 0, 0, 0)).toBe(false);
    });
  });
});
