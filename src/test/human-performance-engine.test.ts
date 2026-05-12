import { describe, it, expect } from "vitest";

// ─── Pure scoring functions (mirroring edge function logic) ─────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function computeNutritionScore(adherence7d: number, adherence30d: number, calorieAlerts: number, planEfficacy: number): number {
  const adherenceBlend = adherence7d * 0.6 + adherence30d * 0.4;
  const alertPenalty = Math.min(calorieAlerts * 5, 30);
  const efficacyBonus = planEfficacy * 0.3;
  return clamp(adherenceBlend * 0.6 + efficacyBonus + (100 - alertPenalty) * 0.1);
}

function computeRecoveryScore(sleepQuality: number, sleepRegularity: number, fatiguePerception: number): number {
  return clamp(sleepQuality * 0.5 + sleepRegularity * 0.3 - fatiguePerception * 0.2);
}

function computeStressLoadScore(stressPerception: number, engagementDrops: number, behaviorOscillations: number): number {
  return clamp(stressPerception * 0.40 + engagementDrops * 10 * 0.30 + behaviorOscillations * 15 * 0.30);
}

function computeConsistencyScore(login: number, checkin: number, meals: number): number {
  return clamp(login * 0.25 + checkin * 0.35 + meals * 0.40);
}

function computeOverall(n: number, r: number, t: number, c: number, m: number, s: number): number {
  return clamp(n * 0.25 + r * 0.15 + t * 0.15 + c * 0.15 + m * 0.20 + (100 - s) * 0.10);
}

function classifyLevel(score: number): string {
  if (score >= 90) return "peak_condition";
  if (score >= 75) return "high_performance";
  if (score >= 60) return "stable";
  if (score >= 40) return "unstable";
  return "compromised";
}

function classifyProfile(scores: { nutrition: number; recovery: number; training: number; consistency: number; metabolic: number; stress: number }): string {
  const { nutrition, recovery, training, consistency, metabolic, stress } = scores;
  if (stress > 70) return "stress_limited";
  if (recovery < 50 && recovery <= Math.min(training, consistency, nutrition)) return "recovery_limited";
  if (training < 50 && training <= Math.min(recovery, consistency, nutrition)) return "training_limited";
  if (consistency < 50) return "inconsistent_responder";
  if (metabolic >= 70 && nutrition >= 70) return "metabolically_efficient";
  if (nutrition >= 75 && nutrition > training) return "nutrition_driven";
  if (consistency >= 75) return "behavior_driven";
  return "inconsistent_responder";
}

// ─── Test Scenarios ─────────────────────────────────────────────

describe("Human Performance Engine v1.0.0", () => {
  describe("Score Calculations", () => {
    it("nutrition score responds to adherence and alerts", () => {
      const high = computeNutritionScore(90, 85, 0, 80);
      const low = computeNutritionScore(40, 35, 4, 30);
      expect(high).toBeGreaterThan(60);
      expect(low).toBeLessThan(50);
    });

    it("recovery score responds to sleep quality", () => {
      const good = computeRecoveryScore(90, 80, 10);
      const bad = computeRecoveryScore(30, 30, 80);
      expect(good).toBeGreaterThan(50);
      expect(bad).toBeLessThan(30);
    });

    it("stress load increases with high perception", () => {
      const calm = computeStressLoadScore(20, 0, 0);
      const stressed = computeStressLoadScore(80, 3, 2);
      expect(calm).toBeLessThan(20);
      expect(stressed).toBeGreaterThan(40);
    });

    it("consistency requires multi-signal engagement", () => {
      const active = computeConsistencyScore(80, 90, 85);
      const inactive = computeConsistencyScore(10, 5, 10);
      expect(active).toBeGreaterThan(70);
      expect(inactive).toBeLessThan(15);
    });
  });

  describe("Scenario 1: High adherence + bad sleep", () => {
    it("should be recovery_limited", () => {
      const profile = classifyProfile({
        nutrition: 85, recovery: 30, training: 60,
        consistency: 75, metabolic: 65, stress: 40,
      });
      expect(profile).toBe("recovery_limited");
    });
  });

  describe("Scenario 2: Low training + good nutrition", () => {
    it("should be training_limited", () => {
      const profile = classifyProfile({
        nutrition: 80, recovery: 65, training: 35,
        consistency: 70, metabolic: 60, stress: 30,
      });
      expect(profile).toBe("training_limited");
    });
  });

  describe("Scenario 3: High stress + behavioral regression", () => {
    it("should be stress_limited", () => {
      const profile = classifyProfile({
        nutrition: 50, recovery: 40, training: 45,
        consistency: 45, metabolic: 50, stress: 80,
      });
      expect(profile).toBe("stress_limited");
    });
  });

  describe("Scenario 4: Consistent evolution across all dimensions", () => {
    it("should be high_performance or peak", () => {
      const overall = computeOverall(85, 80, 80, 85, 82, 15);
      expect(overall).toBeGreaterThanOrEqual(75);
      expect(classifyLevel(overall)).toMatch(/high_performance|peak_condition/);
    });

    it("should be metabolically_efficient or nutrition_driven", () => {
      const profile = classifyProfile({
        nutrition: 85, recovery: 80, training: 80,
        consistency: 85, metabolic: 82, stress: 15,
      });
      expect(["metabolically_efficient", "nutrition_driven"]).toContain(profile);
    });
  });

  describe("Scenario 5: Incomplete data", () => {
    it("defaults should produce unstable or compromised", () => {
      const overall = computeOverall(30, 50, 50, 20, 40, 50);
      expect(classifyLevel(overall)).toMatch(/unstable|compromised/);
    });
  });

  describe("Scenario 6: Profile change over time", () => {
    it("profile changes when stress increases", () => {
      const before = classifyProfile({
        nutrition: 75, recovery: 65, training: 60,
        consistency: 70, metabolic: 70, stress: 30,
      });
      const after = classifyProfile({
        nutrition: 75, recovery: 65, training: 60,
        consistency: 70, metabolic: 70, stress: 80,
      });
      expect(before).not.toBe("stress_limited");
      expect(after).toBe("stress_limited");
    });
  });

  describe("Classification boundaries", () => {
    it("correctly classifies all performance levels", () => {
      expect(classifyLevel(95)).toBe("peak_condition");
      expect(classifyLevel(80)).toBe("high_performance");
      expect(classifyLevel(65)).toBe("stable");
      expect(classifyLevel(45)).toBe("unstable");
      expect(classifyLevel(20)).toBe("compromised");
    });
  });

  describe("Overall score formula", () => {
    it("weights sum to 1.0", () => {
      // All scores at 100, stress at 0 → should be 100
      const perfect = computeOverall(100, 100, 100, 100, 100, 0);
      expect(perfect).toBe(100);
    });

    it("all zeros → 10 (only stress inverted contributes)", () => {
      const zero = computeOverall(0, 0, 0, 0, 0, 0);
      expect(zero).toBe(10); // (100-0)*0.10 = 10
    });
  });
});
