/**
 * FitJourney — Critical Contracts: testes obrigatórios
 *
 * Cobre os 5 testes do Freeze Inteligente:
 *   1. Paciente vê plano publicado seu
 *   2. Paciente NÃO vê plano de outro paciente
 *   3. Plano publicado continua visível após update
 *   4. Geração retorna mínimo válido
 *   5. Persistência: salvo no front == salvo no banco
 */

import { describe, expect, it } from "vitest";
import {
  patientAccessContract,
  planGenerationContract,
  publicationContract,
  persistenceContract,
} from "@/lib/criticalContracts";
import { detectRegression } from "@/lib/regressionGuardRuntime";
import { assertContract, ContractViolationError } from "@/lib/contractGuards";

describe("Critical Contracts — Freeze Inteligente", () => {
  describe("1. Acesso do Paciente", () => {
    it("paciente vê seu próprio plano publicado no seu tenant", () => {
      const r = patientAccessContract({
        requestingPatientId: "p1",
        requestingTenantId: "t1",
        returnedPlans: [{ id: "plan1", patient_id: "p1", tenant_id: "t1", plan_status: "published_to_patient" }],
        route: "/my-diet",
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita plano de outro paciente (vazamento user_id)", () => {
      const r = patientAccessContract({
        requestingPatientId: "p1",
        requestingTenantId: "t1",
        returnedPlans: [{ id: "planX", patient_id: "p2", tenant_id: "t1", plan_status: "published" }],
        route: "/my-diet",
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/pertence a outro paciente/);
    });

    it("rejeita plano de outro tenant (vazamento tenant_id)", () => {
      const r = patientAccessContract({
        requestingPatientId: "p1",
        requestingTenantId: "t1",
        returnedPlans: [{ id: "planX", patient_id: "p1", tenant_id: "t2", plan_status: "published" }],
        route: "/my-diet",
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/Vazamento de Tenant/);
    });

    it("rejeita plano não publicado retornado para paciente", () => {
      const r = patientAccessContract({
        requestingPatientId: "p1",
        requestingTenantId: "t1",
        returnedPlans: [{ id: "draft1", patient_id: "p1", tenant_id: "t1", plan_status: "draft" }],
        route: "/my-diet",
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/não está publicado/);
    });
  });

  describe("2. Geração de Planos", () => {
    it("aceita geração válida", () => {
      const r = planGenerationContract({
        planType: "normal",
        generatedItems: [
          { title: "Café", meal_type: "breakfast", plan_type: "normal", calories_target: 400, protein_target: 25 },
        ],
        totalKcal: 1800,
        totalProtein: 130,
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita geração vazia", () => {
      const r = planGenerationContract({ planType: "normal", generatedItems: [] });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/vazio/);
    });

    it("rejeita mistura de plan_type", () => {
      const r = planGenerationContract({
        planType: "normal",
        generatedItems: [{ title: "Marmita", plan_type: "marmita" }],
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/plan_type/);
    });

    it("rejeita item sem título", () => {
      const r = planGenerationContract({
        planType: "normal",
        generatedItems: [{ title: "", meal_type: "lunch" }],
      });
      expect(r.ok).toBe(false);
    });

    it("rejeita macros zeradas em totais", () => {
      const r = planGenerationContract({
        planType: "normal",
        generatedItems: [{ title: "X" }],
        totalKcal: 0,
        totalProtein: 0,
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("3. Publicação", () => {
    it("aceita publicação saudável", () => {
      const r = publicationContract({
        planId: "p",
        beforeStatus: "approved",
        afterStatus: "published_to_patient",
        beforeItemCount: 21,
        afterItemCount: 21,
        isVisibleToPatient: true,
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita perda de itens em plano publicado", () => {
      const r = publicationContract({
        planId: "p",
        beforeStatus: "published",
        afterStatus: "published",
        beforeItemCount: 21,
        afterItemCount: 14,
        isVisibleToPatient: true,
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/perdeu/);
    });

    it("rejeita plano publicado invisível ao paciente", () => {
      const r = publicationContract({
        planId: "p",
        beforeStatus: "approved",
        afterStatus: "published_to_patient",
        beforeItemCount: 21,
        afterItemCount: 21,
        isVisibleToPatient: false,
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/invisível/);
    });
  });

  describe("4. Persistência", () => {
    it("aceita quando frontend == banco", () => {
      const r = persistenceContract({
        expected: [{ title: "Frango", grams: 100 }],
        persisted: [{ title: "Frango", grams: 100 }],
        keysToCompare: ["title", "grams"],
      });
      expect(r.ok).toBe(true);
    });

    it("rejeita mutação silenciosa", () => {
      const r = persistenceContract({
        expected: [{ title: "Frango", grams: 100 }],
        persisted: [{ title: "Frango", grams: 80 }],
        keysToCompare: ["title", "grams"],
      });
      expect(r.ok).toBe(false);
      expect(r.violations.join(" ")).toMatch(/grams/);
    });

    it("rejeita contagem divergente", () => {
      const r = persistenceContract({
        expected: [{ title: "A" }, { title: "B" }],
        persisted: [{ title: "A" }],
        keysToCompare: ["title"],
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("5. Regression Guard Runtime", () => {
    const base = {
      planId: "p1",
      status: "published_to_patient",
      itemCount: 21,
      totalKcal: 1800,
      totalProtein: 130,
      visibleToPatient: true,
    };

    it("não detecta regressão quando nada muda", () => {
      expect(detectRegression(base, base).detected).toBe(false);
    });

    it("detecta perda total de itens", () => {
      const d = detectRegression(base, { ...base, itemCount: 0 });
      expect(d.detected).toBe(true);
      expect(d.reasons.join(" ")).toMatch(/perdeu/);
    });

    it("detecta plano que ficou invisível", () => {
      const d = detectRegression(base, { ...base, visibleToPatient: false });
      expect(d.detected).toBe(true);
      expect(d.reasons.join(" ")).toMatch(/invisível/);
    });

    it("detecta macros zeradas", () => {
      const d = detectRegression(base, { ...base, totalKcal: 0 });
      expect(d.detected).toBe(true);
      expect(d.reasons.join(" ")).toMatch(/Calorias/);
    });

    it("permite arquivamento explícito", () => {
      const d = detectRegression(base, { ...base, status: "archived" });
      expect(d.detected).toBe(false);
    });
  });

  describe("6. assertContract — bloqueio efetivo", () => {
    it("lança ContractViolationError quando contrato é violado (Vazamento de ID)", () => {
      expect(() =>
        assertContract("patient_access", {
          requestingPatientId: "p1",
          requestingTenantId: "t1",
          returnedPlans: [{ id: "x", patient_id: "p2", tenant_id: "t1", plan_status: "published" }],
          route: "/my-diet",
        }),
      ).toThrow(ContractViolationError);
    });

    it("lança ContractViolationError quando contrato é violado (Vazamento de Tenant)", () => {
      expect(() =>
        assertContract("patient_access", {
          requestingPatientId: "p1",
          requestingTenantId: "t1",
          returnedPlans: [{ id: "x", patient_id: "p1", tenant_id: "t2", plan_status: "published" }],
          route: "/my-diet",
        }),
      ).toThrow(ContractViolationError);
    });

    it("não lança quando contrato é respeitado", () => {
      expect(() =>
        assertContract("patient_access", {
          requestingPatientId: "p1",
          requestingTenantId: "t1",
          returnedPlans: [{ id: "x", patient_id: "p1", tenant_id: "t1", plan_status: "published_to_patient" }],
          route: "/my-diet",
        }),
      ).not.toThrow();
    });
  });
});
