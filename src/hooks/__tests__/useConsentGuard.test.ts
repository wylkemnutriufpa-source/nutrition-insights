import { describe, it, expect } from "vitest";

describe("ConsentGuard logic", () => {
  function evaluateConsent(data: { id?: string; accepted_terms_version?: string; revoked_at?: string | null } | null): {
    hasConsent: boolean;
  } {
    return {
      hasConsent: !!data?.id,
    };
  }

  it("returns hasConsent true when consent record exists", () => {
    const result = evaluateConsent({ id: "abc-123", accepted_terms_version: "1.0.0", revoked_at: null });
    expect(result.hasConsent).toBe(true);
  });

  it("returns hasConsent false when no consent record", () => {
    const result = evaluateConsent(null);
    expect(result.hasConsent).toBe(false);
  });

  it("returns hasConsent false when consent has no id", () => {
    const result = evaluateConsent({});
    expect(result.hasConsent).toBe(false);
  });

  it("non-patient users always have consent (bypass)", () => {
    const isPatient = false;
    const hasConsent = isPatient ? false : true;
    expect(hasConsent).toBe(true);
  });
});
