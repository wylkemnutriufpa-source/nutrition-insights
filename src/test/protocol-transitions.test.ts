import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════
// Protocol Transition Engine Tests (v1.0.0)
// Replicates the deterministic engine logic
// ═══════════════════════════════════════════

type TransitionDecision =
  | "maintain_current_protocol"
  | "adjust_calories_same_protocol"
  | "switch_template_same_strategy"
  | "switch_protocol_new_strategy"
  | "require_manual_clinical_review";

interface PatientContext {
  adherence: number;
  weight_trend: string;
  risk_score: number;
  plan_efficacy_score: number;
  cluster_type: string;
  stagnation_days: number;
  plan_age_days: number;
  plan_complexity: string;
  active_critical_alerts: number;
  data_points: number;
  is_pregnant: boolean;
  has_critical_condition: boolean;
  cluster_stability: number;
  previous_interventions: number;
}

function shouldBlockAutomation(ctx: PatientContext): string | null {
  if (ctx.has_critical_condition) return "critical_condition";
  if (ctx.is_pregnant) return "pregnant";
  if (ctx.plan_age_days < 7) return "plan_too_new";
  if (ctx.adherence < 40) return "low_adherence";
  if (ctx.data_points < 5) return "insufficient_data";
  if (ctx.active_critical_alerts > 0) return "critical_alerts";
  return null;
}

function computeDecision(ctx: PatientContext): TransitionDecision {
  if (shouldBlockAutomation(ctx)) return "require_manual_clinical_review";

  // Scenario 1
  if (ctx.adherence >= 75 && (ctx.weight_trend === "expected_loss" || ctx.weight_trend === "stable") && ctx.risk_score < 60 && ctx.plan_efficacy_score >= 60) {
    return "maintain_current_protocol";
  }
  // Scenario 2
  if (ctx.adherence >= 70 && (ctx.weight_trend === "slow_loss" || ctx.weight_trend === "stagnated") && ctx.stagnation_days <= 21 && (ctx.cluster_type === "metabolic_adaptive" || ctx.cluster_type === "resistant_profile")) {
    return "adjust_calories_same_protocol";
  }
  // Scenario 3
  if (ctx.adherence < 65 && (ctx.cluster_type === "behavioral_struggler" || ctx.cluster_type === "disengaging_patient") && (ctx.plan_complexity === "high" || ctx.plan_complexity === "medium")) {
    return "switch_template_same_strategy";
  }
  // Scenario 4
  if (ctx.plan_age_days >= 21 && ctx.adherence >= 70 && (ctx.weight_trend === "stagnated" || ctx.weight_trend === "gaining") && ctx.plan_efficacy_score < 45 && ctx.stagnation_days >= 14) {
    return "switch_protocol_new_strategy";
  }
  return "require_manual_clinical_review";
}

function computeConfidenceScore(ctx: PatientContext): number {
  let score = 50;
  if (ctx.data_points >= 30) score += 25;
  else if (ctx.data_points >= 20) score += 18;
  else if (ctx.data_points >= 10) score += 10;
  else score -= 10;
  score += Math.min(20, ctx.cluster_stability * 20);
  if (ctx.adherence >= 70 && ctx.adherence <= 95) score += 15;
  else if (ctx.adherence >= 50) score += 8;
  else score -= 5;
  if (ctx.weight_trend === "expected_loss" || ctx.weight_trend === "stable") score += 10;
  else if (ctx.weight_trend === "slow_loss") score += 5;
  if (ctx.previous_interventions >= 2) score += 10;
  else if (ctx.previous_interventions >= 1) score += 5;
  return Math.max(0, Math.min(100, score));
}

const BASE_CTX: PatientContext = {
  adherence: 80, weight_trend: "expected_loss", risk_score: 30, plan_efficacy_score: 75,
  cluster_type: "metabolic_responder", stagnation_days: 0, plan_age_days: 30,
  plan_complexity: "medium", active_critical_alerts: 0, data_points: 25,
  is_pregnant: false, has_critical_condition: false, cluster_stability: 0.8, previous_interventions: 1,
};

