import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ClinicalEngine, ClinicalInput } from "../_shared/clinical-engine.ts";

Deno.test("ClinicalEngine: FitJourney Strategy (ifj_standard)", async () => {
  const input: ClinicalInput = {
    patientId: "test-uuid",
    weight: 70,
    height: 170,
    age: 25,
    sex: "male",
    goal: "lose_weight",
    activityLevel: "moderate",
    restrictions: [],
    dislikedFoods: [],
    strategyId: "ifj_standard"
  };

  const plan = await ClinicalEngine.generateMealPlan(input, null);
  assertEquals(plan.protocol_used, "ifj_standard");
  assertEquals(plan.metrics.target_kcal < 2500, true, "Should apply deficit for lose_weight");
});

Deno.test("ClinicalEngine: Biquini Branco Strategy (bikini_protocol)", async () => {
  const input: ClinicalInput = {
    patientId: "test-uuid",
    weight: 60,
    height: 165,
    age: 28,
    sex: "female",
    goal: "lose_weight",
    activityLevel: "light",
    restrictions: [],
    dislikedFoods: [],
    strategyId: "bikini_protocol",
    bbPhase: 2
  };

  const plan = await ClinicalEngine.generateMealPlan(input, null);
  assertEquals(plan.protocol_used, "bikini_protocol");
  // BB Phase 2: 400 kcal deficit
  assertEquals(plan.metrics.target_kcal > 1200, true);
});

Deno.test("ClinicalEngine: Clinical Standard Strategy (clinical_standard)", async () => {
  const input: ClinicalInput = {
    patientId: "test-uuid",
    weight: 100,
    height: 180,
    age: 45,
    sex: "male",
    goal: "maintain",
    activityLevel: "sedentary",
    restrictions: [],
    dislikedFoods: [],
    strategyId: "clinical_standard"
  };

  const plan = await ClinicalEngine.generateMealPlan(input, null);
  assertEquals(plan.protocol_used, "clinical_standard");
});
