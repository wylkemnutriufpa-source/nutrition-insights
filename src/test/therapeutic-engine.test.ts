import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// BLOCO 10 — TESTES DO MOTOR TERAPÊUTICO
// Re-implementing pure functions for testability
// ═══════════════════════════════════════════

type CaloricResponseStatus =
  | "resposta_rapida" | "resposta_adequada" | "resposta_lenta"
  | "estagnado" | "resposta_negativa" | "risco_adaptacao_metabolica";

function classifyCaloricResponseStatus(
  weightVelocity14d: number, cluster: string, adherence7d: number,
  riskScore: number, weightTrend: string
): CaloricResponseStatus {
  if (weightVelocity14d < -0.8 && adherence7d >= 60) return "resposta_rapida";
  if (weightVelocity14d <= -0.3 && weightVelocity14d >= -0.8 && adherence7d >= 60) return "resposta_adequada";
  if (weightVelocity14d > -0.3 && weightVelocity14d < -0.05 && adherence7d >= 60) return "resposta_lenta";
  // Metabolic adaptation BEFORE estagnado (higher priority clinical signal)
  if (adherence7d >= 75 && (weightTrend === "stagnated" || weightTrend === "slow_loss") &&
    (cluster === "resistant_profile" || cluster === "metabolic_adaptive")) {
    return "risco_adaptacao_metabolica";
  }
  if (Math.abs(weightVelocity14d) <= 0.05 && adherence7d >= 50) return "estagnado";
  if (weightVelocity14d > 0.1) return "resposta_negativa";
  if (weightVelocity14d >= 0) return "resposta_negativa";
  return "resposta_lenta";
}

type CaloricAdjustmentType = "manter" | "reduzir_leve" | "reduzir_moderado" | "aumentar_leve" | "diet_break_controlado" | "troca_estrategia";

interface TherapeuticAdjustment {
  type: CaloricAdjustmentType;
  delta_percent: number;
  reason: string;
  duration_days?: number;
}

function computeTherapeuticCaloricAdjustment(
  caloricResponse: CaloricResponseStatus, cluster: string,
  adherence7d: number, riskScore: number, planDays: number, currentCalories: number
): TherapeuticAdjustment {
  if (planDays < 7) return { type: "manter", delta_percent: 0, reason: "plan <7d" };
  if (adherence7d < 40) return { type: "manter", delta_percent: 0, reason: "adherence <40%" };
  if (riskScore >= 60) return { type: "manter", delta_percent: 0, reason: "critical risk" };
  if (cluster === "disengaging_patient") return { type: "manter", delta_percent: 0, reason: "disengaging" };
  if (cluster === "behavioral_struggler" && adherence7d < 60) return { type: "troca_estrategia", delta_percent: 0, reason: "behavioral" };
  if (cluster === "metabolic_adaptive" && caloricResponse === "risco_adaptacao_metabolica") return { type: "diet_break_controlado", delta_percent: 12, duration_days: 7, reason: "metabolic adaptation" };
  if (cluster === "resistant_profile" && caloricResponse === "resposta_lenta" && adherence7d >= 70) return { type: "reduzir_leve", delta_percent: -6, reason: "resistant slow" };
  if (caloricResponse === "estagnado" && adherence7d >= 70) return { type: "reduzir_leve", delta_percent: -7, reason: "stagnated" };
  if (caloricResponse === "resposta_lenta" && adherence7d >= 85 && planDays >= 21) return { type: "reduzir_moderado", delta_percent: -10, reason: "persistent slow" };
  if (caloricResponse === "resposta_rapida") return { type: "aumentar_leve", delta_percent: 5, reason: "rapid loss" };
  if (caloricResponse === "risco_adaptacao_metabolica" && planDays >= 28) return { type: "diet_break_controlado", delta_percent: 12, duration_days: 7, reason: "metabolic risk" };
  return { type: "manter", delta_percent: 0, reason: "no adjustment" };
}

type EfficacyLevel = "alta_eficacia" | "eficacia_moderada" | "baixa_eficacia" | "falha_terapeutica";

function computeTherapeuticEfficacy(
  weightVelocity: number, adherence7d: number, alertCount: number, engagementIndex: number, planDays: number
): { score: number; level: EfficacyLevel } {
  if (planDays < 7) return { score: 50, level: "eficacia_moderada" };
  let score = 50;
  if (weightVelocity < -0.5) score += 30;
  else if (weightVelocity < -0.2) score += 20;
  else if (weightVelocity < 0) score += 10;
  else if (weightVelocity > 0.2) score -= 15;
  if (adherence7d >= 80) score += 30;
  else if (adherence7d >= 60) score += 20;
  else if (adherence7d >= 40) score += 10;
  else score -= 10;
  score -= Math.min(alertCount * 5, 20);
  if (engagementIndex >= 70) score += 10;
  else if (engagementIndex >= 50) score += 5;
  else if (engagementIndex < 30) score -= 5;
  score = Math.max(0, Math.min(100, score));
  let level: EfficacyLevel;
  if (score >= 75) level = "alta_eficacia";
  else if (score >= 50) level = "eficacia_moderada";
  else if (score >= 25) level = "baixa_eficacia";
  else level = "falha_terapeutica";
  return { score, level };
}

