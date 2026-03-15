import { describe, it, expect } from "vitest";

// ─── Pure functions mirroring edge function logic ───────────

function classifyResult(avgWeight: number, avgAdherence: number, dropoutRate: number, regressionRate: number): string {
  if (dropoutRate > 40 || regressionRate > 30) return "high_risk_effect";
  if (avgWeight < -1.5 && avgAdherence > 5 && dropoutRate < 15) return "strong_positive_effect";
  if (avgWeight < -0.5 && avgAdherence > 0) return "moderate_positive_effect";
  if (avgWeight > 0.5 || avgAdherence < -10) return "negative_effect";
  return "neutral_effect";
}

function computeSignalStrength(patientsCount: number, avgWeightChange: number, avgAdherenceChange: number): number {
  if (patientsCount < 5) return Math.min(patientsCount * 5, 25);
  const effectMagnitude = Math.abs(avgWeightChange) * 10 + Math.abs(avgAdherenceChange) * 2;
  const sampleBonus = Math.min(patientsCount * 2, 40);
  return Math.min(Math.round(effectMagnitude + sampleBonus), 100);
}

function pickBestGroup(groups: { avgWeight: number; avgAdherence: number; dropoutRate: number; regressionRate: number }[]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const score = -g.avgWeight * 10 + g.avgAdherence * 2 - g.dropoutRate - g.regressionRate;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

// ─── Tests ──────────────────────────────────────────────────

describe("Clinical Experimentation Engine v1.0.0", () => {
  describe("Result classification", () => {
    it("strong positive: significant weight loss + adherence up + low dropout", () => {
      expect(classifyResult(-2.5, 10, 8, 5)).toBe("strong_positive_effect");
    });

    it("moderate positive: modest weight loss + adherence up", () => {
      expect(classifyResult(-0.8, 3, 10, 5)).toBe("moderate_positive_effect");
    });

    it("neutral: no significant change", () => {
      expect(classifyResult(-0.2, -2, 10, 10)).toBe("neutral_effect");
    });

    it("negative: weight gain or adherence drop", () => {
      expect(classifyResult(1.0, -5, 10, 5)).toBe("negative_effect");
      expect(classifyResult(0.2, -15, 10, 5)).toBe("negative_effect");
    });

    it("high risk: excessive dropout", () => {
      expect(classifyResult(-2.0, 10, 45, 5)).toBe("high_risk_effect");
    });

    it("high risk: excessive regression", () => {
      expect(classifyResult(-1.0, 5, 10, 35)).toBe("high_risk_effect");
    });
  });

  describe("Signal strength", () => {
    it("small sample → weak signal", () => {
      const signal = computeSignalStrength(3, -2.0, 8);
      expect(signal).toBeLessThanOrEqual(25);
    });

    it("large sample + strong effect → strong signal", () => {
      const signal = computeSignalStrength(25, -3.0, 15);
      expect(signal).toBeGreaterThan(60);
    });

    it("large sample + weak effect → moderate signal", () => {
      const signal = computeSignalStrength(20, -0.2, 1);
      expect(signal).toBeGreaterThan(30);
      expect(signal).toBeLessThan(70);
    });

    it("capped at 100", () => {
      const signal = computeSignalStrength(50, -5.0, 30);
      expect(signal).toBeLessThanOrEqual(100);
    });
  });

  describe("Scenario 1: Caloric reduction vs diet break", () => {
    it("diet break wins for resistant cluster with stagnation", () => {
      const groups = [
        { avgWeight: -0.3, avgAdherence: -5, dropoutRate: 12, regressionRate: 5 }, // reduction
        { avgWeight: -1.2, avgAdherence: 8, dropoutRate: 5, regressionRate: 3 },   // diet break
      ];
      const best = pickBestGroup(groups);
      expect(best).toBe(1); // diet break
    });
  });

  describe("Scenario 2: Simplification for behavioral cluster", () => {
    it("simplification shows adherence improvement", () => {
      const result = classifyResult(-0.6, 12, 8, 3);
      expect(result).toBe("moderate_positive_effect");
    });
  });

  describe("Scenario 3: No relevant effect", () => {
    it("neutral when changes are minimal", () => {
      const result = classifyResult(-0.1, 1, 12, 8);
      expect(result).toBe("neutral_effect");
    });
  });

  describe("Scenario 4: Negative effect experiment", () => {
    it("detects weight gain as negative", () => {
      const result = classifyResult(0.8, -3, 15, 10);
      expect(result).toBe("negative_effect");
    });
  });

  describe("Scenario 5: High dropout experiment", () => {
    it("flags high dropout even with weight loss", () => {
      const result = classifyResult(-2.0, 5, 50, 10);
      expect(result).toBe("high_risk_effect");
    });
  });

  describe("Scenario 6: Exceptional response", () => {
    it("strong positive with large effect", () => {
      const result = classifyResult(-3.5, 18, 3, 2);
      expect(result).toBe("strong_positive_effect");
      const signal = computeSignalStrength(20, -3.5, 18);
      expect(signal).toBeGreaterThan(70);
    });
  });

  describe("Best group selection", () => {
    it("selects group with best composite score", () => {
      const groups = [
        { avgWeight: -0.5, avgAdherence: 2, dropoutRate: 15, regressionRate: 10 },
        { avgWeight: -2.0, avgAdherence: 10, dropoutRate: 5, regressionRate: 3 },
        { avgWeight: 0.2, avgAdherence: -3, dropoutRate: 20, regressionRate: 15 },
      ];
      expect(pickBestGroup(groups)).toBe(1);
    });

    it("avoids group with high dropout despite weight loss", () => {
      const groups = [
        { avgWeight: -3.0, avgAdherence: -5, dropoutRate: 45, regressionRate: 20 },
        { avgWeight: -1.0, avgAdherence: 5, dropoutRate: 8, regressionRate: 5 },
      ];
      expect(pickBestGroup(groups)).toBe(1);
    });
  });
});
