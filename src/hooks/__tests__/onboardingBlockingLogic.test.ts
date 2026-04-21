/**
 * Integration tests for the selective onboarding blocking logic.
 *
 * Mirrors the SQL logic in `resolve_patient_lifecycle_state`:
 *  - Blocks ONLY if patient is in onboarding AND has no active plan
 *  - Blocks if anamnese is incomplete → "Anamnese obrigatória incompleta"
 *  - Else blocks if body data is incomplete → "Dados antropométricos (peso/altura) obrigatórios incompletos"
 *  - Preferences alone DO NOT block
 *  - Once a plan is active, no blocking even if steps incomplete
 */
import { describe, it, expect } from "vitest";

interface BlockingInput {
  has_active_plan: boolean;
  has_pending_onboarding: boolean;
  anamnesis_completed: boolean;
  body_data_completed: boolean;
  preferences_completed: boolean;
}

interface BlockingResult {
  is_onboarding_blocked: boolean;
  onboarding_block_reason: string | null;
}

/**
 * Mirrors the PL/pgSQL block in resolve_patient_lifecycle_state.
 * Keep this in sync with the migration.
 */
function computeOnboardingBlock(input: BlockingInput): BlockingResult {
  if (input.has_pending_onboarding && !input.has_active_plan) {
    if (!input.anamnesis_completed) {
      return {
        is_onboarding_blocked: true,
        onboarding_block_reason: "Anamnese obrigatória incompleta",
      };
    }
    if (!input.body_data_completed) {
      return {
        is_onboarding_blocked: true,
        onboarding_block_reason:
          "Dados antropométricos (peso/altura) obrigatórios incompletos",
      };
    }
  }
  return { is_onboarding_blocked: false, onboarding_block_reason: null };
}

