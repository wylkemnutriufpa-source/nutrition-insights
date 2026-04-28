/**
 * Advanced Chaos & Resilience Tests for the Governance Engine.
 * Implements Fuzzing, Priority checking, State Transitions, and Route Robustness.
 */
import { describe, it, expect } from "vitest";
import {
  getSystemDecision,
  type GovernanceContext,
  type SystemDecisionType,
} from "../governance";

// Helper: build a baseline context
function ctx(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    pathname: "/",
    user: { id: "u1" },
    profile: { id: "u1" },
    journeyStatus: "active",
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

describe("Governance Engine — Chaos & Resilience", () => {
  
  // ── ETAPA 1: FUZZ TEST (COMBINAÇÕES AUTOMÁTICAS) ───────────────────
  describe("Fuzz Test: Combinatorial state space", () => {
    it("sempre retorna SystemDecision válido sob 100+ combinações", () => {
      const journeyStatuses = [null, "onboarding_active", "active", "lead_created", "invalid_status"];
      const isReadies = [true, false];
      const isDegradeds = [true, false];
      const roles: ("patient" | "professional")[] = ["patient", "professional"];
      const hybridStates = [true, false];
      const versionMismatches = [true, false];
      const pathnames = ["/", "/my-diet", "/patients", "/onboarding", "/auth", "/admin", "/unknown-route"];

      let count = 0;
      for (const journeyStatus of journeyStatuses) {
        for (const isReady of isReadies) {
          for (const isDegraded of isDegradeds) {
            for (const role of roles) {
              for (const isHybrid of hybridStates) {
                for (const versionMismatch of versionMismatches) {
                  for (const pathname of pathnames) {
                    const testCtx: GovernanceContext = {
                      pathname,
                      user: { id: "u" },
                      profile: { id: "u" },
                      journeyStatus: journeyStatus as any,
                      mode: "basic",
                      role,
                      isReady,
                      isDegraded,
                      isHybrid,
                      isPatientContext: isHybrid && role === "patient",
                      isProfessionalContext: isHybrid && role === "professional",
                      isNutritionist: role === "professional",
                      isPersonal: false,
                      isAdmin: false,
                      versionMismatch,
                    };

                    const decision = getSystemDecision(testCtx);
                    
                    expect(decision, `Failed on combination ${JSON.stringify(testCtx)}`).toBeDefined();
                    expect(["ALLOW", "REDIRECT", "BLOCK", "RELOAD"]).toContain(decision.type);
                    expect(typeof decision.reason).toBe("string");
                    if (decision.type === "REDIRECT" || decision.type === "BLOCK") {
                      expect(typeof decision.target).toBe("string");
                    }
                    count++;
                  }
                }
              }
            }
          }
        }
      }
      console.log(`[FJ:FuzzTest] Validated ${count} combinations.`);
      expect(count).toBeGreaterThan(100);
    });
  });

  // ── ETAPA 2: RANDOM ROUTES TEST ────────────────────────────────────
  describe("Random Routes & Malformed Input", () => {
    it("lida com strings de rota inválidas/extravagantes", () => {
      const weirdRoutes = [
        "",
        "//double-slash",
        "/../../etc/passwd",
        "/patients/%20/edit",
        "/<script>alert(1)</script>",
        "UNDEFINED",
        "https://evil.com/logout",
      ];

      for (const pathname of weirdRoutes) {
        const decision = getSystemDecision(ctx({ pathname }));
        expect(decision).toBeDefined();
        // Should either REDIRECT to / or allow it to fail at page level, but not crash the engine
        expect(["ALLOW", "REDIRECT", "BLOCK", "RELOAD"]).toContain(decision.type);
      }
    });

    it("lida com campos de contexto malformados (nulls inesperados)", () => {
      const brokenCtx = {
        pathname: null as any,
        user: undefined as any,
        profile: {} as any,
        role: "invalid" as any,
      } as GovernanceContext;

      expect(() => getSystemDecision(brokenCtx)).not.toThrow();
    });
  });

  // ── ETAPA 3: STATE TRANSITION TEST ─────────────────────────────────
  describe("State Transition Simulation", () => {
    it("mantém decisões consistentes durante transição assíncrona de estado", () => {
      // 1. Loading inicial
      let state = ctx({ user: null, profile: null, isReady: false, journeyStatus: null });
      expect(getSystemDecision(state).type).toBe("ALLOW"); // Universal route / allow

      // 2. User carregado mas profile/tenant ainda não (IsReady false)
      state = { ...state, user: { id: "u" } };
      // Se pathname é /, allow. Se fosse privada, redirect para login (auth guard)
      expect(getSystemDecision({ ...state, pathname: "/patients" }).type).toBe("REDIRECT");

      // 3. Profile carregado (orphan)
      state = { ...state, profile: { id: "u", is_orphan: true } };
      expect(getSystemDecision({ ...state, pathname: "/my-diet" }).target).toBe("/settings");

      // 4. Journey status definido como onboarding
      state = { ...state, profile: { id: "u" }, journeyStatus: "onboarding_active" };
      expect(getSystemDecision({ ...state, pathname: "/my-diet" }).target).toBe("/onboarding");

      // 5. Pronto (Ready)
      state = { ...state, isReady: true };
      expect(getSystemDecision({ ...state, pathname: "/onboarding" }).type).toBe("ALLOW");
    });
  });

  // ── ETAPA 4: PRIORITY TEST ─────────────────────────────────────────
  describe("Priority Matrix: Rules hierarchy", () => {
    it("regrado de versão (versionMismatch) vence tudo (vence degraded, auth, etc)", () => {
      const conflictCtx = ctx({
        versionMismatch: true,
        isDegraded: true,
        user: null, // should redirect auth
        pathname: "/my-diet"
      });
      const decision = getSystemDecision(conflictCtx);
      expect(decision.type).toBe("RELOAD");
      expect(decision.reason).toMatch(/version/i);
    });

    it("modo degradado vence auth e rotas normais", () => {
      const conflictCtx = ctx({
        isDegraded: true,
        user: null,
        pathname: "/my-diet"
      });
      const decision = getSystemDecision(conflictCtx);
      expect(decision.type).toBe("BLOCK");
      expect(decision.target).toBe("/diagnostic");
    });

    it("auth vence vínculo (orphan)", () => {
      const conflictCtx = ctx({
        user: null,
        profile: { is_orphan: true },
        pathname: "/my-diet"
      });
      const decision = getSystemDecision(conflictCtx);
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/auth");
    });

    it("vínculo (orphan) vence onboarding", () => {
      const conflictCtx = ctx({
        profile: { is_orphan: true },
        journeyStatus: "onboarding_active",
        pathname: "/my-diet"
      });
      const decision = getSystemDecision(conflictCtx);
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/settings"); // Orphan priority
    });

    it("onboarding vence acesso a rotas de papel (role)", () => {
      const conflictCtx = ctx({
        journeyStatus: "onboarding_active",
        role: "patient",
        pathname: "/my-diet"
      });
      const decision = getSystemDecision(conflictCtx);
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/onboarding");
    });
  });
});
