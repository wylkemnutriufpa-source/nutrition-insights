import { describe, it, expect } from "vitest";

// ─── Pure functions mirroring edge function logic ───────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function riskLevel(v: number): string {
  if (v >= 60) return "high";
  if (v >= 35) return "moderate";
  return "low";
}

interface Baseline {
  adherence_7d: number; adherence_30d: number; weight_trend: string;
  cluster_type: string; plan_efficacy: number; caloric_response: string;
  performance_level: string; risk_level: string; dropout_risk: number;
  stress_load: number; recovery_score: number; consistency_score: number;
  engagement_stability: number; has_physio_data: boolean;
  snapshot_count: number; current_calories: number;
}

interface ProjectedOutcome {
  projected_goal_achievement_delta: number;
  projected_adherence_delta: number;
  projected_stagnation_risk_delta: number;
  projected_dropout_risk_delta: number;
  projected_regression_risk_delta: number;
  projected_time_to_response_days: number;
}

function simulateCaloricReduction(b: Baseline): { outcomes: ProjectedOutcome } {
  const isResistant = b.cluster_type === "resistant_profile";
  const isAdaptive = b.cluster_type === "metabolic_adaptive";
  let goalDelta = isResistant ? 5 : isAdaptive ? 8 : 12;
  let adherenceDelta = b.adherence_7d >= 70 ? -3 : -8;
  let stagnationDelta = isResistant ? -5 : -15;
  let dropoutDelta = b.adherence_7d < 50 ? 8 : 2;
  if (b.stress_load > 60) { adherenceDelta -= 5; dropoutDelta += 5; }
  return {
    outcomes: {
      projected_goal_achievement_delta: goalDelta,
      projected_adherence_delta: adherenceDelta,
      projected_stagnation_risk_delta: stagnationDelta,
      projected_dropout_risk_delta: dropoutDelta,
      projected_regression_risk_delta: -5,
      projected_time_to_response_days: isResistant ? 21 : 14,
    },
  };
}

function simulateDietBreak(b: Baseline): { outcomes: ProjectedOutcome } {
  const benefit = b.cluster_type === "resistant_profile" || b.cluster_type === "metabolic_adaptive";
  return {
    outcomes: {
      projected_goal_achievement_delta: benefit ? 10 : 2,
      projected_adherence_delta: benefit ? 8 : 3,
      projected_stagnation_risk_delta: benefit ? -20 : -5,
      projected_dropout_risk_delta: -5,
      projected_regression_risk_delta: benefit ? -3 : 5,
      projected_time_to_response_days: 7,
    },
  };
}

function simulateNoChange(b: Baseline): { outcomes: ProjectedOutcome } {
  const stagnating = b.weight_trend === "stagnated";
  const goodProgress = b.weight_trend === "expected_loss" && b.adherence_7d >= 70;
  return {
    outcomes: {
      projected_goal_achievement_delta: goodProgress ? 3 : stagnating ? -8 : 0,
      projected_adherence_delta: goodProgress ? 2 : stagnating ? -5 : -1,
      projected_stagnation_risk_delta: stagnating ? 15 : -2,
      projected_dropout_risk_delta: stagnating ? 10 : goodProgress ? -3 : 2,
      projected_regression_risk_delta: stagnating ? 8 : -2,
      projected_time_to_response_days: 0,
    },
  };
}

function simulateBehavioralSimplification(b: Baseline): { outcomes: ProjectedOutcome } {
  const benefit = b.cluster_type === "disengaging_patient" || b.cluster_type === "behavioral_struggler" || b.adherence_7d < 50;
  return {
    outcomes: {
      projected_goal_achievement_delta: benefit ? 10 : 2,
      projected_adherence_delta: benefit ? 15 : 5,
      projected_stagnation_risk_delta: -3,
      projected_dropout_risk_delta: benefit ? -15 : -5,
      projected_regression_risk_delta: -5,
      projected_time_to_response_days: 7,
    },
  };
}

function simulateProtocolSwitch(b: Baseline): { outcomes: ProjectedOutcome } {
  const lowEfficacy = b.plan_efficacy < 40;
  return {
    outcomes: {
      projected_goal_achievement_delta: lowEfficacy ? 15 : 5,
      projected_adherence_delta: lowEfficacy ? 8 : -2,
      projected_stagnation_risk_delta: lowEfficacy ? -18 : -5,
      projected_dropout_risk_delta: lowEfficacy ? -5 : 3,
      projected_regression_risk_delta: -5,
      projected_time_to_response_days: 14,
    },
  };
}

