import { describe, it, expect } from "vitest";
import { LongitudinalPlanSchema, WeeklyPlanSchema } from "../lib/plan-validator";

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

  it("validates outputs against JSON schema (Zod) including calorie/macro consistency", () => {
    const plan = generatePlan(initialPatient, 1);
    const result = WeeklyPlanSchema.safeParse(plan);
    if (!result.success) {
      console.error(result.error.errors);
    }
    expect(result.success).toBe(true);

    // Test a plan with inconsistent macros (should fail)
    const badPlan = {
      ...plan,
      calories: 2000,
      macros: { p: 10, c: 10, f: 10 } // 10*4 + 10*4 + 10*9 = 170 kcal (!= 2000)
    };
    const badResult = WeeklyPlanSchema.safeParse(badPlan);
    expect(badResult.success).toBe(false);
    if (!badResult.success) {
      expect(badResult.error.errors[0].message).toContain("match total calories");
    }
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

    // Validate entire 10+ week output against Longitudinal schema
    const longitudinalResult = LongitudinalPlanSchema.safeParse(history);
    expect(longitudinalResult.success).toBe(true);

    // Check that Week 1 is different from Week 10
    expect(history[0].calories).not.toBe(history[9].calories);
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
      
      // Use Zod validation for each step
      expect(WeeklyPlanSchema.safeParse(plan).success).toBe(true);
      
      // Calories should never drop below a safe minimum
      expect(plan.calories).toBeGreaterThanOrEqual(1200);
      
      currentState = simulateWeek(currentState, plan);
      
      // Weight should remain within human bounds
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

    if (stateAtWeek5) {
      const planWeek5 = generatePlan(stateAtWeek5, 5);
      const planWeek5Again = generatePlan(stateAtWeek5, 5);
      expect(planWeek5).toEqual(planWeek5Again);
      expect(WeeklyPlanSchema.safeParse(planWeek5).success).toBe(true);
    }
  });


  describe("Edge Case Simulations (10+ weeks)", () => {
    it("handles extreme initial weights (low and high) and various goals without failure", () => {
      const edgeCases: PatientState[] = [
        {
          id: "very-low-weight-loss",
          weight: 35,
          goal: "lose_weight",
          adherence_7d: 90,
          metabolic_rate: 1400,
          cumulative_deficit: 0,
        },
        {
          id: "very-high-weight-loss",
          weight: 350,
          goal: "lose_weight",
          adherence_7d: 90,
          metabolic_rate: 4500,
          cumulative_deficit: 0,
        },
        {
          id: "very-low-weight-gain",
          weight: 38,
          goal: "gain_muscle",
          adherence_7d: 95,
          metabolic_rate: 1600,
          cumulative_deficit: 0,
        }
      ];

      edgeCases.forEach(initialState => {
        let currentState = { ...initialState };
        
        for (let w = 1; w <= 15; w++) {
          const plan = generatePlan(currentState, w);
          
          // 1. Assert Macros/Calories
          expect(Number.isFinite(plan.calories), `Non-finite calories at week ${w} for ${currentState.id}`).toBe(true);
          expect(plan.calories, `Calories too low at week ${w} for ${currentState.id}`).toBeGreaterThanOrEqual(1200);
          expect(Number.isFinite(plan.macros.p)).toBe(true);
          expect(Number.isFinite(plan.macros.c)).toBe(true);
          expect(Number.isFinite(plan.macros.f)).toBe(true);
          
          // Assert calories clamp never breaks
          expect(plan.calories).toBeGreaterThanOrEqual(1200);

          // 2. Assert Macro Consistency (P*4 + C*4 + F*9 ≈ Kcal)
          const calculatedKcal = (plan.macros.p * 4) + (plan.macros.c * 4) + (plan.macros.f * 9);
          // Allow small rounding errors
          expect(calculatedKcal).toBeGreaterThan(plan.calories * 0.85);
          expect(calculatedKcal).toBeLessThan(plan.calories * 1.15);

          // 3. Run simulation step
          currentState = simulateWeek(currentState, plan);
          
          // 4. Assert Weight Bounds
          expect(Number.isFinite(currentState.weight), `Non-finite weight at week ${w} for ${currentState.id}`).toBe(true);
          expect(currentState.weight, `Weight out of bounds at week ${w} for ${currentState.id}`).toBeGreaterThan(20);
          expect(currentState.weight, `Weight out of bounds at week ${w} for ${currentState.id}`).toBeLessThan(500);
        }
      });
    });
  });
});
