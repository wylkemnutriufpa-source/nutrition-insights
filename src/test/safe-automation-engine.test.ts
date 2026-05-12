import { describe, it, expect } from "vitest";

// ── Zone Classification Logic ────────────────────────────────

interface PatientState {
  prediction_confidence: number;
  performance_level: number;
  physiological_stability: number;
  dropout_risk: number;
  regression_risk: number;
  cluster_type: string;
  longitudinal_stability: number;
}

function classifyAutomationZone(s: PatientState): string {
  if (s.prediction_confidence < 40 || s.dropout_risk > 70 || s.regression_risk > 60) {
    return "no_automation";
  }
  if (
    s.prediction_confidence < 60 ||
    s.dropout_risk > 40 ||
    s.regression_risk > 35 ||
    s.cluster_type === "behavioral_unstable" ||
    s.physiological_stability < 40
  ) {
    return "limited_automation";
  }
  if (
    s.prediction_confidence >= 80 &&
    s.performance_level >= 60 &&
    s.physiological_stability >= 70 &&
    s.dropout_risk <= 15 &&
    s.regression_risk <= 15 &&
    s.longitudinal_stability >= 65
  ) {
    return "high_confidence_auto_zone";
  }
  return "adaptive_safe_zone";
}

function isSafeToAutoAdjust(zone: string, hasCritical: boolean, hasRegression: boolean): boolean {
  if (zone === "no_automation" || zone === "limited_automation") return false;
  if (hasCritical) return false;
  if (hasRegression) return false;
  return true;
}

function shouldReverse(adherenceDelta: number, riskIncrease: boolean, physioDecline: boolean, weightRegression: boolean) {
  if (weightRegression) return { reverse: true, reason: "weight_regression_detected" };
  if (adherenceDelta < -15) return { reverse: true, reason: "significant_adherence_drop" };
  if (riskIncrease) return { reverse: true, reason: "clinical_risk_increased" };
  if (physioDecline) return { reverse: true, reason: "physiological_decline_detected" };
  return { reverse: false, reason: "" };
}

interface EligibleAdj { type: string; driver: string; confidence: number }

function identifyEligible(zone: string, perf: number, adh: number, wt: string | null, days: number): EligibleAdj[] {
  const adjs: EligibleAdj[] = [];
  if (zone !== "adaptive_safe_zone" && zone !== "high_confidence_auto_zone") return adjs;
  const maxP = zone === "high_confidence_auto_zone" ? 5 : 3;
  if (days >= 14 && adh >= 70) {
    if (wt === "stagnated" || wt === "slow_loss") {
      adjs.push({ type: "caloric_micro_adjustment", driver: "weight_stagnation", confidence: adh >= 80 ? 85 : 70 });
    } else if (wt === "fast_loss" && perf >= 70) {
      adjs.push({ type: "caloric_micro_adjustment", driver: "rapid_weight_loss", confidence: 75 });
    }
  }
  if (adh < 75 && adh >= 55 && perf >= 40) {
    adjs.push({ type: "behavioral_reinforcement", driver: "moderate_adherence_drop", confidence: 72 });
  }
  if (perf >= 65 && adh >= 70 && days < 14) {
    adjs.push({ type: "monitoring_extension", driver: "early_plan_good_response", confidence: 80 });
  }
  if (zone === "high_confidence_auto_zone" && adh >= 80 && wt === "stagnated" && days >= 21) {
    adjs.push({ type: "meal_distribution_adjustment", driver: "prolonged_stagnation_high_adherence", confidence: 68 });
  }
  return adjs;
}

// ── Tests ────────────────────────────────────────────────────