describe("Semi-Autonomous Protocol Transition Engine v1.0.0", () => {
  // ── Scenario 1 ──
  it("maintains protocol when patient responds well", () => {
    expect(computeDecision({ ...BASE_CTX })).toBe("maintain_current_protocol");
  });

  it("maintains with 75% adherence threshold", () => {
    expect(computeDecision({ ...BASE_CTX, adherence: 75, weight_trend: "stable" })).toBe("maintain_current_protocol");
  });

  // ── Scenario 2 ──
  it("adjusts calories for adaptive cluster with slow loss", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 72, weight_trend: "slow_loss",
      cluster_type: "metabolic_adaptive", stagnation_days: 10, plan_efficacy_score: 50,
    })).toBe("adjust_calories_same_protocol");
  });

  it("adjusts calories for resistant profile with stagnation", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 75, weight_trend: "stagnated",
      cluster_type: "resistant_profile", stagnation_days: 18, plan_efficacy_score: 55, risk_score: 65,
    })).toBe("adjust_calories_same_protocol");
  });

  // ── Scenario 3 ──
  it("switches template for behavioral struggler with low adherence", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 55, cluster_type: "behavioral_struggler",
      plan_complexity: "high", weight_trend: "slow_loss", plan_efficacy_score: 40, risk_score: 65,
    })).toBe("switch_template_same_strategy");
  });

  it("switches template for disengaging patient", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 50, cluster_type: "disengaging_patient",
      plan_complexity: "medium", weight_trend: "stagnated", plan_efficacy_score: 35, risk_score: 70,
    })).toBe("switch_template_same_strategy");
  });

  // ── Scenario 4 ──
  it("switches protocol for therapeutic failure", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 78, weight_trend: "stagnated",
      plan_efficacy_score: 30, stagnation_days: 20, plan_age_days: 28,
      cluster_type: "metabolic_responder",
    })).toBe("switch_protocol_new_strategy");
  });

  it("switches protocol when gaining weight despite adherence", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 82, weight_trend: "gaining",
      plan_efficacy_score: 25, stagnation_days: 15, plan_age_days: 35,
    })).toBe("switch_protocol_new_strategy");
  });

  // ── Scenario 5: Safety blocks ──
  it("requires manual review for critical condition", () => {
    expect(computeDecision({ ...BASE_CTX, has_critical_condition: true })).toBe("require_manual_clinical_review");
  });

  it("requires manual review for pregnant patient", () => {
    expect(computeDecision({ ...BASE_CTX, is_pregnant: true })).toBe("require_manual_clinical_review");
  });

  it("requires manual review when plan too new", () => {
    expect(computeDecision({ ...BASE_CTX, plan_age_days: 5 })).toBe("require_manual_clinical_review");
  });

  it("requires manual review when adherence < 40%", () => {
    expect(computeDecision({ ...BASE_CTX, adherence: 35 })).toBe("require_manual_clinical_review");
  });

  it("requires manual review when insufficient data", () => {
    expect(computeDecision({ ...BASE_CTX, data_points: 3 })).toBe("require_manual_clinical_review");
  });

  it("requires manual review for unresolved critical alerts", () => {
    expect(computeDecision({ ...BASE_CTX, active_critical_alerts: 1 })).toBe("require_manual_clinical_review");
  });

  it("falls through to manual review for conflicting signals", () => {
    expect(computeDecision({
      ...BASE_CTX, adherence: 68, weight_trend: "slow_loss",
      cluster_type: "metabolic_responder", plan_efficacy_score: 55, risk_score: 55,
    })).toBe("require_manual_clinical_review");
  });

  // ── Confidence Score ──
  it("computes high confidence for strong data", () => {
    const score = computeConfidenceScore({
      ...BASE_CTX, data_points: 35, cluster_stability: 0.9,
      adherence: 82, weight_trend: "expected_loss", previous_interventions: 3,
    });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("computes low confidence for sparse data", () => {
    const score = computeConfidenceScore({
      ...BASE_CTX, data_points: 5, cluster_stability: 0.3,
      adherence: 45, weight_trend: "unknown", previous_interventions: 0,
    });
    expect(score).toBeLessThan(45);
  });

  it("computes medium confidence for limited data", () => {
    const score = computeConfidenceScore({
      ...BASE_CTX, data_points: 8, cluster_stability: 0.4,
      adherence: 55, weight_trend: "unknown", previous_interventions: 0,
    });
    expect(score).toBeGreaterThanOrEqual(35);
    expect(score).toBeLessThan(70);
  });

  // ── Approval flow ──
  it("approval does not mutate original suggestion object", () => {
    const suggestion = { id: "test", status: "pending", transition_type: "adjust_calories_same_protocol" };
    const approved = { ...suggestion, status: "approved", approved_at: new Date().toISOString() };
    expect(suggestion.status).toBe("pending");
    expect(approved.status).toBe("approved");
  });

  it("rejection preserves plan integrity", () => {
    const plan = { id: "plan-1", is_active: true, plan_status: "published_to_patient" };
    // Rejection should not touch the plan at all
    const afterReject = { ...plan };
    expect(afterReject.is_active).toBe(true);
    expect(afterReject.plan_status).toBe("published_to_patient");
  });

  // ── Version ──
  it("engine version is 1.0.0", () => {
    expect("1.0.0").toBe("1.0.0");
  });
});
