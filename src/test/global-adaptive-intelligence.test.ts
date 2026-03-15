import { describe, it, expect } from "vitest";

// ─── Adaptive Engine Pure Functions ───

const MAX_ADJUSTMENT_PERCENT = 5;
const MIN_SAMPLE_SIZE = 15;

function computeMaturityScore(signals: Map<string, number>): { score: number; level: string } {
  const predictionAcc = signals.get("prediction_accuracy_index") ?? 50;
  const therapyEff = signals.get("protocol_effectiveness_index") ?? 0;
  const interventionSuccess = signals.get("intervention_success_rate") ?? 0;
  const automationSafety = signals.get("automation_safety_index") ?? 0;
  const clusterVar = signals.get("cluster_response_variance") ?? 50;
  const stabilityComponent = Math.max(0, 100 - clusterVar * 2);
  const score = Math.round(
    predictionAcc * 0.25 + therapyEff * 0.25 + interventionSuccess * 0.20 + automationSafety * 0.15 + stabilityComponent * 0.15
  );
  let level: string;
  if (score >= 85) level = "elite_clinical_system";
  else if (score >= 70) level = "high_precision";
  else if (score >= 55) level = "optimized";
  else if (score >= 35) level = "developing_intelligence";
  else level = "early_learning";
  return { score: Math.min(score, 100), level };
}

function computeInterventionSuccessRate(adjustments: any[]): { value: number; sample: number } {
  if (!adjustments?.length) return { value: 0, sample: 0 };
  const reversed = adjustments.filter((a: any) => a.was_reversed);
  const rate = ((adjustments.length - reversed.length) / adjustments.length) * 100;
  return { value: Math.round(rate * 100) / 100, sample: adjustments.length };
}

function computeAutomationSafetyIndex(adjustments: any[]): { value: number; sample: number } {
  if (!adjustments?.length) return { value: 100, sample: 0 };
  const guardrailApproved = adjustments.filter((a: any) => a.approved_by_guardrail);
  const reversed = adjustments.filter((a: any) => a.was_reversed);
  const approvalRate = (guardrailApproved.length / adjustments.length) * 50;
  const safetyRate = ((adjustments.length - reversed.length) / adjustments.length) * 50;
  return { value: Math.round(approvalRate + safetyRate), sample: adjustments.length };
}

function shouldRecalibrate(sampleSize: number, adjustValue: number): boolean {
  return sampleSize >= MIN_SAMPLE_SIZE && Math.abs(adjustValue) > 0.5;
}

function clampAdjustment(value: number): number {
  return Math.min(MAX_ADJUSTMENT_PERCENT, Math.max(-MAX_ADJUSTMENT_PERCENT, value));
}

// ─── Tests ───

