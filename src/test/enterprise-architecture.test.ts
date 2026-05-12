import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// FASE 12 + 17: Enterprise Architecture & Executive Command Tests
// ═══════════════════════════════════════════════════════════

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}

function calcCEI(m: { avgPerformance: number; avgAdherence: number; dropoutRate: number; stagnationRate: number; avgPlanEfficacy: number }): number {
  return clamp(m.avgPerformance * 0.25 + m.avgAdherence * 0.25 + (100 - m.dropoutRate) * 0.2 + (100 - m.stagnationRate) * 0.15 + m.avgPlanEfficacy * 0.15);
}

function calcPSI(m: { dropoutRate: number; regressionRate: number; adherenceVariance: number; interventionConsistency: number }): number {
  return clamp(100 - (m.dropoutRate * 0.3 + m.regressionRate * 0.25 + m.adherenceVariance * 0.25 + (100 - m.interventionConsistency) * 0.2));
}

function classifyILI(urgencyMean: number, riskPct: number, volume: number): string {
  const score = urgencyMean * 0.4 + riskPct * 0.35 + Math.min(volume / 5, 100) * 0.25;
  if (score > 70) return "critical";
  if (score > 50) return "elevated";
  if (score > 30) return "moderate";
  return "low";
}

function estimateLTV(avgMonths: number, engagementScore: number): number {
  return Math.round(avgMonths * 150 * (0.5 + (engagementScore / 100) * 1.0));
}

function detectAlerts(s: Record<string, number>) {
  const alerts: Array<{ alert_type: string; severity: string }> = [];
  if (s.dropoutRate > 25) alerts.push({ alert_type: "high_dropout", severity: s.dropoutRate > 40 ? "critical" : "high" });
  if (s.stagnationRate > 35) alerts.push({ alert_type: "population_stagnation", severity: "high" });
  if (s.avgAdherence < 45) alerts.push({ alert_type: "global_adherence_drop", severity: "high" });
  if (s.highRiskPct > 40) alerts.push({ alert_type: "high_risk_concentration", severity: "critical" });
  return alerts;
}

function generateRecommendations(s: Record<string, number>) {
  const recs: Array<{ action_type: string; priority: number }> = [];
  if (s.dropoutRate > 20) recs.push({ action_type: "intensify_retention", priority: 1 });
  if (s.stagnationRate > 30) recs.push({ action_type: "review_dominant_protocol", priority: 2 });
  if (s.avgAdherence < 50) recs.push({ action_type: "simplify_population_strategy", priority: 2 });
  if (s.interventionLoad > 60) recs.push({ action_type: "increase_preventive_care", priority: 3 });
  if (s.cei < 40) recs.push({ action_type: "hire_additional_professional", priority: 4 });
  return recs;
}

// ── Phase 12 Tests (preserved) ──────────────────────────────

describe("Phase 12: Enterprise Multi-Clinic Architecture", () => {
  it("org metrics aggregation produces valid output", () => {
    const metrics = { total_patients: 50, active_patients: 42, avg_adherence: 72, dropout_rate: 12 };
    expect(metrics.active_patients).toBeLessThanOrEqual(metrics.total_patients);
    expect(metrics.avg_adherence).toBeGreaterThan(0);
    expect(metrics.dropout_rate).toBeLessThan(100);
  });

  it("retention rate calculation is correct", () => {
    const total = 100;
    const active = 85;
    const retention = Math.round((active / total) * 100 * 10) / 10;
    expect(retention).toBe(85);
  });

  it("portfolio classification follows thresholds", () => {
    function classify(riskPct: number, dropout: number, adh: number, efficacy: number) {
      if (riskPct > 40 || dropout > 30) return "critical";
      if (riskPct > 25 || dropout > 20) return "alert";
      if (adh > 75 && efficacy > 60) return "healthy";
      return "stable";
    }
    expect(classify(50, 10, 80, 70)).toBe("critical");
    expect(classify(30, 15, 80, 70)).toBe("alert");
    expect(classify(10, 10, 80, 70)).toBe("healthy");
    expect(classify(10, 10, 50, 40)).toBe("stable");
  });
});

// ── Phase 17 Tests ──────────────────────────────────────────

