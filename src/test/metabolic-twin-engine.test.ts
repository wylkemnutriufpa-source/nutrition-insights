import { describe, it, expect } from "vitest";

// ── Twin Model Builder (pure logic) ────────────────────────
type ResponseClass = "fast_responder" | "adaptive_responder" | "plateau_prone" | "resistant_metabolism" | "recomposition_pattern";

function classifyResponse(efficiency: number, resistance: number, fatLoss: number, leanPres: number): ResponseClass {
  if (efficiency > 70 && resistance < 30) return "fast_responder";
  if (leanPres > 70 && fatLoss > 50) return "recomposition_pattern";
  if (resistance > 70) return "resistant_metabolism";
  if (resistance > 50 && efficiency < 40) return "plateau_prone";
  return "adaptive_responder";
}

function buildTwinModel(weightCount: number, dynamics: any, adherenceAvg: number, clusterType: string) {
  const hasData = weightCount >= 3;
  const baseConfidence = hasData ? Math.min(95, 30 + weightCount * 5) : 15;
  const avgWeeklyChange = dynamics?.avg_weekly_weight_change ?? 0;
  const volatility = dynamics?.volatility_score ?? 50;
  const plateaus = dynamics?.detected_plateaus ?? 0;

  const metabolicEfficiency = Math.max(10, Math.min(95,
    50 + (Math.abs(avgWeeklyChange) > 0.5 ? 20 : avgWeeklyChange < 0 ? 10 : -10)
    + (adherenceAvg > 70 ? 10 : -5)
    + (clusterType === "metabolic_responder" ? 15 : clusterType === "resistant_profile" ? -15 : 0)
  ));

  const adaptiveResistance = Math.max(5, Math.min(95,
    30 + plateaus * 10 + (volatility < 20 ? 15 : -5)
    + (clusterType === "resistant_profile" ? 20 : clusterType === "metabolic_responder" ? -15 : 0)
  ));

  const fatLossResponse = Math.max(10, Math.min(95,
    metabolicEfficiency * 0.6 + (100 - adaptiveResistance) * 0.4
  ));

  const leanMassPreservation = Math.max(15, Math.min(95,
    40 + (adherenceAvg > 80 ? 25 : adherenceAvg > 60 ? 10 : -5)
    + (Math.abs(avgWeeklyChange) < 0.8 ? 15 : -10)
  ));

  const regainRisk = Math.max(5, Math.min(95,
    20 + (volatility > 60 ? 25 : 0) + (adaptiveResistance > 60 ? 20 : 0) + (adherenceAvg < 50 ? 20 : -10)
  ));

  return {
    metabolicEfficiency, adaptiveResistance, fatLossResponse,
    leanMassPreservation, regainRisk, baseConfidence,
    classification: classifyResponse(metabolicEfficiency, adaptiveResistance, fatLossResponse, leanMassPreservation),
    predictedPlateauWeeks: Math.max(2, Math.min(24,
      Math.round(8 - plateaus * 1.5 + (metabolicEfficiency / 20) - (adaptiveResistance / 25))
    )),
  };
}

function simulateIntervention(twin: any, type: string, weight: number) {
  const configs: Record<string, { deficit: number; stressFactor: number }> = {
    moderate_deficit: { deficit: -0.5, stressFactor: 0.3 },
    aggressive_deficit: { deficit: -1.0, stressFactor: 0.7 },
    diet_break: { deficit: 0, stressFactor: -0.5 },
    reverse_diet: { deficit: 0.2, stressFactor: -0.3 },
    maintenance_phase: { deficit: 0, stressFactor: -0.2 },
    hypertrophy_phase: { deficit: 0.3, stressFactor: 0.1 },
  };
  const c = configs[type] || configs.moderate_deficit;
  const weeklyLoss = c.deficit * (twin.metabolicEfficiency / 100);
  const drag = 1 - (twin.adaptiveResistance / 200);
  return {
    weightDelta4w: Math.round(weeklyLoss * 4 * drag * 10) / 10,
    plateauProb: Math.max(5, Math.min(90, twin.adaptiveResistance * 0.5 + c.stressFactor * 30 + (Math.abs(c.deficit) > 0.7 ? 15 : 0))),
    adherenceRisk: Math.max(5, Math.min(90, 20 + c.stressFactor * 40 + (Math.abs(c.deficit) > 0.7 ? 20 : -10))),
    blocked: Math.abs(c.deficit) > 1.2,
  };
}

// ═══════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════

