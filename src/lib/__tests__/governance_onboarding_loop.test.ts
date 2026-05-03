import { describe, it, expect } from "vitest";
import { getSystemDecision, type GovernanceContext } from "../governance";

function ctx(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    pathname: "/",
    user: { id: "user-1" },
    profile: { id: "user-1", tenant_id: "tenant-1" },
    journeyStatus: "active_plan",
    hasConsent: true,
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

describe("Governance — Onboarding Loop Prevention", () => {
  it("ALLOWS access to /consent when consent is missing (state dominates)", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/consent", journeyStatus: "anamnesis", hasConsent: false })
    );
    expect(decision.type).toBe("ALLOW");
  });

  it("REDIRECTS to /anamnesis when state=anamnesis and user is on a non-flow page", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/client/dashboard", journeyStatus: "anamnesis" })
    );
    expect(decision.type).toBe("REDIRECT");
    expect(decision.target).toBe("/anamnesis");
  });

  it("ALLOWS /settings (utility route) regardless of state", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/settings", journeyStatus: "anamnesis" })
    );
    expect(decision.type).toBe("ALLOW");
  });

  it("ALLOWS /onboarding/paciente when state=onboarding_slides", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/onboarding/paciente", journeyStatus: "onboarding_slides" })
    );
    expect(decision.type).toBe("ALLOW");
  });

  it("does not produce a redirect chain: target route is ALLOWED on next call", () => {
    const c = ctx({ pathname: "/client/dashboard", journeyStatus: "anamnesis" });
    const d1 = getSystemDecision(c);
    expect(d1.type).toBe("REDIRECT");
    const d2 = getSystemDecision({ ...c, pathname: d1.target! });
    expect(d2.type).toBe("ALLOW");
  });
});
