import { describe, it, expect } from "vitest";
import { getSystemDecision, type GovernanceContext } from "../governance";

function ctx(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    pathname: "/",
    user: { id: "user-1" },
    profile: { id: "user-1", tenant_id: "tenant-1" },
    journeyStatus: "active_plan",
    mode: "basic",
    role: "patient",
    isReady: true,
    isDegraded: false,
    isHybrid: false,
    isPatientContext: false,
    isProfessionalContext: false,
    isNutritionist: false,
    isPersonal: false,
    isAdmin: false,
    versionMismatch: false,
    ...overrides,
  };
}

describe("Governance Engine — Onboarding Loop Prevention", () => {
  it("should ALLOW access to /consent even if journeyStatus is 'anamnesis'", () => {
    const decision = getSystemDecision(
      ctx({
        pathname: "/consent",
        journeyStatus: "anamnesis",
      })
    );
    expect(decision.type).toBe("ALLOW");
    expect(decision.reason).toContain("Bypassing state enforcement");
  });

  it("should REDIRECT to /anamnesis if user is in 'anamnesis' state and on a random page", () => {
    const decision = getSystemDecision(
      ctx({
        pathname: "/client/dashboard",
        journeyStatus: "anamnesis",
      })
    );
    expect(decision.type).toBe("REDIRECT");
    expect(decision.target).toBe("/anamnesis");
  });

  it("should ALLOW access to /settings for active patients", () => {
    const decision = getSystemDecision(
      ctx({
        pathname: "/settings",
        journeyStatus: "active_plan",
      })
    );
    expect(decision.type).toBe("ALLOW");
    expect(decision.reason).toContain("Bypassing state enforcement");
  });

  it("should ALLOW access to /onboarding/paciente if journeyStatus is 'onboarding_slides'", () => {
    const decision = getSystemDecision(
      ctx({
        pathname: "/onboarding/paciente",
        journeyStatus: "onboarding_slides",
      })
    );
    expect(decision.type).toBe("ALLOW");
    expect(decision.reason).toContain("Bypassing state enforcement");
  });
});
