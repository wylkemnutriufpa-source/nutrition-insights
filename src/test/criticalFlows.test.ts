/**
 * FitJourney — Smoke Tests: Critical Flows Protection
 * BLOCO 3 — Smoke tests automáticos para fluxos protegidos
 */
import { describe, it, expect } from "vitest";
import { CRITICAL_FLOWS, getFlow, getFlowsByPage, getFlowsByTable, analyzeImpact } from "@v1/lib/criticalFlows";

describe("Critical Flows Registry", () => {
  it("should have all mandatory flows registered", () => {
    const mandatoryIds = [
      "auth_login", "auth_register", "patient_register",
      "onboarding_release", "onboarding_flow", "anamnesis",
      "clinical_flags", "behavioral_tasks", "clinical_messages",
      "patient_dashboard", "daily_focus", "checklist",
      "meal_plan_editor", "meal_plan_publish", "meal_plan_patient_view",
      "recipes", "smart_notifications", "whatsapp_integration",
      "professional_dashboard", "clinical_analytics",
    ];

    for (const id of mandatoryIds) {
      expect(getFlow(id), `Flow "${id}" must be registered`).toBeDefined();
    }
  });

  it("every flow must have pages, tables and description", () => {
    for (const flow of CRITICAL_FLOWS) {
      expect(flow.pages.length, `${flow.id} must have pages`).toBeGreaterThan(0);
      expect(flow.tables.length, `${flow.id} must have tables`).toBeGreaterThan(0);
      expect(flow.description.length, `${flow.id} must have description`).toBeGreaterThan(0);
      expect(flow.userAction.length, `${flow.id} must have userAction`).toBeGreaterThan(0);
      expect(flow.expectedResult.length, `${flow.id} must have expectedResult`).toBeGreaterThan(0);
    }
  });

  it("should find flows by page", () => {
    const authFlows = getFlowsByPage("/auth");
    expect(authFlows.length).toBeGreaterThanOrEqual(1);
  });

  it("should find flows by table", () => {
    const profileFlows = getFlowsByTable("profiles");
    expect(profileFlows.length).toBeGreaterThanOrEqual(2);
  });

  it("impact analysis should flag critical flows when touching critical tables", () => {
    const impact = analyzeImpact({ tables: ["meal_plans"] });
    expect(impact.length).toBeGreaterThanOrEqual(2);
    expect(impact.some(i => i.flow.severity === "critical")).toBe(true);
  });

  it("impact analysis should return empty for unrelated changes", () => {
    const impact = analyzeImpact({ tables: ["nonexistent_table_xyz"] });
    expect(impact.length).toBe(0);
  });
});
