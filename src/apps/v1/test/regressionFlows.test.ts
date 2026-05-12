/**
 * FitJourney — Regression Tests: End-to-End Flow Contracts
 * BLOCO 4 — Testes de regressão para fluxos sensíveis
 */
import { describe, it, expect } from "vitest";
import { CRITICAL_FLOWS, getFlow, getDependentFlows } from "@v1/lib/criticalFlows";

describe("Regression: Flow Chain Integrity", () => {
  describe("Chain: Anamnese → Flags → Tarefas → Mensagens", () => {
    it("anamnesis flow exists and has correct tables", () => {
      const flow = getFlow("anamnesis");
      expect(flow).toBeDefined();
      expect(flow!.tables).toContain("patient_anamnesis");
    });

    it("clinical_flags depends on anamnesis", () => {
      const flow = getFlow("clinical_flags");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("anamnesis");
      expect(flow!.tables).toContain("patient_clinical_flags");
      expect(flow!.edgeFunctions).toContain("process-anamnesis-flags");
    });

    it("behavioral_tasks depends on clinical_flags", () => {
      const flow = getFlow("behavioral_tasks");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("clinical_flags");
      expect(flow!.tables).toContain("patient_behavioral_tasks");
    });

    it("clinical_messages depends on clinical_flags", () => {
      const flow = getFlow("clinical_messages");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("clinical_flags");
      expect(flow!.tables).toContain("patient_clinical_messages");
    });
  });

  describe("Chain: Plano V2 → Publicação → Visualização Paciente", () => {
    it("editor exists with correct tables", () => {
      const flow = getFlow("meal_plan_editor");
      expect(flow).toBeDefined();
      expect(flow!.tables).toContain("meal_plans");
      expect(flow!.severity).toBe("critical");
    });

    it("publish depends on editor", () => {
      const flow = getFlow("meal_plan_publish");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("meal_plan_editor");
      expect(flow!.expectedStatuses).toContain("published");
    });

    it("patient view depends on publish", () => {
      const flow = getFlow("meal_plan_patient_view");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("meal_plan_publish");
      expect(flow!.pages).toContain("/meals");
    });
  });

  describe("Chain: Onboarding Release → Acesso Paciente → Continuidade", () => {
    it("onboarding_release exists with correct lifecycle transitions", () => {
      const flow = getFlow("onboarding_release");
      expect(flow).toBeDefined();
      expect(flow!.expectedStatuses).toContain("awaiting_onboarding_release");
      expect(flow!.expectedStatuses).toContain("onboarding_active");
    });

    it("onboarding_flow depends on release", () => {
      const flow = getFlow("onboarding_flow");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("onboarding_release");
      expect(flow!.expectedStatuses).toContain("onboarding_active");
      expect(flow!.expectedStatuses).toContain("onboarding_completed");
    });
  });

  describe("Chain: Cadastro Paciente → Notificação Profissional", () => {
    it("patient_register is critical", () => {
      const flow = getFlow("patient_register");
      expect(flow).toBeDefined();
      expect(flow!.severity).toBe("critical");
      expect(flow!.tables).toContain("nutritionist_patients");
    });

    it("patient_notification depends on register", () => {
      const flow = getFlow("patient_notification");
      expect(flow).toBeDefined();
      expect(flow!.dependsOn).toContain("patient_register");
    });
  });

  describe("No orphan dependencies", () => {
    it("every dependsOn reference points to an existing flow", () => {
      for (const flow of CRITICAL_FLOWS) {
        if (flow.dependsOn) {
          for (const depId of flow.dependsOn) {
            expect(getFlow(depId), `${flow.id} depends on "${depId}" which doesn't exist`).toBeDefined();
          }
        }
      }
    });
  });

  describe("Dependent flows propagation", () => {
    it("patient_register has dependents", () => {
      const deps = getDependentFlows("patient_register");
      expect(deps.length).toBeGreaterThan(0);
    });

    it("clinical_flags has dependents (tasks + messages)", () => {
      const deps = getDependentFlows("clinical_flags");
      expect(deps.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("Regression: Severity Classification", () => {
  it("auth flows are critical", () => {
    expect(getFlow("auth_login")!.severity).toBe("critical");
  });

  it("dashboard flows are critical", () => {
    expect(getFlow("patient_dashboard")!.severity).toBe("critical");
    expect(getFlow("professional_dashboard")!.severity).toBe("critical");
  });

  it("meal plan flows are critical", () => {
    expect(getFlow("meal_plan_editor")!.severity).toBe("critical");
    expect(getFlow("meal_plan_publish")!.severity).toBe("critical");
    expect(getFlow("meal_plan_patient_view")!.severity).toBe("critical");
  });

  it("analytics is medium severity (non-blocking)", () => {
    expect(getFlow("clinical_analytics")!.severity).toBe("medium");
  });
});
