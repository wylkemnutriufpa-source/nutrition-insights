import { describe, it, expect } from "vitest";

// ─── Pure scoring functions (mirroring edge function logic) ─────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function computeGoalAchievementProbability(
  adherence: number, weightTrend: string, clusterType: string,
  performanceLevel: string, planEfficacy: number, riskLevel: string
): number {
  let base = 50;
  if (adherence >= 85) base += 25; else if (adherence >= 70) base += 15;
  else if (adherence >= 50) base += 0; else base -= 20;
  if (weightTrend === "expected_loss") base += 15;
  else if (weightTrend === "slow_loss") base += 5;
  else if (weightTrend === "stagnated") base -= 10;
  else if (weightTrend === "gaining") base -= 20;
  if (clusterType === "metabolic_responder") base += 10;
  else if (clusterType === "metabolic_adaptive") base += 5;
  else if (clusterType === "resistant_profile") base -= 10;
  else if (clusterType === "disengaging_patient") base -= 15;
  if (performanceLevel === "peak_condition") base += 10;
  else if (performanceLevel === "high_performance") base += 5;
  else if (performanceLevel === "unstable") base -= 5;
  else if (performanceLevel === "compromised") base -= 10;
  base += (planEfficacy - 50) * 0.2;
  if (riskLevel === "critical") base -= 15;
  else if (riskLevel === "risk") base -= 8;
  return clamp(base);
}

function computeStagnationProbability(
  weightTrend: string, clusterType: string, planEfficacy: number, daysInTrend: number
): number {
  let base = 25;
  if (weightTrend === "stagnated") base += 30;
  else if (weightTrend === "slow_loss") base += 15;
  else if (weightTrend === "expected_loss") base -= 15;
  if (clusterType === "resistant_profile") base += 15;
  else if (clusterType === "metabolic_adaptive") base += 10;
  else if (clusterType === "metabolic_responder") base -= 10;
  if (planEfficacy < 40) base += 10; else if (planEfficacy > 70) base -= 10;
  if (daysInTrend > 21) base += 10; else if (daysInTrend > 14) base += 5;
  return clamp(base);
}

function computeDropoutProbability(
  dropoutRiskScore: number, clusterType: string, consistencyScore: number,
  stressLoad: number, daysSinceIntervention: number, activeAlerts: number
): number {
  let base = dropoutRiskScore * 0.4;
  if (clusterType === "disengaging_patient") base += 20;
  else if (clusterType === "behavioral_struggler") base += 10;
  base += (100 - consistencyScore) * 0.15;
  base += stressLoad * 0.1;
  if (daysSinceIntervention > 14) base += 10;
  else if (daysSinceIntervention > 7) base += 5;
  base += Math.min(activeAlerts * 3, 15);
  return clamp(base);
}

function computeRegressionProbability(
  weightTrend: string, engagementStability: number, stressLoad: number,
  recoveryScore: number, performanceLevel: string
): number {
  let base = 15;
  if (weightTrend === "gaining") base += 25;
  else if (weightTrend === "stagnated") base += 5;
  else if (weightTrend === "expected_loss") base -= 10;
  if (engagementStability < 40) base += 15;
  else if (engagementStability < 60) base += 5;
  if (stressLoad > 70) base += 15;
  else if (stressLoad > 50) base += 5;
  if (recoveryScore < 40) base += 10;
  if (performanceLevel === "compromised") base += 10;
  else if (performanceLevel === "unstable") base += 5;
  return clamp(base);
}

function computeInterventionDays(
  dropoutProb: number, regressionProb: number, _perfLevel: string, riskLevel: string
): number {
  const urgency = dropoutProb * 0.4 + regressionProb * 0.3 +
    (riskLevel === "critical" ? 30 : riskLevel === "risk" ? 15 : 0);
  if (urgency >= 60) return 1;
  if (urgency >= 45) return 3;
  if (urgency >= 30) return 7;
  if (urgency >= 15) return 14;
  return 21;
}

function determinePredictionDriver(
  adherence: number, clusterType: string, stressLoad: number,
  recoveryScore: number, planEfficacy: number, weightTrend: string,
  consistencyScore: number, goalProb: number
): string {
  if (stressLoad > 70) return "high_stress";
  if (recoveryScore < 35) return "low_recovery";
  if (clusterType === "disengaging_patient") return "disengagement_risk";
  if (adherence < 40) return "low_adherence";
  if (consistencyScore < 40) return "behavioral_instability";
  if (clusterType === "resistant_profile" && weightTrend === "stagnated") return "metabolic_resistance";
  if (planEfficacy < 35) return "therapeutic_failure";
  if (planEfficacy < 50 && weightTrend !== "expected_loss") return "protocol_mismatch";
  if (goalProb >= 65) return "positive_momentum";
  return "low_adherence";
}

function computeConfidenceScore(
  snapCount: number, hasWearable: boolean, clusterStable: boolean,
  daysOfData: number, consistency: number
): number {
  let score = 30;
  if (snapCount >= 14) score += 20; else if (snapCount >= 7) score += 10; else score -= 10;
  if (hasWearable) score += 15;
  if (clusterStable) score += 10;
  if (daysOfData >= 30) score += 15; else if (daysOfData >= 14) score += 8;
  score += consistency * 0.1;
  return clamp(score);
}

function classifyGoal(p: number): string {
  if (p >= 80) return "very_high"; if (p >= 65) return "high";
  if (p >= 45) return "moderate"; if (p >= 25) return "low"; return "very_low";
}

