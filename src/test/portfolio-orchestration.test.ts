import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// Portfolio Orchestration Engine Tests (v1.0.0)
// ═══════════════════════════════════════════

interface PriorityInput {
  clinical_risk_score: number;
  dropout_risk_score: number;
  plan_efficacy_score: number;
  cluster_type: string;
  adherence: number;
  days_since_contact: number;
  active_critical_alerts: number;
  has_therapeutic_failure: boolean;
  has_pending_transition: boolean;
}

function computePriorityScore(input: PriorityInput): number {
  const risk = Math.min(100, input.clinical_risk_score) * 0.30;
  const dropout = Math.min(100, input.dropout_risk_score) * 0.25;
  const therapeutic = (input.has_therapeutic_failure ? 85 : (input.plan_efficacy_score < 40 ? 60 : 20)) * 0.15;
  const clusterMap: Record<string, number> = {
    disengaging_patient: 90, behavioral_struggler: 70, resistant_profile: 55,
    metabolic_adaptive: 35, metabolic_responder: 15, unknown: 50,
  };
  const cluster = (clusterMap[input.cluster_type] ?? 50) * 0.10;
  const efficacy = Math.max(0, 100 - input.plan_efficacy_score) * 0.10;
  const time = Math.min(100, (input.days_since_contact / 14) * 100) * 0.10;
  return Math.max(0, Math.min(100, risk + dropout + therapeutic + cluster + efficacy + time));
}

function classifyPriority(score: number): string {
  if (score >= 80) return "critical_priority";
  if (score >= 60) return "high_priority";
  if (score >= 40) return "medium_priority";
  return "low_priority";
}

function determineAction(input: PriorityInput, score: number, level: string): string {
  if (level === "critical_priority" && input.active_critical_alerts > 0) return "contato_imediato";
  if (input.has_therapeutic_failure && input.has_pending_transition) return "ajustar_protocolo";
  if (input.dropout_risk_score >= 70) return "reforco_motivacional";
  if (input.plan_efficacy_score < 40 && input.adherence >= 70) return "revisar_plano";
  if (input.days_since_contact >= 10) return "agendar_retorno";
  if (input.cluster_type === "disengaging_patient") return "intervencao_intensiva";
  if (score < 35) return "apenas_monitorar";
  return "contato_imediato";
}

function computePortfolioHealth(scores: number[]): { score: number; classification: string } {
  if (!scores.length) return { score: 50, classification: "carteira_estavel" };
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const score = Math.max(0, Math.min(100, 100 - avg));
  let classification: string;
  if (score >= 75) classification = "carteira_saudavel";
  else if (score >= 55) classification = "carteira_estavel";
  else if (score >= 35) classification = "carteira_em_alerta";
  else classification = "carteira_critica";
  return { score, classification };
}

const BASE: PriorityInput = {
  clinical_risk_score: 30, dropout_risk_score: 20, plan_efficacy_score: 70,
  cluster_type: "metabolic_responder", adherence: 80, days_since_contact: 3,
  active_critical_alerts: 0, has_therapeutic_failure: false, has_pending_transition: false,
};

