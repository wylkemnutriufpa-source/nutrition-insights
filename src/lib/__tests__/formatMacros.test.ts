/**
 * Unit tests for the global macros formatting helpers.
 * These guarantee that the UI never renders `NaN`/`Infinity`/`undefined`
 * regardless of upstream bugs in adapters, calculations, or DB nulls.
 */
import { describe, it, expect } from "vitest";
import { safeNum, fmtMacro, fmtMacroDecimal, safeMultiplier } from "../formatMacros";

describe("safeNum", () => {
  it("returns valid finite numbers untouched", () => {
    expect(safeNum(0)).toBe(0);
    expect(safeNum(42)).toBe(42);
    expect(safeNum(-3.5)).toBe(-3.5);
  });

  it("coerces nullish/invalid inputs to 0", () => {
    expect(safeNum(null)).toBe(0);
    expect(safeNum(undefined)).toBe(0);
    expect(safeNum(NaN)).toBe(0);
    expect(safeNum(Infinity)).toBe(0);
    expect(safeNum(-Infinity)).toBe(0);
    expect(safeNum("not a number")).toBe(0);
    expect(safeNum({})).toBe(0);
  });

  it("parses numeric strings", () => {
    expect(safeNum("123")).toBe(123);
    expect(safeNum("3.14")).toBe(3.14);
  });
});

describe("fmtMacro", () => {
  it("rounds finite numbers to integer string", () => {
    expect(fmtMacro(1783)).toBe("1783");
    expect(fmtMacro(85.4)).toBe("85");
    expect(fmtMacro(85.6)).toBe("86");
    expect(fmtMacro(0)).toBe("0");
  });

  it("returns fallback for invalid values (the bug)", () => {
    expect(fmtMacro(NaN)).toBe("0");
    expect(fmtMacro(Infinity)).toBe("0");
    expect(fmtMacro(undefined)).toBe("0");
    expect(fmtMacro(null)).toBe("0");
    expect(fmtMacro("NaN")).toBe("0");
    expect(fmtMacro("foo")).toBe("0");
  });

  it("respects custom fallback", () => {
    expect(fmtMacro(NaN, "—")).toBe("—");
    expect(fmtMacro(undefined, "?")).toBe("?");
  });
});

describe("fmtMacroDecimal", () => {
  it("preserves decimals for valid inputs", () => {
    expect(fmtMacroDecimal(3.14)).toBe("3.1");
    expect(fmtMacroDecimal(3.16, 1)).toBe("3.2");
    expect(fmtMacroDecimal(3.149, 2)).toBe("3.15");
  });

  it("falls back for invalid inputs", () => {
    expect(fmtMacroDecimal(NaN)).toBe("0");
    expect(fmtMacroDecimal(undefined, 2, "—")).toBe("—");
  });
});

describe("safeMultiplier", () => {
  it("computes target/base ratio for valid inputs", () => {
    expect(safeMultiplier(1800, 1800)).toBe(1);
    expect(safeMultiplier(900, 1800)).toBe(0.5);
    expect(safeMultiplier(2000, 1000)).toBe(2);
  });

  it("returns fallback when base is 0/negative/invalid (divisão por zero)", () => {
    expect(safeMultiplier(1800, 0)).toBe(1);
    expect(safeMultiplier(1800, null)).toBe(1);
    expect(safeMultiplier(1800, undefined)).toBe(1);
    expect(safeMultiplier(1800, NaN)).toBe(1);
    expect(safeMultiplier(1800, -5)).toBe(1);
  });

  it("returns fallback when target is invalid", () => {
    expect(safeMultiplier(NaN, 1800)).toBe(0); // 0/1800 = 0 (válido)
    expect(safeMultiplier(undefined, 1800)).toBe(0);
  });

  it("respects custom fallback", () => {
    expect(safeMultiplier(1800, 0, 0.5)).toBe(0.5);
  });
});