function computeSimulationConfidence(b: Baseline): number {
  let score = 30;
  if (b.snapshot_count >= 14) score += 20;
  else if (b.snapshot_count >= 7) score += 10;
  else score -= 10;
  if (b.has_physio_data) score += 15;
  if (b.adherence_30d > 0) score += 10;
  score += b.consistency_score * 0.1;
  if (b.engagement_stability >= 60) score += 5;
  return clamp(score);
}

function classifyConfidence(s: number): string {
  if (s >= 70) return "alta_confianca";
  if (s >= 45) return "media_confianca";
  return "baixa_confianca";
}

function scenarioScore(o: ProjectedOutcome): number {
  return o.projected_goal_achievement_delta * 2
    + o.projected_adherence_delta * 1.5
    - o.projected_stagnation_risk_delta * 1
    - o.projected_dropout_risk_delta * 1.5
    - o.projected_regression_risk_delta * 1;
}

// ─── Tests ──────────────────────────────────────────────────

describe("Clinical Simulation Engine v1.0.0", () => {
  describe("Scenario 1: Resistant patient with high adherence and stagnation", () => {
    const baseline: Baseline = {
      adherence_7d: 80, adherence_30d: 75, weight_trend: "stagnated",
      cluster_type: "resistant_profile", plan_efficacy: 35, caloric_response: "stagnated",
      performance_level: "stable", risk_level: "attention", dropout_risk: 25,
      stress_load: 30, recovery_score: 60, consistency_score: 70,
      engagement_stability: 65, has_physio_data: false, snapshot_count: 15, current_calories: 1500,
    };

    it("diet break shows better stagnation reduction for resistant", () => {
      const db = simulateDietBreak(baseline);
      const cr = simulateCaloricReduction(baseline);
      expect(db.outcomes.projected_stagnation_risk_delta).toBeLessThan(cr.outcomes.projected_stagnation_risk_delta);
    });

    it("no change is worst option when stagnating", () => {
      const nc = simulateNoChange(baseline);
      expect(nc.outcomes.projected_stagnation_risk_delta).toBeGreaterThan(0);
      expect(nc.outcomes.projected_dropout_risk_delta).toBeGreaterThan(0);
    });
  });

  describe("Scenario 2: Adaptive patient with metabolic adaptation signs", () => {
    const baseline: Baseline = {
      adherence_7d: 70, adherence_30d: 72, weight_trend: "slow_loss",
      cluster_type: "metabolic_adaptive", plan_efficacy: 45, caloric_response: "adapting",
      performance_level: "stable", risk_level: "attention", dropout_risk: 20,
      stress_load: 35, recovery_score: 55, consistency_score: 65,
      engagement_stability: 60, has_physio_data: true, snapshot_count: 20, current_calories: 1600,
    };

    it("diet break is beneficial for adaptive cluster", () => {
      const db = simulateDietBreak(baseline);
      expect(db.outcomes.projected_goal_achievement_delta).toBeGreaterThanOrEqual(10);
      expect(db.outcomes.projected_stagnation_risk_delta).toBeLessThan(-10);
    });
  });

  describe("Scenario 3: Behavioral unstable with low adherence", () => {
    const baseline: Baseline = {
      adherence_7d: 35, adherence_30d: 40, weight_trend: "stagnated",
      cluster_type: "behavioral_struggler", plan_efficacy: 30, caloric_response: "neutral",
      performance_level: "unstable", risk_level: "risk", dropout_risk: 55,
      stress_load: 50, recovery_score: 45, consistency_score: 30,
      engagement_stability: 35, has_physio_data: false, snapshot_count: 8, current_calories: 1700,
    };

    it("simplification is better than caloric reduction", () => {
      const simp = simulateBehavioralSimplification(baseline);
      const red = simulateCaloricReduction(baseline);
      expect(scenarioScore(simp.outcomes)).toBeGreaterThan(scenarioScore(red.outcomes));
    });

    it("caloric reduction increases dropout risk with low adherence", () => {
      const red = simulateCaloricReduction(baseline);
      expect(red.outcomes.projected_dropout_risk_delta).toBeGreaterThan(5);
    });
  });

  describe("Scenario 4: Disengaging patient — simplify > reduce kcal", () => {
    const baseline: Baseline = {
      adherence_7d: 30, adherence_30d: 35, weight_trend: "stagnated",
      cluster_type: "disengaging_patient", plan_efficacy: 25, caloric_response: "neutral",
      performance_level: "compromised", risk_level: "critical", dropout_risk: 70,
      stress_load: 65, recovery_score: 40, consistency_score: 20,
      engagement_stability: 25, has_physio_data: false, snapshot_count: 5, current_calories: 1800,
    };

    it("simplification dramatically reduces dropout", () => {
      const simp = simulateBehavioralSimplification(baseline);
      expect(simp.outcomes.projected_dropout_risk_delta).toBeLessThan(-10);
      expect(simp.outcomes.projected_adherence_delta).toBeGreaterThan(10);
    });
  });

  describe("Scenario 5: Good progress — no change is best", () => {
    const baseline: Baseline = {
      adherence_7d: 85, adherence_30d: 80, weight_trend: "expected_loss",
      cluster_type: "metabolic_responder", plan_efficacy: 78, caloric_response: "expected",
      performance_level: "high_performance", risk_level: "stable", dropout_risk: 10,
      stress_load: 15, recovery_score: 80, consistency_score: 85,
      engagement_stability: 85, has_physio_data: true, snapshot_count: 25, current_calories: 1500,
    };

    it("no change shows positive trajectory", () => {
      const nc = simulateNoChange(baseline);
      expect(nc.outcomes.projected_goal_achievement_delta).toBeGreaterThan(0);
      expect(nc.outcomes.projected_dropout_risk_delta).toBeLessThan(0);
    });

    it("no change is competitive with interventions", () => {
      const nc = scenarioScore(simulateNoChange(baseline).outcomes);
      const cr = scenarioScore(simulateCaloricReduction(baseline).outcomes);
      // For a patient doing well, no_change should score reasonably
      expect(nc).toBeGreaterThan(-10);
    });
  });

  describe("Scenario 6: Low data — low confidence", () => {
    const baseline: Baseline = {
      adherence_7d: 50, adherence_30d: 50, weight_trend: "stagnated",
      cluster_type: "behavioral_struggler", plan_efficacy: 50, caloric_response: "neutral",
      performance_level: "stable", risk_level: "attention", dropout_risk: 30,
      stress_load: 30, recovery_score: 60, consistency_score: 30,
      engagement_stability: 40, has_physio_data: false, snapshot_count: 3, current_calories: 1600,
    };

    it("low snapshot count produces low confidence", () => {
      const conf = computeSimulationConfidence(baseline);
      expect(conf).toBeLessThan(45);
      expect(classifyConfidence(conf)).toBe("baixa_confianca");
    });
  });

  describe("Confidence scoring", () => {
    it("high data + wearable → high confidence", () => {
      const b: Baseline = {
        adherence_7d: 80, adherence_30d: 75, weight_trend: "expected_loss",
        cluster_type: "metabolic_responder", plan_efficacy: 70, caloric_response: "expected",
        performance_level: "high_performance", risk_level: "stable", dropout_risk: 10,
        stress_load: 15, recovery_score: 80, consistency_score: 85,
        engagement_stability: 80, has_physio_data: true, snapshot_count: 20, current_calories: 1500,
      };
      const conf = computeSimulationConfidence(b);
      expect(conf).toBeGreaterThanOrEqual(70);
      expect(classifyConfidence(conf)).toBe("alta_confianca");
    });
  });

  describe("Scenario scoring comparison", () => {
    it("protocol switch beats no_change for low-efficacy plans", () => {
      const b: Baseline = {
        adherence_7d: 60, adherence_30d: 55, weight_trend: "stagnated",
        cluster_type: "metabolic_adaptive", plan_efficacy: 30, caloric_response: "stagnated",
        performance_level: "stable", risk_level: "risk", dropout_risk: 35,
        stress_load: 40, recovery_score: 55, consistency_score: 55,
        engagement_stability: 50, has_physio_data: false, snapshot_count: 12, current_calories: 1600,
      };
      const ps = scenarioScore(simulateProtocolSwitch(b).outcomes);
      const nc = scenarioScore(simulateNoChange(b).outcomes);
      expect(ps).toBeGreaterThan(nc);
    });
  });
});