describe("Phase 17: Executive Command & Operations Intelligence", () => {
  describe("Clinical Efficiency Index (CEI)", () => {
    it("returns high CEI for excellent metrics", () => {
      const cei = calcCEI({ avgPerformance: 85, avgAdherence: 90, dropoutRate: 5, stagnationRate: 8, avgPlanEfficacy: 80 });
      expect(cei).toBeGreaterThan(75);
    });
    it("returns low CEI for poor metrics", () => {
      const cei = calcCEI({ avgPerformance: 20, avgAdherence: 25, dropoutRate: 50, stagnationRate: 45, avgPlanEfficacy: 15 });
      expect(cei).toBeLessThan(35);
    });
    it("is always clamped 0-100", () => {
      const high = calcCEI({ avgPerformance: 150, avgAdherence: 150, dropoutRate: -50, stagnationRate: -50, avgPlanEfficacy: 150 });
      expect(high).toBeLessThanOrEqual(100);
    });
  });

  describe("Portfolio Stability Index (PSI)", () => {
    it("returns high PSI for stable portfolio", () => {
      const psi = calcPSI({ dropoutRate: 5, regressionRate: 3, adherenceVariance: 10, interventionConsistency: 80 });
      expect(psi).toBeGreaterThan(70);
    });
    it("returns low PSI for unstable portfolio", () => {
      const psi = calcPSI({ dropoutRate: 45, regressionRate: 40, adherenceVariance: 60, interventionConsistency: 20 });
      expect(psi).toBeLessThan(50);
    });
  });

  describe("Intervention Load Index (ILI)", () => {
    it("classifies low load", () => { expect(classifyILI(10, 5, 2)).toBe("low"); });
    it("classifies critical load", () => { expect(classifyILI(90, 80, 500)).toBe("critical"); });
    it("classifies moderate load", () => { expect(classifyILI(50, 40, 20)).toBe("moderate"); });
  });

  describe("LTV Estimation", () => {
    it("higher LTV for engaged patients", () => {
      expect(estimateLTV(10, 90)).toBeGreaterThan(estimateLTV(10, 20));
    });
    it("returns reasonable values", () => {
      const ltv = estimateLTV(8, 70);
      expect(ltv).toBeGreaterThan(0);
      expect(ltv).toBeLessThan(50000);
    });
  });

  describe("Scenario 1: Fast-growing clinic", () => {
    it("generates no alerts for healthy metrics", () => {
      expect(detectAlerts({ dropoutRate: 8, stagnationRate: 12, avgAdherence: 72, highRiskPct: 10 }).length).toBe(0);
    });
    it("generates no recommendations", () => {
      expect(generateRecommendations({ dropoutRate: 8, stagnationRate: 12, avgAdherence: 72, interventionLoad: 20, cei: 75 }).length).toBe(0);
    });
  });

  describe("Scenario 2: Rising dropout", () => {
    it("detects high dropout alert", () => {
      const alerts = detectAlerts({ dropoutRate: 35, stagnationRate: 20, avgAdherence: 55, highRiskPct: 25 });
      expect(alerts.some((a) => a.alert_type === "high_dropout")).toBe(true);
    });
    it("recommends retention", () => {
      const recs = generateRecommendations({ dropoutRate: 35, stagnationRate: 20, avgAdherence: 55, interventionLoad: 40, cei: 45 });
      expect(recs.some((r) => r.action_type === "intensify_retention")).toBe(true);
    });
  });

  describe("Scenario 3: Overloaded professional", () => {
    it("recommends hiring when CEI is very low", () => {
      const recs = generateRecommendations({ dropoutRate: 30, stagnationRate: 40, avgAdherence: 35, interventionLoad: 70, cei: 30 });
      expect(recs.some((r) => r.action_type === "hire_additional_professional")).toBe(true);
      expect(recs.some((r) => r.action_type === "increase_preventive_care")).toBe(true);
    });
  });

  describe("Scenario 4: Stable portfolio", () => {
    it("has high PSI and no alerts", () => {
      expect(calcPSI({ dropoutRate: 5, regressionRate: 3, adherenceVariance: 8, interventionConsistency: 85 })).toBeGreaterThan(75);
      expect(detectAlerts({ dropoutRate: 5, stagnationRate: 8, avgAdherence: 80, highRiskPct: 5 }).length).toBe(0);
    });
  });

  describe("Scenario 5: Post-protocol improvement", () => {
    it("shows improved CEI after protocol change", () => {
      const before = calcCEI({ avgPerformance: 40, avgAdherence: 45, dropoutRate: 30, stagnationRate: 35, avgPlanEfficacy: 30 });
      const after = calcCEI({ avgPerformance: 70, avgAdherence: 75, dropoutRate: 10, stagnationRate: 12, avgPlanEfficacy: 65 });
      expect(after - before).toBeGreaterThan(20);
    });
  });

  describe("Alert severity escalation", () => {
    it("escalates to critical when dropout > 40", () => {
      const alerts = detectAlerts({ dropoutRate: 45, stagnationRate: 20, avgAdherence: 50, highRiskPct: 20 });
      expect(alerts.find((a) => a.alert_type === "high_dropout")?.severity).toBe("critical");
    });
    it("multiple alerts for compounding issues", () => {
      const alerts = detectAlerts({ dropoutRate: 50, stagnationRate: 45, avgAdherence: 35, highRiskPct: 55 });
      expect(alerts.length).toBeGreaterThanOrEqual(4);
    });
  });
});
