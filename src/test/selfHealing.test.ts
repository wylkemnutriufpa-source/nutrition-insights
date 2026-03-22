/**
 * FitJourney — Smoke Tests: Self-Healing & Feature Flags
 * BLOCO 3 + 6 + 7
 */
import { describe, it, expect } from "vitest";
import { resolveRoute, resolveNotificationTarget, normalizeRecipeData, normalizePlanStatus } from "@/lib/selfHealing";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { checkImpact, formatImpactReport } from "@/lib/impactCheck";

describe("Self-Healing — Route Recovery", () => {
  it("redirects legacy routes", () => {
    expect(resolveRoute("/home")).toBe("/dashboard");
    expect(resolveRoute("/configuracoes")).toBe("/settings");
    expect(resolveRoute("/planos")).toBe("/meal-plans");
    expect(resolveRoute("/anamnese")).toBe("/anamnesis");
    expect(resolveRoute("/mensagens")).toBe("/chat");
    expect(resolveRoute("/whatsapp")).toBe("/settings/whatsapp");
  });

  it("returns null for valid routes", () => {
    expect(resolveRoute("/dashboard")).toBeNull();
    expect(resolveRoute("/patients")).toBeNull();
    expect(resolveRoute("/meal-plans")).toBeNull();
  });
});

describe("Self-Healing — Notification Target Recovery", () => {
  it("uses target URL when valid", () => {
    expect(resolveNotificationTarget("any", "/patients/123")).toBe("/patients/123");
  });

  it("resolves by type when no target", () => {
    expect(resolveNotificationTarget("new_patient", null)).toBe("/patients");
    expect(resolveNotificationTarget("new_message", null)).toBe("/chat");
    expect(resolveNotificationTarget("plan_published", null)).toBe("/meals");
  });

  it("falls back to notifications for unknown types", () => {
    expect(resolveNotificationTarget("unknown_type", null)).toBe("/notifications");
    expect(resolveNotificationTarget(null, null)).toBe("/notifications");
  });
});

describe("Self-Healing — Recipe Normalization", () => {
  it("handles null/undefined recipe", () => {
    const result = normalizeRecipeData(null);
    expect(result.title).toBe("Receita");
    expect(result.ingredients).toEqual([]);
    expect(result.instructions).toEqual([]);
  });

  it("normalizes string ingredients", () => {
    const result = normalizeRecipeData({
      title: "Bolo",
      ingredients: ["farinha", "ovos", "leite"],
    });
    expect(result.title).toBe("Bolo");
    expect(result.ingredients).toEqual(["farinha", "ovos", "leite"]);
  });

  it("normalizes object ingredients", () => {
    const result = normalizeRecipeData({
      titulo: "Arroz",
      ingredientes: [
        { nome: "Arroz", quantidade: "200", unidade: "g" },
        { name: "Água", amount: "500", unit: "ml" },
      ],
    });
    expect(result.title).toBe("Arroz");
    expect(result.ingredients.length).toBe(2);
    expect(result.ingredients[0]).toContain("Arroz");
  });

  it("handles Portuguese field names", () => {
    const result = normalizeRecipeData({
      titulo: "Sopa",
      descricao: "Sopa de legumes",
      instrucoes: ["Cortar legumes", "Cozinhar"],
    });
    expect(result.title).toBe("Sopa");
    expect(result.description).toBe("Sopa de legumes");
    expect(result.instructions).toEqual(["Cortar legumes", "Cozinhar"]);
  });
});

describe("Self-Healing — Plan Status Normalization", () => {
  it("normalizes legacy statuses", () => {
    expect(normalizePlanStatus("rascunho")).toBe("draft");
    expect(normalizePlanStatus("publicado")).toBe("published");
    expect(normalizePlanStatus("arquivado")).toBe("archived");
    expect(normalizePlanStatus("active")).toBe("published");
  });

  it("handles unknown statuses", () => {
    expect(normalizePlanStatus("INVALID")).toBe("draft");
    expect(normalizePlanStatus(null)).toBe("draft");
  });
});

describe("Feature Flags — Default State", () => {
  it("returns true for known flags by default", () => {
    expect(isFeatureEnabled("whatsapp_integration")).toBe(true);
    expect(isFeatureEnabled("clinical_analytics")).toBe(true);
    expect(isFeatureEnabled("clinical_automations")).toBe(true);
  });

  it("returns true for unknown flags (don't block new features)", () => {
    expect(isFeatureEnabled("nonexistent_flag")).toBe(true);
  });
});

describe("Impact Check — Pre-Change Analysis", () => {
  it("detects critical impact on meal_plans", () => {
    const report = checkImpact({ tables: ["meal_plans"] });
    expect(report.riskLevel).toBe("critical");
    expect(report.criticalFlowsAffected).toBeGreaterThan(0);
    expect(report.requiresFallback).toBe(true);
  });

  it("detects high impact on notifications", () => {
    const report = checkImpact({ tables: ["notifications"] });
    expect(report.affectedFlows.length).toBeGreaterThan(0);
  });

  it("reports low risk for unrelated changes", () => {
    const report = checkImpact({ tables: ["some_new_table"] });
    expect(report.riskLevel).toBe("low");
    expect(report.requiresFallback).toBe(false);
  });

  it("generates readable impact report", () => {
    const report = checkImpact({ tables: ["meal_plans", "profiles"] });
    const text = formatImpactReport(report);
    expect(text).toContain("RELATÓRIO DE IMPACTO");
    expect(text).toContain("Risco:");
  });
});
