import { describe, it, expect } from "vitest";

// ── Pure functions mirroring edge function logic ────────────

function getCalorieRange(cal: number | null): string {
  if (!cal || cal <= 0) return "unknown";
  if (cal < 1200) return "<1200";
  if (cal < 1500) return "1200-1500";
  if (cal < 1800) return "1500-1800";
  if (cal < 2100) return "1800-2100";
  if (cal < 2500) return "2100-2500";
  return "2500+";
}

function getAdherenceBand(adh: number): string {
  if (adh >= 85) return "high";
  if (adh >= 60) return "moderate";
  if (adh >= 35) return "low";
  return "very_low";
}

function classifyBenchmark(percentile: number): string {
  if (percentile >= 90) return "exceptional_responder";
  if (percentile >= 70) return "above_average";
  if (percentile >= 40) return "average";
  if (percentile >= 20) return "below_average";
  return "underperforming";
}

function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  const rank = sorted.filter(v => v < value).length;
  return Math.round((rank / sorted.length) * 100);
}

function generateCohortSlug(sig: Record<string, string>): string {
  return Object.entries(sig)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

function shouldAnalyze(cohortSize: number, minSize = 20): boolean {
  return cohortSize >= minSize;
}

function computeSuccessRate(adherence: number, stagnation: number, dropout: number, metabolicResponse: number): number {
  return Math.max(0, Math.min(100, adherence * 0.4 + (100 - stagnation) * 0.3 + (100 - dropout) * 0.2 + metabolicResponse * 0.1));
}

function getEvidenceStrength(sampleSize: number): string {
  if (sampleSize >= 30) return "high";
  if (sampleSize >= 15) return "medium";
  return "low";
}

interface PatientMetrics {
  adherence: number;
  performance: number;
  weightChange: number;
  isStagnated: boolean;
  isDropout: boolean;
  isRegressed: boolean;
}

function detectPatterns(metrics: PatientMetrics[], cohortLabel: string) {
  const n = metrics.length;
  const avgAdh = metrics.reduce((s, m) => s + m.adherence, 0) / n;
  const avgPerf = metrics.reduce((s, m) => s + m.performance, 0) / n;
  const stagRate = (metrics.filter(m => m.isStagnated).length / n) * 100;
  const dropRate = (metrics.filter(m => m.isDropout).length / n) * 100;
  const regRate = (metrics.filter(m => m.isRegressed).length / n) * 100;

  const patterns: string[] = [];
  if (avgAdh < 50 && stagRate > 30) patterns.push("low_adherence_stagnation_link");
  if (avgAdh >= 75 && avgPerf >= 65) patterns.push("high_performance_protocol");
  if (dropRate > 20) patterns.push("dropout_risk_pattern");
  if (stagRate > 40) patterns.push("aggressive_deficit_stagnation");
  if (regRate > 15) patterns.push("regression_risk_pattern");

  return { patterns, avgAdh, avgPerf, stagRate, dropRate, regRate };
}

// ── Tests ───────────────────────────────────────────────────

describe("Population Nutrition Intelligence Engine v1.0.0", () => {
  describe("Cohort Slug Generation", () => {
    it("generates deterministic slugs regardless of key order", () => {
      const s1 = generateCohortSlug({ goal: "weight_loss", caloric_band: "1500-1800", cluster: "adaptive" });
      const s2 = generateCohortSlug({ cluster: "adaptive", goal: "weight_loss", caloric_band: "1500-1800" });
      expect(s1).toBe(s2);
    });
  });

  describe("Calorie Range Classification", () => {
    it("classifies null as unknown", () => expect(getCalorieRange(null)).toBe("unknown"));
    it("classifies <1200", () => expect(getCalorieRange(1100)).toBe("<1200"));
    it("classifies 1200-1500", () => expect(getCalorieRange(1350)).toBe("1200-1500"));
    it("classifies 1500-1800", () => expect(getCalorieRange(1700)).toBe("1500-1800"));
    it("classifies 2500+", () => expect(getCalorieRange(3000)).toBe("2500+"));
  });

  describe("Adherence Band", () => {
    it("high band ≥85", () => expect(getAdherenceBand(90)).toBe("high"));
    it("moderate band ≥60", () => expect(getAdherenceBand(65)).toBe("moderate"));
    it("low band ≥35", () => expect(getAdherenceBand(40)).toBe("low"));
    it("very_low band <35", () => expect(getAdherenceBand(20)).toBe("very_low"));
  });

  describe("Benchmark Classification", () => {
    it("P95 → exceptional_responder", () => expect(classifyBenchmark(95)).toBe("exceptional_responder"));
    it("P75 → above_average", () => expect(classifyBenchmark(75)).toBe("above_average"));
    it("P50 → average", () => expect(classifyBenchmark(50)).toBe("average"));
    it("P25 → below_average", () => expect(classifyBenchmark(25)).toBe("below_average"));
    it("P10 → underperforming", () => expect(classifyBenchmark(10)).toBe("underperforming"));
  });

  describe("Percentile Computation", () => {
    it("handles empty array", () => expect(computePercentile(50, [])).toBe(50));
    it("min value → P0", () => expect(computePercentile(10, [10, 20, 30, 40, 50])).toBe(0));
    it("max value → P80 (4/5)", () => expect(computePercentile(50, [10, 20, 30, 40, 50])).toBe(80));
    it("mid value → P40 (2/5)", () => expect(computePercentile(30, [10, 20, 30, 40, 50])).toBe(40));
  });

  describe("Cohort Minimum Size Gate", () => {
    it("cohort of 10 → no analysis", () => expect(shouldAnalyze(10)).toBe(false));
    it("cohort of 19 → no analysis", () => expect(shouldAnalyze(19)).toBe(false));
    it("cohort of 20 → analysis enabled", () => expect(shouldAnalyze(20)).toBe(true));
    it("cohort of 50 → analysis enabled", () => expect(shouldAnalyze(50)).toBe(true));
  });

  describe("Success Rate Calculation", () => {
    it("perfect scenario → ~100", () => {
      const rate = computeSuccessRate(100, 0, 0, 100);
      expect(rate).toBe(100);
    });

    it("worst scenario → 0", () => {
      const rate = computeSuccessRate(0, 100, 100, 0);
      expect(rate).toBe(0);
    });

    it("balanced scenario → ~50", () => {
      const rate = computeSuccessRate(50, 50, 50, 50);
      expect(rate).toBeGreaterThan(30);
      expect(rate).toBeLessThan(70);
    });
  });

  describe("Evidence Strength", () => {
    it("n≥30 → high", () => expect(getEvidenceStrength(35)).toBe("high"));
    it("n≥15 → medium", () => expect(getEvidenceStrength(20)).toBe("medium"));
    it("n<15 → low", () => expect(getEvidenceStrength(10)).toBe("low"));
  });

  describe("Scenario: Robust cohort with superior protocol", () => {
    it("detects high performance pattern", () => {
      const members: PatientMetrics[] = Array.from({ length: 25 }, () => ({
        adherence: 82, performance: 75, weightChange: -0.5,
        isStagnated: false, isDropout: false, isRegressed: false,
      }));
      const { patterns } = detectPatterns(members, "test");
      expect(patterns).toContain("high_performance_protocol");
      expect(patterns).not.toContain("dropout_risk_pattern");
    });
  });

  describe("Scenario: Small cohort → limited insights", () => {
    it("cohort of 10 should not trigger full analysis", () => {
      expect(shouldAnalyze(10)).toBe(false);
    });
  });

  describe("Scenario: Good adherence but poor response", () => {
    it("high adherence without stagnation → no stagnation pattern", () => {
      const members: PatientMetrics[] = Array.from({ length: 25 }, () => ({
        adherence: 80, performance: 40, weightChange: -0.1,
        isStagnated: false, isDropout: false, isRegressed: false,
      }));
      const { patterns, avgPerf } = detectPatterns(members, "test");
      expect(patterns).not.toContain("low_adherence_stagnation_link");
      expect(avgPerf).toBeLessThan(65);
    });
  });

  describe("Scenario: High response with high dropout", () => {
    it("detects dropout risk", () => {
      const members: PatientMetrics[] = [
        ...Array.from({ length: 15 }, () => ({
          adherence: 85, performance: 80, weightChange: -0.8,
          isStagnated: false, isDropout: false, isRegressed: false,
        })),
        ...Array.from({ length: 10 }, () => ({
          adherence: 20, performance: 20, weightChange: 0,
          isStagnated: true, isDropout: true, isRegressed: false,
        })),
      ];
      const { patterns } = detectPatterns(members, "test");
      expect(patterns).toContain("dropout_risk_pattern");
    });
  });

  describe("Scenario: Exceptional individual benchmark", () => {
    it("top performer gets P≥80", () => {
      const allPerfs = [30, 40, 45, 50, 55, 60, 65, 70, 75, 95];
      const perc = computePercentile(95, allPerfs);
      expect(perc).toBeGreaterThanOrEqual(80);
      expect(classifyBenchmark(perc)).toBe("exceptional_responder");
    });
  });

  describe("Scenario: At-risk individual benchmark", () => {
    it("worst performer gets P≤20", () => {
      const allPerfs = [30, 40, 45, 50, 55, 60, 65, 70, 75, 95];
      const perc = computePercentile(30, allPerfs);
      expect(perc).toBeLessThanOrEqual(20);
      expect(["below_average", "underperforming"]).toContain(classifyBenchmark(perc));
    });
  });

  describe("Pattern Detection", () => {
    it("low adherence + high stagnation → link pattern", () => {
      const members: PatientMetrics[] = Array.from({ length: 20 }, (_, i) => ({
        adherence: 35, performance: 40, weightChange: 0,
        isStagnated: i < 8, isDropout: false, isRegressed: false,
      }));
      const { patterns } = detectPatterns(members, "test");
      expect(patterns).toContain("low_adherence_stagnation_link");
    });

    it("high regression rate → regression pattern", () => {
      const members: PatientMetrics[] = Array.from({ length: 20 }, (_, i) => ({
        adherence: 60, performance: 50, weightChange: 0.2,
        isStagnated: false, isDropout: false, isRegressed: i < 5,
      }));
      const { patterns } = detectPatterns(members, "test");
      expect(patterns).toContain("regression_risk_pattern");
    });
  });
});