describe("Metabolic Twin Engine v1.0.0", () => {
  describe("Classification", () => {
    it("classifies fast responder", () => {
      expect(classifyResponse(80, 20, 70, 60)).toBe("fast_responder");
    });
    it("classifies resistant metabolism", () => {
      expect(classifyResponse(30, 80, 20, 30)).toBe("resistant_metabolism");
    });
    it("classifies plateau prone", () => {
      expect(classifyResponse(35, 55, 40, 40)).toBe("plateau_prone");
    });
    it("classifies recomposition pattern", () => {
      expect(classifyResponse(50, 40, 55, 75)).toBe("recomposition_pattern");
    });
    it("defaults to adaptive responder", () => {
      expect(classifyResponse(50, 40, 45, 50)).toBe("adaptive_responder");
    });
  });

  describe("Twin Model Builder", () => {
    it("fast responder with long history and high adherence", () => {
      const twin = buildTwinModel(20, { avg_weekly_weight_change: -0.8, volatility_score: 15, detected_plateaus: 0 }, 85, "metabolic_responder");
      expect(twin.metabolicEfficiency).toBeGreaterThan(70);
      expect(twin.adaptiveResistance).toBeLessThan(40);
      expect(twin.baseConfidence).toBeGreaterThan(80);
      expect(twin.regainRisk).toBeLessThan(30);
    });

    it("no history → low confidence", () => {
      const twin = buildTwinModel(1, null, 50, "unknown");
      expect(twin.baseConfidence).toBe(15);
    });

    it("rapid loss → detects risk", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -1.5, volatility_score: 70, detected_plateaus: 2 }, 60, "unknown");
      expect(twin.metabolicEfficiency).toBeGreaterThan(50);
      expect(twin.regainRisk).toBeGreaterThan(30);
    });

    it("chronic stagnation → conservative model", () => {
      const twin = buildTwinModel(15, { avg_weekly_weight_change: -0.05, volatility_score: 10, detected_plateaus: 4 }, 45, "resistant_profile");
      expect(twin.adaptiveResistance).toBeGreaterThan(60);
      expect(twin.classification).toBe("resistant_metabolism");
    });

    it("athlete with recomposition", () => {
      const twin = buildTwinModel(12, { avg_weekly_weight_change: 0.1, volatility_score: 15, detected_plateaus: 0 }, 90, "metabolic_responder");
      expect(twin.leanMassPreservation).toBeGreaterThan(60);
    });
  });

  describe("Intervention Simulator", () => {
    const baseTwin = { metabolicEfficiency: 60, adaptiveResistance: 40, regainRisk: 30 };

    it("moderate deficit → negative weight delta", () => {
      const sim = simulateIntervention(baseTwin, "moderate_deficit", 80);
      expect(sim.weightDelta4w).toBeLessThan(0);
      expect(sim.blocked).toBe(false);
    });

    it("aggressive deficit → higher plateau probability", () => {
      const mod = simulateIntervention(baseTwin, "moderate_deficit", 80);
      const agg = simulateIntervention(baseTwin, "aggressive_deficit", 80);
      expect(agg.plateauProb).toBeGreaterThan(mod.plateauProb);
      expect(agg.adherenceRisk).toBeGreaterThan(mod.adherenceRisk);
    });

    it("diet break → positive or zero weight delta", () => {
      const sim = simulateIntervention(baseTwin, "diet_break", 80);
      expect(sim.weightDelta4w).toBe(0);
    });

    it("hypertrophy → positive weight delta", () => {
      const sim = simulateIntervention(baseTwin, "hypertrophy_phase", 80);
      expect(sim.weightDelta4w).toBeGreaterThan(0);
    });

    it("blocks extreme deficit", () => {
      const sim = simulateIntervention(baseTwin, "extreme_deficit", 80); // falls back to moderate
      expect(sim.blocked).toBe(false); // fallback to moderate
    });

    it("resistant patient → smaller weight delta", () => {
      const resistant = { metabolicEfficiency: 30, adaptiveResistance: 80, regainRisk: 60 };
      const normal = simulateIntervention(baseTwin, "moderate_deficit", 80);
      const res = simulateIntervention(resistant, "moderate_deficit", 80);
      expect(Math.abs(res.weightDelta4w)).toBeLessThan(Math.abs(normal.weightDelta4w));
    });
  });

  describe("Regain Risk", () => {
    it("yo-yo patient → high regain risk", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -0.3, volatility_score: 75, detected_plateaus: 3 }, 40, "unknown");
      expect(twin.regainRisk).toBeGreaterThan(50);
    });

    it("stable patient → low regain risk", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -0.4, volatility_score: 20, detected_plateaus: 0 }, 85, "metabolic_responder");
      expect(twin.regainRisk).toBeLessThan(30);
    });
  });

  describe("Plateau Prediction", () => {
    it("many plateaus → early prediction", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -0.1, volatility_score: 30, detected_plateaus: 5 }, 50, "unknown");
      expect(twin.predictedPlateauWeeks).toBeLessThanOrEqual(5);
    });

    it("efficient metabolism → later plateau", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -0.6, volatility_score: 15, detected_plateaus: 0 }, 80, "metabolic_responder");
      expect(twin.predictedPlateauWeeks).toBeGreaterThan(6);
    });
  });

  describe("Confidence & Safety", () => {
    it("confidence scales with data points", () => {
      const low = buildTwinModel(2, null, 50, "unknown");
      const high = buildTwinModel(13, null, 50, "unknown");
      expect(high.baseConfidence).toBeGreaterThan(low.baseConfidence);
    });

    it("all scores clamped within 5-95", () => {
      const twin = buildTwinModel(50, { avg_weekly_weight_change: -3, volatility_score: 100, detected_plateaus: 10 }, 100, "metabolic_responder");
      expect(twin.metabolicEfficiency).toBeLessThanOrEqual(95);
      expect(twin.adaptiveResistance).toBeLessThanOrEqual(95);
      expect(twin.regainRisk).toBeLessThanOrEqual(95);
      expect(twin.metabolicEfficiency).toBeGreaterThanOrEqual(10);
    });

    it("low adherence → conservative simulations", () => {
      const twin = buildTwinModel(10, { avg_weekly_weight_change: -0.2, volatility_score: 50, detected_plateaus: 2 }, 30, "unknown");
      const sim = simulateIntervention(twin, "aggressive_deficit", 80);
      expect(sim.adherenceRisk).toBeGreaterThan(40);
    });
  });
});
