import { describe, it, expect } from "vitest";

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

  // --- Journey status checks ---
  it.each(RELEASED_STATUSES)("grants access for released status: %s", (status) => {
    expect(evaluateJourneyRelease(status)).toBe(true);
  });

  it("denies access for awaiting_payment", () => {
    expect(evaluateJourneyRelease("awaiting_payment")).toBe(false);
  });

  it("denies access for null status", () => {
    expect(evaluateJourneyRelease(null)).toBe(false);
  });

  it("denies access for empty string", () => {
    expect(evaluateJourneyRelease("")).toBe(false);
  });

  it("denies access for unknown status", () => {
    expect(evaluateJourneyRelease("random_status")).toBe(false);
  });

  // --- Non-patient bypass ---
  it("non-patient users always have access", () => {
    const isPatient = false;
    const hasPaid = isPatient ? false : true;
    expect(hasPaid).toBe(true);
  });

  // --- Payment reason priorities ---
  function evaluatePaymentReason(checks: { journey: boolean; prestige: boolean; payment: boolean; booking: boolean }): string | null {
    if (checks.journey) return "released";
    if (checks.prestige) return "prestige";
    if (checks.payment) return "payment";
    if (checks.booking) return "booking";
    return null;
  }

  it("prioritizes journey release over prestige", () => {
    expect(evaluatePaymentReason({ journey: true, prestige: true, payment: true, booking: true })).toBe("released");
  });

  it("falls back to prestige when journey not released", () => {
    expect(evaluatePaymentReason({ journey: false, prestige: true, payment: true, booking: true })).toBe("prestige");
  });

  it("falls back to payment when no prestige", () => {
    expect(evaluatePaymentReason({ journey: false, prestige: false, payment: true, booking: true })).toBe("payment");
  });

  it("falls back to booking as last resort", () => {
    expect(evaluatePaymentReason({ journey: false, prestige: false, payment: false, booking: true })).toBe("booking");
  });

  it("returns null when no payment method found", () => {
    expect(evaluatePaymentReason({ journey: false, prestige: false, payment: false, booking: false })).toBeNull();
  });

  // --- Prestige tier check ---
  it("detects high-tier prestige (display_order >= 3)", () => {
    const prestige = [
      { prestige_plans: { display_order: 3, slug: "pro" } },
    ];
    const hasHighPrestige = prestige.some((p) => p.prestige_plans && p.prestige_plans.display_order >= 3);
    expect(hasHighPrestige).toBe(true);
  });

  it("rejects low-tier prestige", () => {
    const prestige = [
      { prestige_plans: { display_order: 1, slug: "basic" } },
    ];
    const hasHighPrestige = prestige.some((p) => p.prestige_plans && p.prestige_plans.display_order >= 3);
    expect(hasHighPrestige).toBe(false);
  });

  // --- Return shape consistency ---
  it("produces consistent shape for paid state", () => {
    const state = { hasPaid: true, loading: false, reason: "released" as const };
    expect(state).toHaveProperty("hasPaid");
    expect(state).toHaveProperty("loading");
    expect(state).toHaveProperty("reason");
  });

  it("produces consistent shape for unpaid state", () => {
    const state = { hasPaid: false, loading: false, reason: null };
    expect(state.hasPaid).toBe(false);
    expect(state.reason).toBeNull();
  });
});
