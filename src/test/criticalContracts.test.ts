/**
 * FitJourney — Anti-Cascade Architecture: testes obrigatórios
 *
 * Cobre os 4 contratos da Arquitetura Anti-Cascata:
 *   1. DRAFT INTEGRITY (Integridade de Rascunho)
 *   2. CLINICAL VALIDITY (Validade Clínica)
 *   3. PERSISTENCE SAFETY (Segurança de Persistência)
 *   4. UI CONSISTENCY (Consistência de UI/Sincronia)
 */

import { describe, expect, it } from "vitest";
import {
  draftIntegrityContract,
  clinicalValidityContract,
  persistenceSafetyContract,
  uiConsistencyContract,
} from "@/lib/criticalContracts";
import { assertContract, ContractViolationError } from "@/lib/contractGuards";

describe("Anti-Cascade Architecture — Editor V3", () => {
  describe("1. Draft Integrity", () => {
    it("aceita rascunho com itens e ID", () => {
      const r = draftIntegrityContract({
        draftId: "d1",
        items: [{ id: 1 }],
        lastSavedAt: Date.now(),
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita rascunho sem ID", () => {
      const r = draftIntegrityContract({
        draftId: "",
        items: [{ id: 1 }],
        lastSavedAt: Date.now(),
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/ID ausente/);
    });

    it("rejeita rascunho sem itens", () => {
      const r = draftIntegrityContract({
        draftId: "d1",
        items: [],
        lastSavedAt: Date.now(),
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/sem itens/);
    });
  });

  describe("2. Clinical Validity", () => {
    it("aceita plano com macros positivas", () => {
      const r = clinicalValidityContract({
        kcal: 2000,
        protein: 150,
        patientRestrictions: [],
        items: [{ title: "Item" }],
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita macros zeradas (Bloqueio Anti-Cascata)", () => {
      const r = clinicalValidityContract({
        kcal: 0,
        protein: 0,
        patientRestrictions: [],
        items: [],
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Kcal inválida/);
    });
  });

  describe("3. Persistence Safety", () => {
    it("aceita quando local == remoto", () => {
      const data = { title: "Teste", value: 100 };
      const r = persistenceSafetyContract({
        local: data,
        remote: data,
        fields: ["title", "value"],
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita divergência entre local e remoto", () => {
      const r = persistenceSafetyContract({
        local: { title: "A" },
        remote: { title: "B" },
        fields: ["title"],
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Divergência/);
    });
  });

  describe("4. UI Consistency", () => {
    it("aceita quando UI e DB estão em sincronia", () => {
      const r = uiConsistencyContract({
        dbStatus: "active",
        uiStatus: "active",
        anamnesisCompleted: true,
      });
      expect(r.ok).toBe(true);
    });

    it("detecta desync entre UI e DB", () => {
      const r = uiConsistencyContract({
        dbStatus: "active",
        uiStatus: "onboarding_active",
        anamnesisCompleted: true,
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Desync/);
    });

    it("rejeita quando anamnese está completa mas status trava em onboarding (Inconsistência)", () => {
      const r = uiConsistencyContract({
        dbStatus: "onboarding_active",
        uiStatus: null,
        anamnesisCompleted: true,
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Inconsistência/);
    });
  });

  describe("5. assertContract — Bloqueio Rigoroso", () => {
    it("lança erro fatal em caso de violação de rascunho", () => {
      expect(() =>
        assertContract("draft_integrity", {
          draftId: "",
          items: [],
          lastSavedAt: 0,
        }),
      ).toThrow(ContractViolationError);
    });

    it("não lança quando contrato é respeitado", () => {
      expect(() =>
        assertContract("clinical_validity", {
          kcal: 1800,
          protein: 100,
          patientRestrictions: [],
          items: [{}],
        }),
      ).not.toThrow();
    });
  });
});
