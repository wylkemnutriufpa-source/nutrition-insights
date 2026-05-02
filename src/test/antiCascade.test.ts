/**
 * FitJourney — Anti-Cascade Architecture: testes obrigatórios
 *
 * Cobre os 5 contratos da Arquitetura Anti-Cascata:
 *   1. DRAFT INTEGRITY
 *   2. CLINICAL VALIDITY
 *   3. ENGINE DETERMINISM
 *   4. PERSISTENCE SAFETY
 *   5. UI CONSISTENCY
 */

import { describe, expect, it } from "vitest";
import {
  draftIntegrityContract,
  clinicalValidityContract,
  engineDeterminismContract,
  persistenceSafetyContract,
  uiConsistencyContract,
} from "@/lib/criticalContracts";
import { assertContract, ContractViolationError } from "@/lib/contractGuards";

describe("Anti-Cascade Architecture — Editor V3", () => {
  describe("1. Draft Integrity", () => {
    it("aceita rascunho com ID, meals e items únicos", () => {
      const r = draftIntegrityContract({
        draftId: "d1",
        meals: [{}],
        items: [{ instanceId: "i1" }],
        locked: true
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita meals null", () => {
      const r = draftIntegrityContract({
        draftId: "d1",
        meals: null as any,
        items: [],
        locked: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/meals nunca pode ser null/);
    });

    it("rejeita items com instanceId duplicado", () => {
      const r = draftIntegrityContract({
        draftId: "d1",
        meals: [],
        items: [{ instanceId: "dup" }, { instanceId: "dup" }],
        locked: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/instanceId duplicado/);
    });
  });

  describe("2. Clinical Validity", () => {
    it("aceita plano válido", () => {
      const r = clinicalValidityContract({
        kcal: 2000,
        protein: 150,
        patientRestrictions: [],
        isValid: true
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita plano marcado como inválido", () => {
      const r = clinicalValidityContract({
        kcal: 2000,
        protein: 150,
        patientRestrictions: [],
        isValid: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Plano clínico inválido detectado/);
    });
  });

  describe("3. Engine Determinism", () => {
    it("rejeita engine que gera 0 refeições", () => {
      const r = engineDeterminismContract({
        action: "generate",
        mealCount: 0,
        hasManualOverrides: false,
        overrideConfirmed: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Engine gerou 0 refeições/);
    });

    it("rejeita sobrescrever manual sem confirmação", () => {
      const r = engineDeterminismContract({
        action: "generate",
        mealCount: 5,
        hasManualOverrides: true,
        overrideConfirmed: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/sobrescrever manual sem confirmação/);
    });
  });

  describe("4. Persistence Safety", () => {
    it("rejeita salvar sem persistência prévia", () => {
      const r = persistenceSafetyContract({
        local: {},
        remote: {},
        isSaving: true,
        draftPersistedBeforeAction: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Draft deve ser persistido antes/);
    });
  });

  describe("5. UI Consistency", () => {
    it("rejeita desync invisível", () => {
      const r = uiConsistencyContract({
        dbStatus: "A",
        uiStatus: "B",
        errorVisible: false,
        hasInvisibleState: false
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/NÃO está visível/);
    });

    it("rejeita estado invisível", () => {
      const r = uiConsistencyContract({
        dbStatus: "A",
        uiStatus: "A",
        errorVisible: false,
        hasInvisibleState: true
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Estado invisível detectado/);
    });
  });
});