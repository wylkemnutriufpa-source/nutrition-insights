import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// FASE 13: Physiological Signal Intelligence Tests
// PHYSIO_ENGINE v1.0.0
// ═══════════════════════════════════════════════════════════

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v * 10) / 10));
}

// ── RPI Calculator ──────────────────────────────────────────
function calculateRPI(signals: any[]): number {
  if (!signals.length) return 50;
  const latest = signals[0];
  let score = 50;

  if (latest.heart_rate_variability != null) {
    const hrvNorm = Math.min(latest.heart_rate_variability / 80, 1) * 100;
    score += (hrvNorm - 50) * 0.35;
  }
  if (latest.sleep_duration_minutes != null) {
    const sleepNorm = Math.min(latest.sleep_duration_minutes / 60 / 8, 1) * 100;
    score += (sleepNorm - 50) * 0.20;
  }
  if (latest.sleep_quality_score != null) {
    score += (latest.sleep_quality_score - 50) * 0.10;
  }
  if (latest.resting_heart_rate != null) {
    const hrNorm = Math.max(0, 100 - (latest.resting_heart_rate - 45) * 1.5);
    score += (hrNorm - 50) * 0.20;
  }
  if (latest.readiness_score != null) {
    score += (latest.readiness_score - 50) * 0.15;
  }
  return clamp(score);
}

// ── PSI Calculator ──────────────────────────────────────────
function calculatePSI(signals: any[]): number {
  if (!signals.length) return 30;
  const latest = signals[0];
  let stress = 30;

  if (latest.stress_index != null) {
    stress += (latest.stress_index - 30) * 0.30;
  }
  if (signals.length >= 3 && latest.heart_rate_variability != null) {
    const recent3 = signals.slice(0, 3).filter((s: any) => s.heart_rate_variability != null);
    if (recent3.length >= 2) {
      const avgRecent = recent3.reduce((s: number, r: any) => s + r.heart_rate_variability, 0) / recent3.length;
      const older = signals.slice(3).filter((s: any) => s.heart_rate_variability != null);
      if (older.length > 0) {
        const avgOlder = older.reduce((s: number, r: any) => s + r.heart_rate_variability, 0) / older.length;
        if (avgRecent < avgOlder * 0.85) stress += 15;
        else if (avgRecent < avgOlder * 0.92) stress += 8;
      }
    }
  }
  if (latest.sleep_duration_minutes != null && latest.sleep_duration_minutes < 360) stress += 15;
  else if (latest.sleep_duration_minutes != null && latest.sleep_duration_minutes < 420) stress += 8;
  if (latest.training_load_score != null && latest.training_load_score > 80) stress += 12;
  else if (latest.training_load_score != null && latest.training_load_score > 60) stress += 6;

  return clamp(stress);
}

// ── TLB Calculator ──────────────────────────────────────────
function calculateTLB(signals: any[]): string {
  if (signals.length < 7) return "optimal";
  const last7 = signals.slice(0, 7);
  const last28 = signals.slice(0, 28);
  const acuteLoad = last7.reduce((s: number, r: any) => s + (r.training_load_score || 0), 0) / last7.length;
  const chronicLoad = last28.reduce((s: number, r: any) => s + (r.training_load_score || 0), 0) / last28.length;
  if (chronicLoad === 0) return "optimal";
  const ratio = acuteLoad / chronicLoad;
  if (ratio > 1.5) return "overloaded";
  if (ratio < 0.6) return "undertrained";
  return "optimal";
}

function classifyPhysioRisk(rpi: number, psi: number, tlb: string): string {
  if (psi > 75 || rpi < 30 || tlb === "overloaded") return "critical";
  if (psi > 55 || rpi < 45) return "high";
  if (psi > 40 || rpi < 60) return "moderate";
  return "low";
}

// ═════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════

describe("Physiological Engine - RPI (Recovery Index)", () => {
  it("should return neutral 50 with no signals", () => {
    expect(calculateRPI([])).toBe(50);
  });

  it("should score high RPI for good recovery signals", () => {
    const rpi = calculateRPI([{
      heart_rate_variability: 75,
      sleep_duration_minutes: 480,
      sleep_quality_score: 85,
      resting_heart_rate: 52,
      readiness_score: 80,
    }]);
    expect(rpi).toBeGreaterThan(60);
  });

  it("should score low RPI for poor recovery", () => {
    const rpi = calculateRPI([{
      heart_rate_variability: 20,
      sleep_duration_minutes: 300,
      sleep_quality_score: 30,
      resting_heart_rate: 80,
      readiness_score: 25,
    }]);
    expect(rpi).toBeLessThan(40);
  });

  it("should handle partial data gracefully", () => {
    const rpi = calculateRPI([{ heart_rate_variability: 60 }]);
    expect(rpi).toBeGreaterThanOrEqual(0);
    expect(rpi).toBeLessThanOrEqual(100);
  });
});

