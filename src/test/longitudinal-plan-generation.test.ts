import { describe, it, expect } from "vitest";

// ─── Pure simulation logic ───────────

interface PatientState {
  id: string;
  weight: number;
  goal: "lose_weight" | "maintain" | "gain_muscle";
  adherence_7d: number;
  metabolic_rate: number;
  cumulative_deficit: number;
}

interface WeeklyPlan {
  week: number;
  calories: number;
  macros: { p: number; c: number; f: number };
  strategy: string;
}

/**
 * Deterministic plan generation based on patient state and week index
 */
function generatePlan(p: PatientState, week: number): WeeklyPlan {
  let targetKcal = p.metabolic_rate;
  let strategy = "maintenance";

  if (p.goal === "lose_weight") {
    targetKcal -= 500;
    strategy = "deficit";
    // Adaptive adjustment: if adherence is low, don't push too hard
    if (p.adherence_7d < 70) {
      targetKcal += 200;
      strategy = "conservative_deficit";
    }
    // Metabolic adaptation: if week is high, calories might drop slightly
    if (week > 4) {
      targetKcal -= 50;
    }
  } else if (p.goal === "gain_muscle") {
    targetKcal += 300;
    strategy = "surplus";
  }

  // Final safety clamp to prevent cumulative state bugs (e.g. negative calories)
  targetKcal = Math.max(1200, targetKcal);

  return {
    week,
    calories: Math.round(targetKcal),
    macros: {
      p: Math.round(targetKcal * 0.3 / 4),
      c: Math.round(targetKcal * 0.4 / 4),
      f: Math.round(targetKcal * 0.3 / 9),
    },
    strategy,
  };
}

/**
 * Simulate patient progress based on the plan and some randomness/adherence
 */
function simulateWeek(p: PatientState, plan: WeeklyPlan): PatientState {
  const adherence = p.adherence_7d / 100;
  const actualDeficit = (p.metabolic_rate - plan.calories) * adherence * 7;
  
  // 7700 kcal ~= 1kg
  const weightChange = -actualDeficit / 7700;
  
  return {
    ...p,
    weight: Number((p.weight + weightChange).toFixed(2)),
    cumulative_deficit: p.cumulative_deficit + actualDeficit,
    // Simulate some adherence fluctuation but keep it deterministic for the test if needed
    // Here we'll keep it stable to test determinism easier, or use a predictable sequence
    adherence_7d: Math.max(40, Math.min(100, p.adherence_7d + (weightChange < 0 ? 2 : -5))),
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe("Longitudinal Plan Generation & Determinism", () => {
  const initialPatient: PatientState = {
    id: "test-patient-123",
    weight: 85,
    goal: "lose_weight",
    adherence_7d: 80,
    metabolic_rate: 2500,
    cumulative_deficit: 0,
  };

  it("validates determinism: same input produces same plan", () => {
    const plan1 = generatePlan(initialPatient, 1);
    const plan2 = generatePlan(initialPatient, 1);
    expect(plan1).toEqual(plan2);
    expect(plan1.calories).toBe(2000);
  });

  it("validates variety: plans change over 10 weeks as state evolves", () => {
    let currentState = { ...initialPatient };
    const history: WeeklyPlan[] = [];

    for (let w = 1; w <= 12; w++) {
      // Force an adherence drop at week 6 to trigger strategy change
      if (w === 6) currentState.adherence_7d = 60;
      
      const plan = generatePlan(currentState, w);
      history.push(plan);
      currentState = simulateWeek(currentState, plan);
    }

    // Check that Week 1 is different from Week 10 (due to metabolic adaptation/adherence shifts)
    expect(history[0].calories).not.toBe(history[9].calories);
    // At week 10, calories might be higher due to forced adherence drop at week 6 triggering conservative deficit
    expect(history[9].calories).toBe(2150); 
    expect(history[0].calories).toBe(2000);
    
    // Ensure variety in strategies if state shifts
    const strategies = new Set(history.map(h => h.strategy));
    expect(strategies.size).toBeGreaterThan(1);
    expect(strategies.has("deficit")).toBe(true);
    expect(strategies.has("conservative_deficit")).toBe(true);
  });

  it("validates absence of cumulative state bugs (stability)", () => {
    let currentState = { ...initialPatient };
    
    for (let w = 1; w <= 20; w++) {
      const plan = generatePlan(currentState, w);
      
      // Calories should never drop below a safe minimum
      expect(plan.calories).toBeGreaterThanOrEqual(1200);
      
      // Macros should always be valid numbers
      expect(plan.macros.p).toBeGreaterThan(0);
      expect(plan.macros.c).toBeGreaterThan(0);
      expect(plan.macros.f).toBeGreaterThan(0);
      
      currentState = simulateWeek(currentState, plan);
      
      // Weight should remain within human bounds (not go negative or explode)
      expect(currentState.weight).toBeGreaterThan(40);
      expect(currentState.weight).toBeLessThan(150);
    }
  });

  it("validates idempotent recovery: re-running a week produces identical results", () => {
    let stateAtWeek5: PatientState | null = null;
    let currentState = { ...initialPatient };

    for (let w = 1; w <= 10; w++) {
      if (w === 5) stateAtWeek5 = { ...currentState };
      const plan = generatePlan(currentState, w);
      currentState = simulateWeek(currentState, plan);
    }

    // Now re-run from Week 5
    if (stateAtWeek5) {
      const planWeek5 = generatePlan(stateAtWeek5, 5);
      const planWeek5Again = generatePlan(stateAtWeek5, 5);
      expect(planWeek5).toEqual(planWeek5Again);
    }
  });

  it("handles extreme adherence drops without system failure", () => {
    const strugglingPatient: PatientState = {
      ...initialPatient,
      adherence_7d: 20,
    };
    
    const plan = generatePlan(strugglingPatient, 1);
    // Should switch to conservative deficit
    expect(plan.strategy).toBe("conservative_deficit");
    expect(plan.calories).toBe(2200); // 2500 - 500 + 200
  });
});
