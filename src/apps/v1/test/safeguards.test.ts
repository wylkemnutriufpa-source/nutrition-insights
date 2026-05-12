/**
 * FitJourney — Smoke Tests: Safeguards & Compatibility
 * BLOCO 3 — Testes de sanitização e contratos de dados
 */
import { describe, it, expect } from "vitest";
import {
  safeNumber, safeString, safeArray, safeBool, safeObject,
  safeFixed, safePercent, safeDivide, safeMap, safeLength,
  safeJsonParse, safeGet, sanitizeRecord,
} from "@/lib/safeguards";
import {
  normalizeLifecycleStatus, validateContract, validateContractArray,
} from "@/lib/compatibilityGuard";

describe("Safeguards — Data Sanitization", () => {
  describe("safeNumber", () => {
    it("handles null/undefined/NaN", () => {
      expect(safeNumber(null)).toBe(0);
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber(NaN)).toBe(0);
      expect(safeNumber("abc")).toBe(0);
      expect(safeNumber("")).toBe(0);
    });

    it("handles valid numbers", () => {
      expect(safeNumber(42)).toBe(42);
      expect(safeNumber("3.14")).toBe(3.14);
      expect(safeNumber(0)).toBe(0);
    });

    it("uses fallback", () => {
      expect(safeNumber(null, 99)).toBe(99);
    });
  });

  describe("safeString", () => {
    it("handles null/undefined/number", () => {
      expect(safeString(null)).toBe("");
      expect(safeString(undefined)).toBe("");
      expect(safeString(42)).toBe("42");
    });
  });

  describe("safeArray", () => {
    it("handles non-arrays", () => {
      expect(safeArray(null)).toEqual([]);
      expect(safeArray(undefined)).toEqual([]);
      expect(safeArray("text")).toEqual([]);
      expect(safeArray(42)).toEqual([]);
      expect(safeArray({})).toEqual([]);
    });

    it("passes arrays through", () => {
      expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("safeFixed (prevents .toFixed crashes)", () => {
    it("never crashes on invalid data", () => {
      expect(safeFixed(null)).toBe("0.0");
      expect(safeFixed(undefined)).toBe("0.0");
      expect(safeFixed("abc")).toBe("0.0");
      expect(safeFixed(NaN)).toBe("0.0");
      expect(safeFixed({})).toBe("0.0");
    });

    it("formats valid numbers", () => {
      expect(safeFixed(3.14159, 2)).toBe("3.14");
      expect(safeFixed(42, 0)).toBe("42");
    });
  });

  describe("safeDivide", () => {
    it("never divides by zero", () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, null)).toBe(0);
      expect(safeDivide(10, 0, -1)).toBe(-1);
    });

    it("divides correctly", () => {
      expect(safeDivide(10, 2)).toBe(5);
    });
  });

  describe("safeGet (deep access)", () => {
    it("handles missing paths", () => {
      expect(safeGet(null, "a.b.c", "default")).toBe("default");
      expect(safeGet({}, "a.b.c", "default")).toBe("default");
      expect(safeGet({ a: { b: null } }, "a.b.c", "default")).toBe("default");
    });

    it("resolves valid paths", () => {
      expect(safeGet({ a: { b: { c: 42 } } }, "a.b.c", 0)).toBe(42);
    });
  });

  describe("sanitizeRecord", () => {
    it("coerces fields to correct types", () => {
      const result = sanitizeRecord(
        { score: "42.5", name: null, active: 1, items: "not-array" },
        { score: "number", name: "string", active: "boolean", items: "array" }
      );
      expect(result).toEqual({
        score: 42.5,
        name: "",
        active: true,
        items: [],
      });
    });
  });
});

describe("Compatibility Guard — Status Normalization", () => {
  it("maps legacy statuses to current", () => {
    expect(normalizeLifecycleStatus("new")).toBe("lead_created");
    expect(normalizeLifecycleStatus("pending")).toBe("awaiting_payment");
    expect(normalizeLifecycleStatus("active")).toBe("clinical_followup_active");
    expect(normalizeLifecycleStatus("onboarding")).toBe("onboarding_active");
    expect(normalizeLifecycleStatus("completed_onboarding")).toBe("onboarding_completed");
  });

  it("passes current statuses through", () => {
    expect(normalizeLifecycleStatus("lead_created")).toBe("lead_created");
    expect(normalizeLifecycleStatus("clinical_followup_active")).toBe("clinical_followup_active");
  });

  it("handles unknown statuses with fallback", () => {
    expect(normalizeLifecycleStatus("INVALID_STATUS")).toBe("lead_created");
    expect(normalizeLifecycleStatus(null)).toBe("lead_created");
    expect(normalizeLifecycleStatus(undefined)).toBe("lead_created");
    expect(normalizeLifecycleStatus(42)).toBe("lead_created");
  });
});

describe("Compatibility Guard — Contract Validation", () => {
  it("validates profile contract with auto-fix", () => {
    const { data, warnings } = validateContract("profiles", {
      id: "uuid-123",
      email: "test@test.com",
      // full_name missing — should use fallback
    });

    expect(data.full_name).toBe("Sem nome");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("validates recipe contract with fallbacks", () => {
    const { data } = validateContract("recipes", {
      id: "uuid-123",
      // title missing — should use fallback
      // ingredients/instructions are optional, so absent = undefined (not fallback)
    });

    expect(data.title).toBe("Receita");
    // Optional fields stay undefined when absent
    expect(data.id).toBe("uuid-123");
  });

  it("validates array of records", () => {
    const { data, totalWarnings } = validateContractArray("profiles", [
      { id: "1", full_name: "João", email: "j@j.com" },
      { id: "2", email: "m@m.com" }, // name missing
    ]);

    expect(data.length).toBe(2);
    expect(data[1].full_name).toBe("Sem nome");
    expect(totalWarnings).toBeGreaterThan(0);
  });
});