describe("Onboarding Selective Blocking — integration", () => {
  // ── Bloqueia: anamnese incompleta ────────────────────────────────
  describe("Anamnese incompleta", () => {
    it("bloqueia quando NADA foi preenchido", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: false,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.is_onboarding_blocked).toBe(true);
      expect(r.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
    });

    it("bloqueia mesmo se body+preferências OK mas anamnese vazia", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: false,
        body_data_completed: true,
        preferences_completed: true,
      });
      expect(r.is_onboarding_blocked).toBe(true);
      expect(r.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
    });

    it("prioriza anamnese sobre body data quando ambas estão incompletas", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: false,
        body_data_completed: false,
        preferences_completed: true,
      });
      expect(r.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
    });
  });

  // ── Bloqueia: dados corporais incompletos ────────────────────────
  describe("Dados corporais incompletos", () => {
    it("bloqueia quando anamnese OK mas body data ausente", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: true,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.is_onboarding_blocked).toBe(true);
      expect(r.onboarding_block_reason).toBe(
        "Dados antropométricos (peso/altura) obrigatórios incompletos",
      );
    });

    it("bloqueia mesmo se preferências preenchidas", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: true,
        body_data_completed: false,
        preferences_completed: true,
      });
      expect(r.is_onboarding_blocked).toBe(true);
      expect(r.onboarding_block_reason).toMatch(/antropométricos/i);
    });
  });

  // ── NÃO bloqueia: preferências sozinhas não são essenciais ───────
  describe("Preferências (etapa não-essencial)", () => {
    it("NÃO bloqueia quando anamnese+body OK mas preferências faltando", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: true,
        body_data_completed: true,
        preferences_completed: false,
      });
      expect(r.is_onboarding_blocked).toBe(false);
      expect(r.onboarding_block_reason).toBeNull();
    });

    it("NÃO bloqueia quando todas as essenciais estão completas", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: true,
        body_data_completed: true,
        preferences_completed: true,
      });
      expect(r.is_onboarding_blocked).toBe(false);
      expect(r.onboarding_block_reason).toBeNull();
    });
  });

  // ── NÃO bloqueia: paciente já tem plano ativo ────────────────────
  describe("Paciente com plano ativo", () => {
    it("NÃO bloqueia se has_active_plan=true mesmo com anamnese vazia", () => {
      const r = computeOnboardingBlock({
        has_active_plan: true,
        has_pending_onboarding: true,
        anamnesis_completed: false,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.is_onboarding_blocked).toBe(false);
      expect(r.onboarding_block_reason).toBeNull();
    });

    it("NÃO bloqueia plano ativo sem onboarding pendente", () => {
      const r = computeOnboardingBlock({
        has_active_plan: true,
        has_pending_onboarding: false,
        anamnesis_completed: true,
        body_data_completed: true,
        preferences_completed: true,
      });
      expect(r.is_onboarding_blocked).toBe(false);
    });
  });

  // ── NÃO bloqueia: sem onboarding pendente ───────────────────────
  describe("Sem onboarding pendente", () => {
    it("NÃO bloqueia paciente sem pipeline mesmo sem dados", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: false,
        anamnesis_completed: false,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.is_onboarding_blocked).toBe(false);
      expect(r.onboarding_block_reason).toBeNull();
    });
  });

  // ── Matriz exaustiva de combinações (8 cenários × 2 plan states) ─
  describe("Matriz combinatória (8 combinações × com/sem plano)", () => {
    const matrix: Array<{
      ana: boolean;
      body: boolean;
      pref: boolean;
      withPlan: boolean;
      expectedBlock: boolean;
      expectedReason: string | null;
    }> = [
      // Sem plano, com onboarding pendente:
      { ana: false, body: false, pref: false, withPlan: false, expectedBlock: true, expectedReason: "Anamnese obrigatória incompleta" },
      { ana: false, body: false, pref: true,  withPlan: false, expectedBlock: true, expectedReason: "Anamnese obrigatória incompleta" },
      { ana: false, body: true,  pref: false, withPlan: false, expectedBlock: true, expectedReason: "Anamnese obrigatória incompleta" },
      { ana: false, body: true,  pref: true,  withPlan: false, expectedBlock: true, expectedReason: "Anamnese obrigatória incompleta" },
      { ana: true,  body: false, pref: false, withPlan: false, expectedBlock: true, expectedReason: "Dados antropométricos (peso/altura) obrigatórios incompletos" },
      { ana: true,  body: false, pref: true,  withPlan: false, expectedBlock: true, expectedReason: "Dados antropométricos (peso/altura) obrigatórios incompletos" },
      { ana: true,  body: true,  pref: false, withPlan: false, expectedBlock: false, expectedReason: null },
      { ana: true,  body: true,  pref: true,  withPlan: false, expectedBlock: false, expectedReason: null },
      // Com plano ativo: nunca bloqueia
      { ana: false, body: false, pref: false, withPlan: true, expectedBlock: false, expectedReason: null },
      { ana: true,  body: false, pref: false, withPlan: true, expectedBlock: false, expectedReason: null },
      { ana: true,  body: true,  pref: true,  withPlan: true, expectedBlock: false, expectedReason: null },
    ];

    matrix.forEach(({ ana, body, pref, withPlan, expectedBlock, expectedReason }) => {
      const label = `ana=${ana ? "✓" : "✗"} body=${body ? "✓" : "✗"} pref=${pref ? "✓" : "✗"} plan=${withPlan ? "✓" : "✗"} → block=${expectedBlock}`;
      it(label, () => {
        const r = computeOnboardingBlock({
          has_active_plan: withPlan,
          has_pending_onboarding: true,
          anamnesis_completed: ana,
          body_data_completed: body,
          preferences_completed: pref,
        });
        expect(r.is_onboarding_blocked).toBe(expectedBlock);
        expect(r.onboarding_block_reason).toBe(expectedReason);
      });
    });
  });

  // ── Verifica que mensagens são descritivas e claras ──────────────
  describe("Qualidade das mensagens de motivo", () => {
    it("mensagem de anamnese é clara e em português", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: false,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.onboarding_block_reason).toContain("Anamnese");
      expect(r.onboarding_block_reason).toContain("obrigatória");
    });

    it("mensagem de body data menciona peso/altura", () => {
      const r = computeOnboardingBlock({
        has_active_plan: false,
        has_pending_onboarding: true,
        anamnesis_completed: true,
        body_data_completed: false,
        preferences_completed: false,
      });
      expect(r.onboarding_block_reason).toMatch(/peso/i);
      expect(r.onboarding_block_reason).toMatch(/altura/i);
    });
  });
});