describe("Safe Automation Engine v1.0.0", () => {
  describe("Zone Classification", () => {
    it("returns no_automation for low confidence", () => {
      expect(classifyAutomationZone({ prediction_confidence: 30, performance_level: 80, physiological_stability: 80, dropout_risk: 10, regression_risk: 10, cluster_type: "stable", longitudinal_stability: 80 })).toBe("no_automation");
    });

    it("returns no_automation for high dropout risk", () => {
      expect(classifyAutomationZone({ prediction_confidence: 90, performance_level: 80, physiological_stability: 80, dropout_risk: 75, regression_risk: 10, cluster_type: "stable", longitudinal_stability: 80 })).toBe("no_automation");
    });

    it("returns limited_automation for behavioral_unstable cluster", () => {
      expect(classifyAutomationZone({ prediction_confidence: 70, performance_level: 60, physiological_stability: 60, dropout_risk: 20, regression_risk: 20, cluster_type: "behavioral_unstable", longitudinal_stability: 60 })).toBe("limited_automation");
    });

    it("returns adaptive_safe_zone for moderate safe patient", () => {
      expect(classifyAutomationZone({ prediction_confidence: 70, performance_level: 50, physiological_stability: 60, dropout_risk: 20, regression_risk: 20, cluster_type: "stable", longitudinal_stability: 55 })).toBe("adaptive_safe_zone");
    });

    it("returns high_confidence_auto_zone for ideal patient", () => {
      expect(classifyAutomationZone({ prediction_confidence: 90, performance_level: 80, physiological_stability: 85, dropout_risk: 10, regression_risk: 8, cluster_type: "responsive", longitudinal_stability: 75 })).toBe("high_confidence_auto_zone");
    });

    it("athlete with high stability gets high confidence zone", () => {
      expect(classifyAutomationZone({ prediction_confidence: 92, performance_level: 88, physiological_stability: 90, dropout_risk: 5, regression_risk: 5, cluster_type: "athletic", longitudinal_stability: 85 })).toBe("high_confidence_auto_zone");
    });
  });

  describe("Safety Gate", () => {
    it("blocks automation for no_automation zone", () => {
      expect(isSafeToAutoAdjust("no_automation", false, false)).toBe(false);
    });

    it("blocks automation for limited zone", () => {
      expect(isSafeToAutoAdjust("limited_automation", false, false)).toBe(false);
    });

    it("blocks automation with critical alerts", () => {
      expect(isSafeToAutoAdjust("adaptive_safe_zone", true, false)).toBe(false);
    });

    it("blocks automation with recent regression", () => {
      expect(isSafeToAutoAdjust("high_confidence_auto_zone", false, true)).toBe(false);
    });

    it("allows automation in adaptive safe zone without issues", () => {
      expect(isSafeToAutoAdjust("adaptive_safe_zone", false, false)).toBe(true);
    });

    it("allows automation in high confidence zone", () => {
      expect(isSafeToAutoAdjust("high_confidence_auto_zone", false, false)).toBe(true);
    });
  });

  describe("Eligible Adjustments", () => {
    it("suggests caloric decrease on stagnation with good adherence", () => {
      const adjs = identifyEligible("adaptive_safe_zone", 60, 80, "stagnated", 20);
      expect(adjs.some(a => a.type === "caloric_micro_adjustment" && a.driver === "weight_stagnation")).toBe(true);
    });

    it("suggests caloric increase on fast loss", () => {
      const adjs = identifyEligible("adaptive_safe_zone", 75, 85, "fast_loss", 18);
      expect(adjs.some(a => a.driver === "rapid_weight_loss")).toBe(true);
    });

    it("suggests behavioral reinforcement on moderate adherence drop", () => {
      const adjs = identifyEligible("adaptive_safe_zone", 50, 60, null, 20);
      expect(adjs.some(a => a.type === "behavioral_reinforcement")).toBe(true);
    });

    it("suggests monitoring extension for early good response", () => {
      const adjs = identifyEligible("adaptive_safe_zone", 70, 80, null, 10);
      expect(adjs.some(a => a.type === "monitoring_extension")).toBe(true);
    });

    it("returns no adjustments for limited zone", () => {
      expect(identifyEligible("limited_automation", 80, 80, "stagnated", 30)).toHaveLength(0);
    });

    it("suggests meal distribution only in high confidence zone", () => {
      const adjs = identifyEligible("high_confidence_auto_zone", 80, 85, "stagnated", 25);
      expect(adjs.some(a => a.type === "meal_distribution_adjustment")).toBe(true);
    });
  });

  describe("Reversal Logic", () => {
    it("reverses on weight regression", () => {
      expect(shouldReverse(0, false, false, true).reverse).toBe(true);
    });

    it("reverses on significant adherence drop", () => {
      expect(shouldReverse(-20, false, false, false).reverse).toBe(true);
    });

    it("reverses on clinical risk increase", () => {
      expect(shouldReverse(0, true, false, false).reverse).toBe(true);
    });

    it("reverses on physiological decline", () => {
      expect(shouldReverse(0, false, true, false).reverse).toBe(true);
    });

    it("does not reverse when everything is stable", () => {
      expect(shouldReverse(0, false, false, false).reverse).toBe(false);
    });
  });

  describe("Scenario Integration", () => {
    it("stable patient with high confidence → micro adjustment applied", () => {
      const zone = classifyAutomationZone({ prediction_confidence: 85, performance_level: 70, physiological_stability: 80, dropout_risk: 10, regression_risk: 10, cluster_type: "responsive", longitudinal_stability: 70 });
      expect(zone).toBe("high_confidence_auto_zone");
      expect(isSafeToAutoAdjust(zone, false, false)).toBe(true);
      const adjs = identifyEligible(zone, 70, 82, "stagnated", 21);
      expect(adjs.length).toBeGreaterThan(0);
    });

    it("critical alert patient → automation blocked", () => {
      const zone = classifyAutomationZone({ prediction_confidence: 85, performance_level: 70, physiological_stability: 80, dropout_risk: 10, regression_risk: 10, cluster_type: "responsive", longitudinal_stability: 70 });
      expect(isSafeToAutoAdjust(zone, true, false)).toBe(false);
    });

    it("adjustment followed by adherence drop → reversal triggered", () => {
      const result = shouldReverse(-18, false, false, false);
      expect(result.reverse).toBe(true);
      expect(result.reason).toBe("significant_adherence_drop");
    });

    it("behavioral_unstable cluster → restricted automation", () => {
      const zone = classifyAutomationZone({ prediction_confidence: 75, performance_level: 60, physiological_stability: 65, dropout_risk: 25, regression_risk: 20, cluster_type: "behavioral_unstable", longitudinal_stability: 55 });
      expect(zone).toBe("limited_automation");
      expect(isSafeToAutoAdjust(zone, false, false)).toBe(false);
    });

    it("athlete with stability → safe automation", () => {
      const zone = classifyAutomationZone({ prediction_confidence: 92, performance_level: 88, physiological_stability: 90, dropout_risk: 5, regression_risk: 5, cluster_type: "athletic", longitudinal_stability: 85 });
      expect(zone).toBe("high_confidence_auto_zone");
      const adjs = identifyEligible(zone, 88, 90, "slow_loss", 28);
      expect(adjs.length).toBeGreaterThan(0);
    });
  });
});
