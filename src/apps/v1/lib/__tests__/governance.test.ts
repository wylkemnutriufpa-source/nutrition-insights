/**
 * Critical tests for the Governance Engine (getSystemDecision).
 * Ensures the central decision motor never produces unexpected behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getSystemDecision,
  logDecision,
  type GovernanceContext,
  type SystemDecision,
} from "../governance";

// Helper: build a baseline context with sane defaults; tests override fields.
function ctx(overrides: Partial<GovernanceContext> = {}): GovernanceContext {
  return {
    pathname: "/",
    user: { id: "user-1" },
    profile: { id: "user-1" },
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

describe("Governance Engine — getSystemDecision", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // ── 1. SCENARIO TESTS ──────────────────────────────────────────────
  describe("Cenários principais", () => {
    it("paciente sem vínculo (orphan profile) → redireciona para /settings", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/my-diet",
          profile: { id: "u", is_orphan: true },
        }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/settings");
      expect(decision.reason).toMatch(/orphan/i);
    });

    it("paciente onboarding_active → redireciona para /onboarding", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/my-diet",
          journeyStatus: "onboarding_active",
        }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/onboarding");
    });

    it("paciente onboarding_active acessando /anamnesis → ALLOW (override)", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/anamnesis",
          journeyStatus: "onboarding_active",
        }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("paciente ativo acessando dashboard → ALLOW", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/", journeyStatus: "active" }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("usuário pro acessando workspace profissional → ALLOW", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/patients",
          role: "professional",
          isNutritionist: true,
        }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("paciente puro tentando rota profissional → REDIRECT para /", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/patients", role: "patient" }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/");
    });

    it("usuário híbrido em contexto de paciente acessando rota pro → REDIRECT", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/patients",
          role: "professional",
          isNutritionist: true,
          isHybrid: true,
          isPatientContext: true,
          isProfessionalContext: false,
        }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.reason).toMatch(/patient context/i);
    });

    it("usuário híbrido em contexto profissional acessando rota de paciente → REDIRECT", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/my-diet",
          role: "professional",
          isNutritionist: true,
          isHybrid: true,
          isPatientContext: false,
          isProfessionalContext: true,
        }),
      );
      expect(decision.type).toBe("REDIRECT");
    });
  });

  // ── 2. EDGE CASES ──────────────────────────────────────────────────
  describe("Casos de borda", () => {
    it("usuário não autenticado em rota privada → REDIRECT para /auth", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/my-diet", user: null, profile: null }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/auth");
    });

    it("usuário não autenticado em rota pública → ALLOW", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/landing", user: null, profile: null }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("rota universal sem usuário não força auth", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/", user: null, profile: null }),
      );
      // Universal routes bypass the auth guard; still resolves to ALLOW
      expect(decision.type).toBe("ALLOW");
    });

    it("journey_status indefinido (null) → não bloqueia paciente em rota universal", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/", journeyStatus: null }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("journey_status indefinido em rota de paciente → ALLOW (não onboarding)", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/my-diet", journeyStatus: null }),
      );
      // Sem status de onboarding, paciente puro pode acessar sua rota
      expect(decision.type).toBe("ALLOW");
    });

    it("modo degradado ativo → BLOCK redirecionando ao diagnóstico", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/", isDegraded: true }),
      );
      expect(decision.type).toBe("BLOCK");
      expect(decision.target).toBe("/diagnostic");
    });

    it("modo degradado em /auth → não bloqueia (permite recuperação)", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/auth", isDegraded: true }),
      );
      expect(decision.type).not.toBe("BLOCK");
    });

    it("versão desatualizada (versionMismatch) → RELOAD", () => {
      const decision = getSystemDecision(
        ctx({ versionMismatch: true, isReady: true }),
      );
      expect(decision.type).toBe("RELOAD");
    });

    it("versionMismatch mas sistema não pronto → não força reload", () => {
      const decision = getSystemDecision(
        ctx({ versionMismatch: true, isReady: false }),
      );
      expect(decision.type).not.toBe("RELOAD");
    });

    it("não-admin tentando rota admin → REDIRECT", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/admin",
          role: "professional",
          isNutritionist: true,
          isAdmin: false,
        }),
      );
      expect(decision.type).toBe("REDIRECT");
      expect(decision.target).toBe("/");
    });

    it("admin acessando rota admin → ALLOW", () => {
      const decision = getSystemDecision(
        ctx({
          pathname: "/admin",
          role: "professional",
          isAdmin: true,
        }),
      );
      expect(decision.type).toBe("ALLOW");
    });

    it("membership inconsistente (profile vazio) ainda retorna decisão segura", () => {
      const decision = getSystemDecision(
        ctx({ profile: null, pathname: "/" }),
      );
      // Não deve lançar; deve retornar ALLOW na rota universal
      expect(decision).toBeDefined();
      expect(["ALLOW", "REDIRECT", "BLOCK", "RELOAD"]).toContain(decision.type);
    });

    it("tenant_id null não causa exceção", () => {
      expect(() =>
        getSystemDecision(
          ctx({ profile: { id: "u", tenant_id: null } }),
        ),
      ).not.toThrow();
    });
  });

  // ── 3. LOG VALIDATION ──────────────────────────────────────────────
  describe("Validação de logs", () => {
    it("logDecision emite o prefixo padronizado [FJ:SystemDecision]", () => {
      const decision: SystemDecision = {
        type: "ALLOW",
        reason: "test reason",
      };
      logDecision(decision);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const firstArg = String(logSpy.mock.calls[0][0]);
      expect(firstArg).toContain("[FJ:SystemDecision]");
      expect(firstArg).toContain("[ALLOW]");
      expect(firstArg).toContain("test reason");
    });

    it("logDecision inclui metadados quando presentes", () => {
      logDecision({
        type: "REDIRECT",
        target: "/auth",
        reason: "Unauthorized",
        metadata: { foo: "bar" },
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("[FJ:SystemDecision]"),
        expect.objectContaining({ foo: "bar" }),
      );
    });
  });

  // ── 4. SAFE FALLBACK ──────────────────────────────────────────────
  describe("Fallback seguro", () => {
    it("se nenhuma regra específica bater → ALLOW (default seguro)", () => {
      const decision = getSystemDecision(
        ctx({ pathname: "/notifications" }),
      );
      expect(decision.type).toBe("ALLOW");
      expect(decision.reason).toMatch(/rule chain completed|allow/i);
    });

    it("nunca retorna undefined / sempre retorna SystemDecision válido", () => {
      const scenarios: Partial<GovernanceContext>[] = [
        {},
        { user: null, profile: null, pathname: "/" },
        { isDegraded: true },
        { versionMismatch: true },
        { pathname: "/admin", isAdmin: true },
        { role: "professional", isNutritionist: true, pathname: "/patients" },
        { journeyStatus: "onboarding_active", pathname: "/onboarding" },
        { isHybrid: true, isPatientContext: true, pathname: "/" },
      ];
      for (const s of scenarios) {
        const d = getSystemDecision(ctx(s));
        expect(d).toBeDefined();
        expect(typeof d.type).toBe("string");
        expect(typeof d.reason).toBe("string");
        expect(["ALLOW", "REDIRECT", "BLOCK", "RELOAD"]).toContain(d.type);
      }
    });

    it("contexto totalmente vazio não lança exceção", () => {
      const empty = {
        pathname: "/",
        user: null,
        profile: null,
        journeyStatus: null,
        mode: "",
        role: "patient" as const,
        isReady: false,
        isDegraded: false,
      } as GovernanceContext;
      expect(() => getSystemDecision(empty)).not.toThrow();
    });
  });
});