function classifyStagnation(p: number): string {
  if (p >= 75) return "risco_iminente"; if (p >= 55) return "alto_risco";
  if (p >= 35) return "risco_moderado"; return "baixo_risco";
}

function classifyConfidence(s: number): string {
  if (s >= 70) return "alta_confianca"; if (s >= 45) return "media_confianca";
  return "baixa_confianca";
}

// ─── Tests ──────────────────────────────────────────────────

describe("Clinical Outcome Prediction Engine v1.0.0", () => {
  describe("Scenario 1: High adherence, good response → high goal achievement", () => {
    it("should predict high goal probability", () => {
      const prob = computeGoalAchievementProbability(90, "expected_loss", "metabolic_responder", "high_performance", 80, "stable");
      expect(prob).toBeGreaterThanOrEqual(80);
      expect(classifyGoal(prob)).toMatch(/very_high|high/);
    });
  });

  describe("Scenario 2: Resistant patient with stagnation", () => {
    it("should predict high stagnation probability", () => {
      const prob = computeStagnationProbability("stagnated", "resistant_profile", 35, 25);
      expect(prob).toBeGreaterThan(60);
      expect(classifyStagnation(prob)).toMatch(/alto_risco|risco_iminente/);
    });
  });

  describe("Scenario 3: Disengaging cluster → high dropout", () => {
    it("should predict high dropout probability", () => {
      const prob = computeDropoutProbability(60, "disengaging_patient", 30, 50, 20, 3);
      expect(prob).toBeGreaterThan(50);
    });
  });

  describe("Scenario 4: High stress + physiological regression", () => {
    it("should predict high regression probability", () => {
      const prob = computeRegressionProbability("gaining", 30, 80, 30, "compromised");
      expect(prob).toBeGreaterThan(60);
    });
  });

  describe("Scenario 5: Few data points → low confidence", () => {
    it("should produce low confidence score", () => {
      const conf = computeConfidenceScore(3, false, false, 5, 30);
      expect(conf).toBeLessThan(45);
      expect(classifyConfidence(conf)).toBe("baixa_confianca");
    });
  });

  describe("Scenario 6: Good data + wearable → high confidence", () => {
    it("should produce high confidence score", () => {
      const conf = computeConfidenceScore(20, true, true, 60, 80);
      expect(conf).toBeGreaterThanOrEqual(70);
      expect(classifyConfidence(conf)).toBe("alta_confianca");
    });
  });

  describe("Intervention urgency", () => {
    it("critical risk → intervene in 1 day", () => {
      const days = computeInterventionDays(80, 70, "compromised", "critical");
      expect(days).toBe(1);
    });

    it("stable patient → 14-21 days", () => {
      const days = computeInterventionDays(10, 10, "stable", "stable");
      expect(days).toBeGreaterThanOrEqual(14);
    });
  });

  describe("Prediction driver", () => {
    it("high stress is top priority driver", () => {
      const d = determinePredictionDriver(80, "metabolic_responder", 75, 70, 70, "expected_loss", 80, 80);
      expect(d).toBe("high_stress");
    });

    it("disengaging cluster is flagged", () => {
      const d = determinePredictionDriver(60, "disengaging_patient", 40, 50, 60, "slow_loss", 50, 40);
      expect(d).toBe("disengagement_risk");
    });

    it("good momentum is recognized", () => {
      const d = determinePredictionDriver(85, "metabolic_responder", 20, 80, 75, "expected_loss", 80, 85);
      expect(d).toBe("positive_momentum");
    });

    it("low recovery flagged before adherence", () => {
      const d = determinePredictionDriver(35, "behavioral_struggler", 40, 30, 50, "stagnated", 50, 30);
      expect(d).toBe("low_recovery");
    });
  });

  describe("Classification boundaries", () => {
    it("goal classifications", () => {
      expect(classifyGoal(95)).toBe("very_high");
      expect(classifyGoal(70)).toBe("high");
      expect(classifyGoal(50)).toBe("moderate");
      expect(classifyGoal(30)).toBe("low");
      expect(classifyGoal(10)).toBe("very_low");
    });

    it("stagnation classifications", () => {
      expect(classifyStagnation(80)).toBe("risco_iminente");
      expect(classifyStagnation(60)).toBe("alto_risco");
      expect(classifyStagnation(40)).toBe("risco_moderado");
      expect(classifyStagnation(20)).toBe("baixo_risco");
    });
  });

  describe("Edge cases", () => {
    it("clamped to 0-100 range", () => {
      const extreme = computeGoalAchievementProbability(100, "expected_loss", "metabolic_responder", "peak_condition", 100, "stable");
      expect(extreme).toBeLessThanOrEqual(100);
      expect(extreme).toBeGreaterThanOrEqual(0);
    });

    it("very low inputs stay within range", () => {
      const low = computeGoalAchievementProbability(0, "gaining", "disengaging_patient", "compromised", 0, "critical");
      expect(low).toBeGreaterThanOrEqual(0);
      expect(low).toBeLessThanOrEqual(100);
    });
  });

  describe("Improvement after intervention", () => {
    it("prediction improves with better inputs", () => {
      const before = computeGoalAchievementProbability(40, "stagnated", "behavioral_struggler", "unstable", 35, "risk");
      const after = computeGoalAchievementProbability(75, "expected_loss", "metabolic_adaptive", "stable", 65, "attention");
      expect(after).toBeGreaterThan(before);
    });
  });
});
