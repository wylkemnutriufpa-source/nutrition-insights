/**
 * Testes unitários — Pipeline Orchestrator (lógica pura, sem DB)
 */
import { describe, it, expect } from "vitest";
import { isItemProtected, PIPELINE_VERSION, SUBSTITUTION_RULES } from "../planPipelineOrchestrator";

describe("isItemProtected", () => {
  it("retorna true para item locked", () => {
    expect(isItemProtected({ is_locked: true, is_manually_edited: false })).toBe(true);
  });

  it("retorna true para item manualmente editado", () => {
    expect(isItemProtected({ is_locked: false, is_manually_edited: true })).toBe(true);
  });

  it("retorna false para item sem proteção", () => {
    expect(isItemProtected({ is_locked: false, is_manually_edited: false })).toBe(false);
  });

  it("retorna false para item sem flags", () => {
    expect(isItemProtected({})).toBe(false);
  });
});

describe("PIPELINE_VERSION", () => {
  it("versão está definida e segue semver", () => {
    expect(PIPELINE_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});

describe("SUBSTITUTION_RULES", () => {
  it("substituições não modificam plano oficial", () => {
    expect(SUBSTITUTION_RULES.modifiesOfficialPlan).toBe(false);
  });

  it("tolerância padrão é 10%", () => {
    expect(SUBSTITUTION_RULES.defaultTolerancePercent).toBe(10);
  });

  it("máximo de 3 substituições por dia", () => {
    expect(SUBSTITUTION_RULES.maxSubstitutionsPerDay).toBe(3);
  });
});
