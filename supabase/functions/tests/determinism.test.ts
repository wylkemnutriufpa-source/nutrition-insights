import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MEAL_KCAL_SPLIT } from "../_shared/food-rules.ts";
import { calculateMacros, calculateTargetKcal, calculateTDEE, calculateTMB } from "../_shared/clinical-macro-engine.ts";

/**
 * FitJourney — Determinism Test (Real Engine)
 * Verifies that the core clinical engine and food rules produce identical results
 * for the same input without any simulation or mocking of the calculation logic.
 */

Deno.test("Meal Generation Determinism: Real Logic Consistency", () => {
  const patientData = {
    weight: 85.5,
    height: 178,
    age: 32,
    sex: "male",
    activityLevel: "moderate",
    goal: "gain_muscle"
  };

  // Run 1
  const tmb1 = calculateTMB(patientData.weight, patientData.height, patientData.age, patientData.sex);
  const tdee1 = calculateTDEE(tmb1, patientData.activityLevel);
  const targetKcal1 = calculateTargetKcal(tdee1, patientData.goal, patientData.sex);
  const macros1 = calculateMacros(targetKcal1, patientData.goal, patientData.weight);

  // Run 2
  const tmb2 = calculateTMB(patientData.weight, patientData.height, patientData.age, patientData.sex);
  const tdee2 = calculateTDEE(tmb2, patientData.activityLevel);
  const targetKcal2 = calculateTargetKcal(tdee2, patientData.goal, patientData.sex);
  const macros2 = calculateMacros(targetKcal2, patientData.goal, patientData.weight);

  // Assertions for core metabolic values
  assertEquals(tmb1, tmb2, "TMB must be identical across multiple runs");
  assertEquals(tdee1, tdee2, "TDEE must be identical across multiple runs");
  assertEquals(targetKcal1, targetKcal2, "Target Calories must be identical across multiple runs");
  assertEquals(macros1, macros2, "Calculated Macros must be identical across multiple runs");

  // Validate MEAL_KCAL_SPLIT distribution
  const distribution1 = Object.entries(MEAL_KCAL_SPLIT).map(([meal, split]) => ({
    meal,
    kcal: Math.round(targetKcal1 * split)
  }));

  const distribution2 = Object.entries(MEAL_KCAL_SPLIT).map(([meal, split]) => ({
    meal,
    kcal: Math.round(targetKcal2 * split)
  }));

  assertEquals(distribution1, distribution2, "Meal calorie distribution based on MEAL_KCAL_SPLIT must be deterministic");
  
  // Verify that the total split sums to approx 1.0 (canonical requirement)
  const totalSplit = Object.values(MEAL_KCAL_SPLIT).reduce((sum, val) => sum + val, 0);
  assertEquals(Math.round(totalSplit * 100) / 100, 1.0, "MEAL_KCAL_SPLIT must sum to 1.0 (100%)");
});