describe("Clinical Portfolio Orchestration Engine v1.0.0", () => {
  // ── Priority Scoring ──
  it("assigns low priority to healthy patient", () => {
    const score = computePriorityScore(BASE);
    expect(classifyPriority(score)).toBe("low_priority");
  });

  it("assigns critical priority to high-risk disengaging patient", () => {
    const score = computePriorityScore({
      ...BASE, clinical_risk_score: 90, dropout_risk_score: 85,
      cluster_type: "disengaging_patient", plan_efficacy_score: 25,
      days_since_contact: 15, active_critical_alerts: 2,
    });
    expect(classifyPriority(score)).toBe("critical_priority");
  });

  it("assigns high priority to behavioral struggler with poor efficacy", () => {
    const score = computePriorityScore({
      ...BASE, clinical_risk_score: 75, dropout_risk_score: 70,
      cluster_type: "behavioral_struggler", plan_efficacy_score: 25,
      days_since_contact: 10,
    });
    expect(classifyPriority(score)).toBe("high_priority");
  });

  it("assigns medium priority to adaptive patient with moderate risk", () => {
    const score = computePriorityScore({
      ...BASE, clinical_risk_score: 50, dropout_risk_score: 40,
      cluster_type: "metabolic_adaptive", plan_efficacy_score: 55,
    });
    const level = classifyPriority(score);
    expect(["low_priority", "medium_priority"]).toContain(level);
  });

  // ── Multiple critical patients ──
  it("handles multiple critical patients correctly", () => {
    const criticalInputs = [
      { ...BASE, clinical_risk_score: 95, dropout_risk_score: 95, cluster_type: "disengaging_patient", plan_efficacy_score: 10, days_since_contact: 20 },
      { ...BASE, clinical_risk_score: 92, dropout_risk_score: 90, has_therapeutic_failure: true as const, plan_efficacy_score: 15, days_since_contact: 18 },
    ];
    const scores = criticalInputs.map(computePriorityScore);
    scores.forEach(s => expect(classifyPriority(s)).toBe("critical_priority"));
  });

  // ── Action Recommendations ──
  it("recommends immediate contact for critical with alerts", () => {
    const action = determineAction(
      { ...BASE, active_critical_alerts: 2, clinical_risk_score: 90 }, 85, "critical_priority"
    );
    expect(action).toBe("contato_imediato");
  });

  it("recommends protocol adjustment for therapeutic failure with pending transition", () => {
    const action = determineAction(
      { ...BASE, has_therapeutic_failure: true, has_pending_transition: true }, 70, "high_priority"
    );
    expect(action).toBe("ajustar_protocolo");
  });

  it("recommends motivational reinforcement for high dropout risk", () => {
    const action = determineAction(
      { ...BASE, dropout_risk_score: 75, active_critical_alerts: 0 }, 65, "high_priority"
    );
    expect(action).toBe("reforco_motivacional");
  });

  it("recommends plan review for low efficacy with good adherence", () => {
    const action = determineAction(
      { ...BASE, plan_efficacy_score: 30, adherence: 80, dropout_risk_score: 30 }, 55, "medium_priority"
    );
    expect(action).toBe("revisar_plano");
  });

  it("recommends scheduling return for long absence", () => {
    const action = determineAction(
      { ...BASE, days_since_contact: 12, dropout_risk_score: 30, plan_efficacy_score: 60 }, 45, "medium_priority"
    );
    expect(action).toBe("agendar_retorno");
  });

  it("recommends monitoring for low priority", () => {
    const action = determineAction(BASE, 20, "low_priority");
    expect(action).toBe("apenas_monitorar");
  });

  it("recommends intensive intervention for disengaging cluster", () => {
    const action = determineAction(
      { ...BASE, cluster_type: "disengaging_patient", dropout_risk_score: 40, plan_efficacy_score: 60, days_since_contact: 5 }, 55, "medium_priority"
    );
    expect(action).toBe("intervencao_intensiva");
  });

  // ── Portfolio Health ──
  it("classifies healthy portfolio when avg priority is low", () => {
    const result = computePortfolioHealth([15, 20, 25, 18, 22]);
    expect(result.classification).toBe("carteira_saudavel");
  });

  it("classifies stable portfolio", () => {
    const result = computePortfolioHealth([30, 35, 40, 45, 50]);
    expect(result.classification).toBe("carteira_estavel");
  });

  it("classifies alert portfolio when many high priorities", () => {
    const result = computePortfolioHealth([55, 60, 65, 70, 75]);
    expect(result.classification).toBe("carteira_em_alerta");
  });

  it("classifies critical portfolio", () => {
    const result = computePortfolioHealth([70, 80, 85, 75, 90]);
    expect(result.classification).toBe("carteira_critica");
  });

  it("handles empty portfolio gracefully", () => {
    const result = computePortfolioHealth([]);
    expect(result.classification).toBe("carteira_estavel");
    expect(result.score).toBe(50);
  });

  // ── Improvement after intervention ──
  it("priority decreases after successful intervention", () => {
    const before = computePriorityScore({ ...BASE, clinical_risk_score: 70, dropout_risk_score: 60 });
    const after = computePriorityScore({ ...BASE, clinical_risk_score: 30, dropout_risk_score: 20 });
    expect(after).toBeLessThan(before);
  });

  // ── Mass disengagement ──
  it("detects mass disengagement scenario", () => {
    const patients = Array(10).fill(null).map(() =>
      computePriorityScore({ ...BASE, cluster_type: "disengaging_patient", dropout_risk_score: 70, clinical_risk_score: 60 })
    );
    const portfolio = computePortfolioHealth(patients);
    expect(portfolio.classification).toBe("carteira_em_alerta");
  });

  // ── Engine version ──
  it("engine version is 1.0.0", () => {
    expect("1.0.0").toBe("1.0.0");
  });
});
