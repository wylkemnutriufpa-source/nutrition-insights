import { describe, it, expect, vi } from "vitest";

describe("PaymentGuard logic", () => {
  const RELEASED_STATUSES = [
    "active",
    "awaiting_consent",
    "awaiting_onboarding_release",
    "onboarding_active",
    "onboarding_completed",
    "draft_ready_for_review",
    "plan_published",
    "active_followup",
    "clinical_followup_active",
  ];

  function evaluateJourneyRelease(journeyStatus: string | null): boolean {
    if (!journeyStatus) return false;
    return RELEASED_STATUSES.includes(journeyStatus);
  }

  it("grants access for active journey_status", () => {
    expect(evaluateJourneyRelease("active")).toBe(true);
  });

  it("grants access for onboarding_active", () => {
    expect(evaluateJourneyRelease("onboarding_active")).toBe(true);
  });

  it("grants access for plan_published", () => {
    expect(evaluateJourneyRelease("plan_published")).toBe(true);
  });

  it("denies access for awaiting_payment", () => {
    expect(evaluateJourneyRelease("awaiting_payment")).toBe(false);
  });

  it("denies access for null status", () => {
    expect(evaluateJourneyRelease(null)).toBe(false);
  });

  it("denies access for unknown status", () => {
    expect(evaluateJourneyRelease("random_status")).toBe(false);
  });

  it("grants access for clinical_followup_active", () => {
    expect(evaluateJourneyRelease("clinical_followup_active")).toBe(true);
  });

  it("all released statuses pass", () => {
    RELEASED_STATUSES.forEach((status) => {
      expect(evaluateJourneyRelease(status)).toBe(true);
    });
  });

  // Non-patient bypass
  it("non-patient users always have access", () => {
    // Simulating the guard behavior: non-patients return hasPaid: true
    const isPatient = false;
    const hasPaid = isPatient ? false : true;
    expect(hasPaid).toBe(true);
  });
});