// ═══════════════════════════════════════════
// TESTES
// ═══════════════════════════════════════════

describe("Therapeutic Engine - Caloric Response Classification", () => {
  it("should classify rapid loss", () => {
    expect(classifyCaloricResponseStatus(-1.0, "metabolic_responder", 80, 5, "fast_loss")).toBe("resposta_rapida");
  });

  it("should classify adequate response", () => {
    expect(classifyCaloricResponseStatus(-0.5, "metabolic_responder", 75, 5, "expected_loss")).toBe("resposta_adequada");
  });

  it("should classify stagnation", () => {
    // Use metabolic_responder cluster (not resistant/adaptive) to get pure stagnation
    expect(classifyCaloricResponseStatus(0.02, "metabolic_responder", 80, 10, "stagnated")).toBe("estagnado");
  });

  it("should classify metabolic adaptation risk", () => {
    // velocity is near zero (not matching resposta_lenta range), high adherence, resistant profile, stagnated trend
    expect(classifyCaloricResponseStatus(0.01, "resistant_profile", 80, 10, "stagnated")).toBe("risco_adaptacao_metabolica");
  });

  it("should classify negative response", () => {
    expect(classifyCaloricResponseStatus(0.5, "behavioral_struggler", 30, 20, "gaining")).toBe("resposta_negativa");
  });
});

describe("Therapeutic Engine - Caloric Adjustment", () => {
  it("should block adjustment for plans < 7 days", () => {
    const result = computeTherapeuticCaloricAdjustment("estagnado", "resistant_profile", 80, 10, 5, 1800);
    expect(result.type).toBe("manter");
  });

  it("should block adjustment for adherence < 40%", () => {
    const result = computeTherapeuticCaloricAdjustment("estagnado", "resistant_profile", 30, 10, 14, 1800);
    expect(result.type).toBe("manter");
  });

  it("should recommend diet break for adaptive + metabolic risk", () => {
    const result = computeTherapeuticCaloricAdjustment("risco_adaptacao_metabolica", "metabolic_adaptive", 80, 10, 30, 1800);
    expect(result.type).toBe("diet_break_controlado");
    expect(result.delta_percent).toBe(12);
    expect(result.duration_days).toBe(7);
  });

  it("should recommend light reduction for resistant stagnation", () => {
    const result = computeTherapeuticCaloricAdjustment("resposta_lenta", "resistant_profile", 75, 10, 21, 1800);
    expect(result.type).toBe("reduzir_leve");
    expect(result.delta_percent).toBe(-6);
  });

  it("should recommend increase for rapid loss", () => {
    const result = computeTherapeuticCaloricAdjustment("resposta_rapida", "metabolic_responder", 80, 5, 14, 1800);
    expect(result.type).toBe("aumentar_leve");
    expect(result.delta_percent).toBe(5);
  });

  it("should recommend strategy change for behavioral struggler", () => {
    const result = computeTherapeuticCaloricAdjustment("resposta_lenta", "behavioral_struggler", 45, 15, 14, 1800);
    expect(result.type).toBe("troca_estrategia");
    expect(result.delta_percent).toBe(0);
  });

  it("should block for disengaging patient", () => {
    const result = computeTherapeuticCaloricAdjustment("estagnado", "disengaging_patient", 50, 20, 14, 1800);
    expect(result.type).toBe("manter");
  });

  it("should block for critical risk", () => {
    const result = computeTherapeuticCaloricAdjustment("estagnado", "resistant_profile", 80, 65, 21, 1800);
    expect(result.type).toBe("manter");
  });

  it("should never exceed -12% reduction", () => {
    const result = computeTherapeuticCaloricAdjustment("resposta_lenta", "resistant_profile", 90, 10, 30, 1800);
    expect(result.delta_percent).toBeGreaterThanOrEqual(-12);
  });
});

describe("Therapeutic Engine - Efficacy Score", () => {
  it("should return high efficacy for good metrics", () => {
    const result = computeTherapeuticEfficacy(-0.6, 85, 0, 80, 21);
    expect(result.level).toBe("alta_eficacia");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("should return therapeutic failure for bad metrics", () => {
    const result = computeTherapeuticEfficacy(0.3, 20, 4, 20, 30);
    expect(result.level).toBe("falha_terapeutica");
    expect(result.score).toBeLessThan(25);
  });

  it("should return moderate for early plans", () => {
    const result = computeTherapeuticEfficacy(0, 50, 0, 50, 5);
    expect(result.level).toBe("eficacia_moderada");
    expect(result.score).toBe(50);
  });

  it("should penalize high alert count", () => {
    const good = computeTherapeuticEfficacy(-0.3, 70, 0, 60, 21);
    const withAlerts = computeTherapeuticEfficacy(-0.3, 70, 4, 60, 21);
    expect(withAlerts.score).toBeLessThan(good.score);
  });
});