describe("Physiological Engine - PSI (Stress Index)", () => {
  it("should return baseline 30 with no signals", () => {
    expect(calculatePSI([])).toBe(30);
  });

  it("should detect high stress from poor sleep + high load", () => {
    const psi = calculatePSI([{
      stress_index: 80,
      sleep_duration_minutes: 300,
      training_load_score: 90,
      heart_rate_variability: 30,
    }]);
    expect(psi).toBeGreaterThan(50);
  });

  it("should detect low stress from good signals", () => {
    const psi = calculatePSI([{
      stress_index: 15,
      sleep_duration_minutes: 480,
      training_load_score: 40,
      heart_rate_variability: 70,
    }]);
    expect(psi).toBeLessThan(35);
  });

  it("should detect HRV declining trend", () => {
    // Recent HRV dropping vs older
    const signals = [
      { heart_rate_variability: 30, stress_index: 40 },
      { heart_rate_variability: 32, stress_index: 40 },
      { heart_rate_variability: 35, stress_index: 40 },
      { heart_rate_variability: 55, stress_index: 40 },
      { heart_rate_variability: 58, stress_index: 40 },
      { heart_rate_variability: 60, stress_index: 40 },
    ];
    const psi = calculatePSI(signals);
    expect(psi).toBeGreaterThan(40); // should detect the drop
  });
});

describe("Physiological Engine - TLB (Training Load Balance)", () => {
  it("should return optimal with insufficient data", () => {
    expect(calculateTLB([{ training_load_score: 50 }])).toBe("optimal");
  });

  it("should detect overloaded when acute >> chronic", () => {
    const signals = [
      // last 7 days: high load
      ...Array(7).fill({ training_load_score: 90 }),
      // older: low load
      ...Array(21).fill({ training_load_score: 30 }),
    ];
    expect(calculateTLB(signals)).toBe("overloaded");
  });

  it("should detect undertrained when acute << chronic", () => {
    const signals = [
      ...Array(7).fill({ training_load_score: 15 }),
      ...Array(21).fill({ training_load_score: 70 }),
    ];
    expect(calculateTLB(signals)).toBe("undertrained");
  });

  it("should be optimal when balanced", () => {
    const signals = Array(28).fill({ training_load_score: 50 });
    expect(calculateTLB(signals)).toBe("optimal");
  });
});

describe("Physiological Engine - Risk Classification", () => {
  it("should classify critical with high PSI", () => {
    expect(classifyPhysioRisk(50, 80, "optimal")).toBe("critical");
  });

  it("should classify critical with low RPI", () => {
    expect(classifyPhysioRisk(25, 40, "optimal")).toBe("critical");
  });

  it("should classify critical with overload", () => {
    expect(classifyPhysioRisk(60, 40, "overloaded")).toBe("critical");
  });

  it("should classify low with good signals", () => {
    expect(classifyPhysioRisk(75, 25, "optimal")).toBe("low");
  });

  it("should classify high with moderate stress", () => {
    expect(classifyPhysioRisk(50, 60, "optimal")).toBe("high");
  });
});

describe("Physiological Engine - Fallback Without Wearable", () => {
  it("should produce valid RPI without wearable data", () => {
    const rpi = calculateRPI([]);
    expect(rpi).toBe(50); // neutral
  });

  it("should produce valid PSI without wearable data", () => {
    const psi = calculatePSI([]);
    expect(psi).toBe(30); // baseline
  });

  it("should produce optimal TLB without wearable data", () => {
    expect(calculateTLB([])).toBe("optimal");
  });

  it("should classify moderate risk with neutral fallbacks (RPI=50 < 60 threshold)", () => {
    expect(classifyPhysioRisk(50, 30, "optimal")).toBe("moderate");
  });
});

describe("Physiological Engine - Alert Scenarios", () => {
  it("should trigger sleep deprivation alert conditions", () => {
    const psi = calculatePSI([{ sleep_duration_minutes: 240, stress_index: 60 }]);
    expect(psi).toBeGreaterThan(40);
  });

  it("should detect athlete overload scenario", () => {
    const signals = [
      ...Array(7).fill({ training_load_score: 95 }),
      ...Array(21).fill({ training_load_score: 40 }),
    ];
    const tlb = calculateTLB(signals);
    const risk = classifyPhysioRisk(50, 50, tlb);
    expect(tlb).toBe("overloaded");
    expect(risk).toBe("critical");
  });

  it("should handle sedentary patient with stable data", () => {
    const rpi = calculateRPI([{
      heart_rate_variability: 45,
      sleep_duration_minutes: 420,
      resting_heart_rate: 70,
    }]);
    const psi = calculatePSI([{
      stress_index: 35,
      sleep_duration_minutes: 420,
      training_load_score: 20,
    }]);
    expect(rpi).toBeGreaterThan(35);
    expect(psi).toBeLessThan(50);
  });
});
