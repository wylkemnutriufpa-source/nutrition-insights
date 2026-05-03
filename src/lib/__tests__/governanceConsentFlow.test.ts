import { describe, it, expect } from "vitest";
import { getSystemDecision, type GovernanceContext } from "../governance";

function ctx(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    pathname: "/anamnesis",
    user: { id: "user-debora" },
    profile: { id: "user-debora", tenant_id: "tenant-1" },
    journeyStatus: "anamnesis",
    hasConsent: true,
    mode: "basic",
    role: "patient",
    isReady: true,
    isDegraded: false,
    isHybrid: false,
    isPatientContext: true,
    isProfessionalContext: false,
    isNutritionist: false,
    isPersonal: false,
    isAdmin: false,
    versionMismatch: false,
    isTransitioning: false,
    ...overrides,
  };
}

describe("Governance — Consent precedes Anamnesis", () => {
  it("redirects patient WITHOUT consent from /anamnesis to /consent", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/anamnesis", journeyStatus: "anamnesis", hasConsent: false })
    );
    expect(decision.type).toBe("REDIRECT");
    expect(decision.target).toBe("/consent");
  });

  it("ALLOWS the patient to remain on /consent until consent is granted", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/consent", journeyStatus: "anamnesis", hasConsent: false })
    );
    expect(decision.type).toBe("ALLOW");
  });

  it("after consent is granted, redirects from /consent to /anamnesis", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/consent", journeyStatus: "anamnesis", hasConsent: true })
    );
    expect(decision.type).toBe("REDIRECT");
    expect(decision.target).toBe("/anamnesis");
  });

  it("after consent + anamnesis complete, sends patient to /client/dashboard", () => {
    const decision = getSystemDecision(
      ctx({ pathname: "/anamnesis", journeyStatus: "active_plan", hasConsent: true })
    );
    expect(decision.type).toBe("REDIRECT");
    expect(decision.target).toBe("/client/dashboard");
  });

  it("is idempotent: calling repeatedly with same state never oscillates", () => {
    const c = ctx({ pathname: "/anamnesis", journeyStatus: "anamnesis", hasConsent: false });
    const d1 = getSystemDecision(c);
    const d2 = getSystemDecision({ ...c, pathname: d1.target! });
    const d3 = getSystemDecision({ ...c, pathname: d2.type === "REDIRECT" ? d2.target! : c.pathname });
    expect(d1.target).toBe("/consent");
    expect(d2.type).toBe("ALLOW");
    expect(d3.type).toBe("ALLOW");
  });
});