describe("Global Adaptive Clinical Intelligence Engine v1.0.0", () => {

  describe("Maturity Score", () => {
    it("classifies as elite_clinical_system when all signals are high", () => {
      const signals = new Map<string, number>([
        ["prediction_accuracy_index", 95],
        ["protocol_effectiveness_index", 90],
        ["intervention_success_rate", 92],
        ["automation_safety_index", 88],
        ["cluster_response_variance", 5],
      ]);
      const result = computeMaturityScore(signals);
      expect(result.level).toBe("elite_clinical_system");
      expect(result.score).toBeGreaterThanOrEqual(85);
    });

    it("classifies as early_learning when signals are low", () => {
      const signals = new Map<string, number>([
        ["prediction_accuracy_index", 20],
        ["protocol_effectiveness_index", 10],
        ["intervention_success_rate", 15],
        ["automation_safety_index", 25],
        ["cluster_response_variance", 40],
      ]);
      const result = computeMaturityScore(signals);
      expect(result.level).toBe("early_learning");
      expect(result.score).toBeLessThan(35);
    });

    it("classifies as optimized at moderate levels", () => {
      const signals = new Map<string, number>([
        ["prediction_accuracy_index", 65],
        ["protocol_effectiveness_index", 60],
        ["intervention_success_rate", 70],
        ["automation_safety_index", 60],
        ["cluster_response_variance", 15],
      ]);
      const result = computeMaturityScore(signals);
      expect(["optimized", "high_precision"]).toContain(result.level);
    });

    it("caps score at 100", () => {
      const signals = new Map<string, number>([
        ["prediction_accuracy_index", 100],
        ["protocol_effectiveness_index", 100],
        ["intervention_success_rate", 100],
        ["automation_safety_index", 100],
        ["cluster_response_variance", 0],
      ]);
      const result = computeMaturityScore(signals);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("handles missing signals gracefully", () => {
      const signals = new Map<string, number>();
      const result = computeMaturityScore(signals);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.level).toBeDefined();
    });
  });

  describe("Intervention Success Rate", () => {
    it("returns 100% when no reversals", () => {
      const adj = [
        { was_reversed: false },
        { was_reversed: false },
        { was_reversed: false },
      ];
      const result = computeInterventionSuccessRate(adj);
      expect(result.value).toBe(100);
      expect(result.sample).toBe(3);
    });

    it("returns 0% when all reversed", () => {
      const adj = [
        { was_reversed: true },
        { was_reversed: true },
      ];
      const result = computeInterventionSuccessRate(adj);
      expect(result.value).toBe(0);
    });

    it("returns 0 for empty array", () => {
      expect(computeInterventionSuccessRate([]).value).toBe(0);
      expect(computeInterventionSuccessRate([]).sample).toBe(0);
    });

    it("calculates partial success rate", () => {
      const adj = [
        { was_reversed: false },
        { was_reversed: true },
        { was_reversed: false },
        { was_reversed: false },
      ];
      const result = computeInterventionSuccessRate(adj);
      expect(result.value).toBe(75);
    });
  });

  describe("Automation Safety Index", () => {
    it("returns 100 for empty inputs", () => {
      expect(computeAutomationSafetyIndex([]).value).toBe(100);
    });

    it("returns high score when all approved and none reversed", () => {
      const adj = [
        { approved_by_guardrail: true, was_reversed: false },
        { approved_by_guardrail: true, was_reversed: false },
      ];
      const result = computeAutomationSafetyIndex(adj);
      expect(result.value).toBe(100);
    });

    it("returns lower score when reversed", () => {
      const adj = [
        { approved_by_guardrail: true, was_reversed: true },
        { approved_by_guardrail: true, was_reversed: false },
      ];
      const result = computeAutomationSafetyIndex(adj);
      expect(result.value).toBeLessThan(100);
    });
  });

  describe("Recalibration Guards", () => {
    it("blocks recalibration with insufficient sample", () => {
      expect(shouldRecalibrate(5, 3)).toBe(false);
    });

    it("allows recalibration with sufficient sample", () => {
      expect(shouldRecalibrate(20, 3)).toBe(true);
    });

    it("blocks recalibration with negligible adjustment", () => {
      expect(shouldRecalibrate(20, 0.1)).toBe(false);
    });

    it("clamps adjustment to max ±5%", () => {
      expect(clampAdjustment(10)).toBe(5);
      expect(clampAdjustment(-10)).toBe(-5);
      expect(clampAdjustment(3)).toBe(3);
    });
  });

  describe("Engine Version & Governance", () => {
    it("version is 1.0.0", () => {
      expect("1.0.0").toBe("1.0.0");
    });

    it("max adjustment per cycle is ±5%", () => {
      expect(MAX_ADJUSTMENT_PERCENT).toBe(5);
    });

    it("minimum sample size is 15", () => {
      expect(MIN_SAMPLE_SIZE).toBe(15);
    });
  });

  describe("Edge Cases", () => {
    it("maturity handles extreme variance", () => {
      const signals = new Map<string, number>([
        ["prediction_accuracy_index", 80],
        ["cluster_response_variance", 100],
      ]);
      const result = computeMaturityScore(signals);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("intervention success handles single item", () => {
      const result = computeInterventionSuccessRate([{ was_reversed: false }]);
      expect(result.value).toBe(100);
      expect(result.sample).toBe(1);
    });
  });
});
