import { describe, it, expect } from "vitest";

// ─── Pure functions replicated from engine for testing ───

function classifySilhouette(bodyFat: number): string {
  if (bodyFat >= 35) return "high_adiposity";
  if (bodyFat >= 25) return "moderate_adiposity";
  if (bodyFat >= 18) return "lean_transition";
  if (bodyFat >= 12) return "athletic";
  return "high_definition";
}

function classifyResponsePattern(avgChange: number, volatility: number): string {
  if (Math.abs(avgChange) < 0.05 && volatility < 0.3) return "non_responsive";
  if (avgChange < -0.5 && volatility < 0.5) return "consistent_responder";
  if (avgChange < -0.3) return "moderate_responder";
  if (avgChange < 0 && volatility > 0.8) return "volatile_responder";
  if (avgChange >= 0) return "gaining_pattern";
  return "slow_responder";
}

function classifyMetabolicResponse(avgChange: number, plateaus: number, dataPoints: number): string {
  if (dataPoints < 3) return "insufficient_data";
  if (plateaus >= 3 && avgChange > -0.2) return "plateau_dominant";
  if (avgChange < -0.7) return "high_metabolic_response";
  if (avgChange < -0.3) return "moderate_metabolic_response";
  if (avgChange < -0.1) return "low_metabolic_response";
  return "metabolic_resistance";
}

function detectPlateaus(weights: { weight: number; date: string }[]): number {
  if (weights.length < 4) return 0;
  let plateauCount = 0;
  const windowSize = 3;
  for (let i = windowSize; i < weights.length; i++) {
    const window = weights.slice(i - windowSize, i + 1);
    const maxW = Math.max(...window.map(w => w.weight));
    const minW = Math.min(...window.map(w => w.weight));
    if (maxW - minW < 0.3) plateauCount++;
  }
  return plateauCount;
}

function computeVolatility(weights: number[]): number {
  if (weights.length < 3) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < weights.length; i++) diffs.push(Math.abs(weights[i] - weights[i - 1]));
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

describe("Weight Trajectory Engine v1.0.0", () => {
  // ── Silhouette Classification ──
  describe("Silhouette Classification", () => {
    it("classifies high adiposity", () => expect(classifySilhouette(40)).toBe("high_adiposity"));
    it("classifies moderate adiposity", () => expect(classifySilhouette(28)).toBe("moderate_adiposity"));
    it("classifies lean transition", () => expect(classifySilhouette(20)).toBe("lean_transition"));
    it("classifies athletic", () => expect(classifySilhouette(14)).toBe("athletic"));
    it("classifies high definition", () => expect(classifySilhouette(10)).toBe("high_definition"));
  });

  // ── Response Pattern ──
  describe("Response Pattern Classification", () => {
    it("detects consistent responder", () => expect(classifyResponsePattern(-0.6, 0.3)).toBe("consistent_responder"));
    it("detects moderate responder", () => expect(classifyResponsePattern(-0.4, 0.6)).toBe("moderate_responder"));
    it("detects volatile responder", () => expect(classifyResponsePattern(-0.1, 1.0)).toBe("volatile_responder"));
    it("detects non-responsive", () => expect(classifyResponsePattern(0.02, 0.1)).toBe("non_responsive"));
    it("detects gaining pattern", () => expect(classifyResponsePattern(0.3, 0.2)).toBe("gaining_pattern"));
    it("detects slow responder", () => expect(classifyResponsePattern(-0.15, 0.5)).toBe("slow_responder"));
  });

  // ── Metabolic Response ──
  describe("Metabolic Response Classification", () => {
    it("returns insufficient data for < 3 points", () => expect(classifyMetabolicResponse(-0.5, 0, 2)).toBe("insufficient_data"));
    it("detects high metabolic response", () => expect(classifyMetabolicResponse(-0.8, 0, 10)).toBe("high_metabolic_response"));
    it("detects plateau dominant", () => expect(classifyMetabolicResponse(-0.1, 4, 10)).toBe("plateau_dominant"));
    it("detects metabolic resistance", () => expect(classifyMetabolicResponse(0.05, 1, 8)).toBe("metabolic_resistance"));
    it("detects low metabolic response", () => expect(classifyMetabolicResponse(-0.15, 0, 5)).toBe("low_metabolic_response"));
  });

  // ── Plateau Detection ──
  describe("Plateau Detection", () => {
    it("returns 0 for insufficient data", () => expect(detectPlateaus([{ weight: 80, date: "2025-01-01" }])).toBe(0));
    it("detects plateau in flat data", () => {
      const data = [
        { weight: 80.0, date: "2025-01-01" },
        { weight: 80.1, date: "2025-01-08" },
        { weight: 80.0, date: "2025-01-15" },
        { weight: 80.1, date: "2025-01-22" },
        { weight: 80.05, date: "2025-01-29" },
      ];
      expect(detectPlateaus(data)).toBeGreaterThan(0);
    });
    it("does not flag significant changes as plateau", () => {
      const data = [
        { weight: 85, date: "2025-01-01" },
        { weight: 83, date: "2025-01-08" },
        { weight: 81, date: "2025-01-15" },
        { weight: 79, date: "2025-01-22" },
      ];
      expect(detectPlateaus(data)).toBe(0);
    });
  });

  // ── Volatility ──
  describe("Volatility Computation", () => {
    it("returns 0 for < 3 data points", () => expect(computeVolatility([80, 79])).toBe(0));
    it("returns low volatility for consistent loss", () => {
      const v = computeVolatility([80, 79.5, 79, 78.5, 78]);
      expect(v).toBeLessThan(0.1);
    });
    it("returns higher volatility for yo-yo pattern", () => {
      const v = computeVolatility([80, 78, 81, 77, 82]);
      expect(v).toBeGreaterThan(0.5);
    });
  });

  // ── Scenario Tests ──
  describe("Clinical Scenarios", () => {
    it("Scenario 1: long history → stable projection", () => {
      const pattern = classifyResponsePattern(-0.6, 0.2);
      expect(pattern).toBe("consistent_responder");
      const metabolic = classifyMetabolicResponse(-0.4, 1, 20);
      expect(metabolic).toBe("moderate_metabolic_response");
    });

    it("Scenario 2: no history → low confidence", () => {
      const metabolic = classifyMetabolicResponse(0, 0, 1);
      expect(metabolic).toBe("insufficient_data");
    });

    it("Scenario 3: rapid loss → risk detection", () => {
      const metabolic = classifyMetabolicResponse(-1.0, 0, 10);
      expect(metabolic).toBe("high_metabolic_response");
    });

    it("Scenario 4: chronic stagnation → conservative", () => {
      const metabolic = classifyMetabolicResponse(-0.05, 5, 15);
      expect(metabolic).toBe("plateau_dominant");
    });

    it("Scenario 5: athlete → differentiated projection", () => {
      const silhouette = classifySilhouette(13);
      expect(silhouette).toBe("athletic");
      const pattern = classifyResponsePattern(-0.2, 0.15);
      expect(pattern).toBe("slow_responder");
    });
  });
});
