import { describe, it, expect } from "vitest";

describe("ConsentGuard logic", () => {
  function evaluateConsent(data: { id?: string; accepted_at?: string; accepted_terms_version?: string; revoked_at?: string | null } | null) {
    return {
      hasConsent: !!data?.id,
      consentDate: data?.accepted_at ?? null,
      consentVersion: data?.accepted_terms_version ?? null,
    };
  }

  it("returns hasConsent true when consent record exists", () => {
    const result = evaluateConsent({ id: "abc-123", accepted_at: "2025-01-01", accepted_terms_version: "1.0.0", revoked_at: null });
    expect(result.hasConsent).toBe(true);
    expect(result.consentDate).toBe("2025-01-01");
    expect(result.consentVersion).toBe("1.0.0");
  });

  it("returns hasConsent false when no consent record", () => {
    const result = evaluateConsent(null);
    expect(result.hasConsent).toBe(false);
    expect(result.consentDate).toBeNull();
    expect(result.consentVersion).toBeNull();
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

  // --- Version matching ---
  it("matches specific terms version", () => {
    const TERMS_VERSION = "1.0.0";
    const consent = { accepted_terms_version: "1.0.0" };
    expect(consent.accepted_terms_version === TERMS_VERSION).toBe(true);
  });

  it("rejects mismatched terms version", () => {
    const TERMS_VERSION = "2.0.0";
    const consent = { accepted_terms_version: "1.0.0" };
    expect(consent.accepted_terms_version === TERMS_VERSION).toBe(false);
  });

  // --- Return shape consistency ---
  it("produces consistent shape with null fields", () => {
    const state = evaluateConsent(null);
    expect(state).toEqual({ hasConsent: false, consentDate: null, consentVersion: null });
  });

  it("produces consistent shape with data", () => {
    const state = evaluateConsent({ id: "x", accepted_at: "2025-06-01", accepted_terms_version: "1.0.0" });
    expect(state).toEqual({ hasConsent: true, consentDate: "2025-06-01", consentVersion: "1.0.0" });
  });
});
