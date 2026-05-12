import { describe, it, expect } from "vitest";

// ─── Pure functions mirroring edge function logic ───────────────

function classifyBenchmark(relativeScore: number): string {
  if (relativeScore >= 1.3) return "resposta_excepcional";
  if (relativeScore >= 1.05) return "acima_da_media";
  if (relativeScore >= 0.85) return "dentro_da_media";
  if (relativeScore >= 0.6) return "abaixo_da_media";
  return "resposta_preocupante";
}

function generateCohortKey(sig: Record<string, string>): string {
  return Object.entries(sig).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join("|");
}

function shouldBenchmark(cohortSize: number, minSize = 15): boolean {
  return cohortSize >= minSize;
}

function computeRelativeScore(patientValue: number, cohortAvg: number): number {
  if (cohortAvg <= 0) return 1;
  return Math.round((patientValue / cohortAvg) * 100) / 100;
}

function generateInsights(metrics: {
  avg_adherence: number;
  stagnation_rate: number;
  dropout_rate: number;
  avg_performance_score: number;
  sample_size: number;
}): string[] {
  const insights: string[] = [];
  if (metrics.avg_adherence >= 75) insights.push("high_adherence_cohort");
  if (metrics.stagnation_rate > 40) insights.push("high_stagnation_alert");
  if (metrics.avg_performance_score >= 70) insights.push("high_performance_cohort");
  if (metrics.dropout_rate > 25) insights.push("dropout_risk_cohort");
  return insights;
}

// ─── Test Scenarios ─────────────────────────────────────────────

describe("Population Intelligence Engine v1.0.0", () => {
  describe("Cohort Key Generation", () => {
    it("generates deterministic keys regardless of input order", () => {
      const key1 = generateCohortKey({ goal: "weight_loss", cluster: "responder" });
      const key2 = generateCohortKey({ cluster: "responder", goal: "weight_loss" });
      expect(key1).toBe(key2);
    });
  });

  describe("Benchmark Classification", () => {
    it("classifies exceptional response", () => {
      expect(classifyBenchmark(1.5)).toBe("resposta_excepcional");
    });

    it("classifies above average", () => {
      expect(classifyBenchmark(1.1)).toBe("acima_da_media");
    });

    it("classifies within average", () => {
      expect(classifyBenchmark(1.0)).toBe("dentro_da_media");
    });

    it("classifies below average", () => {
      expect(classifyBenchmark(0.7)).toBe("abaixo_da_media");
    });

    it("classifies concerning response", () => {
      expect(classifyBenchmark(0.4)).toBe("resposta_preocupante");
    });
  });

  describe("Scenario: Patient above population average", () => {
    it("relative score > 1.05 → acima_da_media", () => {
      const rel = computeRelativeScore(85, 70);
      expect(rel).toBeGreaterThan(1.05);
      expect(classifyBenchmark(rel)).toBe("acima_da_media");
    });
  });

  describe("Scenario: Patient below population average", () => {
    it("relative score < 0.85 → abaixo_da_media or worse", () => {
      const rel = computeRelativeScore(40, 70);
      expect(rel).toBeLessThan(0.85);
      expect(["abaixo_da_media", "resposta_preocupante"]).toContain(classifyBenchmark(rel));
    });
  });

  describe("Scenario: Small cohort → no benchmark", () => {
    it("cohort of 10 should NOT generate benchmarks", () => {
      expect(shouldBenchmark(10)).toBe(false);
    });

    it("cohort of 15 should generate benchmarks", () => {
      expect(shouldBenchmark(15)).toBe(true);
    });

    it("cohort of 50 should generate benchmarks", () => {
      expect(shouldBenchmark(50)).toBe(true);
    });
  });

  describe("Scenario: Protocol with exceptional response", () => {
    it("high performance cohort generates insight", () => {
      const types = generateInsights({
        avg_adherence: 82,
        stagnation_rate: 10,
        dropout_rate: 5,
        avg_performance_score: 78,
        sample_size: 25,
      });
      expect(types).toContain("high_adherence_cohort");
      expect(types).toContain("high_performance_cohort");
      expect(types).not.toContain("high_stagnation_alert");
    });
  });

  describe("Scenario: Cluster with population risk", () => {
    it("high stagnation and dropout generates alerts", () => {
      const types = generateInsights({
        avg_adherence: 50,
        stagnation_rate: 55,
        dropout_rate: 30,
        avg_performance_score: 40,
        sample_size: 20,
      });
      expect(types).toContain("high_stagnation_alert");
      expect(types).toContain("dropout_risk_cohort");
      expect(types).not.toContain("high_performance_cohort");
    });
  });

  describe("Relative Score Computation", () => {
    it("handles zero cohort average gracefully", () => {
      expect(computeRelativeScore(50, 0)).toBe(1);
    });

    it("correct ratio calculation", () => {
      expect(computeRelativeScore(80, 80)).toBe(1);
      expect(computeRelativeScore(100, 50)).toBe(2);
    });
  });
});
