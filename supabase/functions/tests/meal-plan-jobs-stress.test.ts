import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.test("Meal Plan Jobs - Concurrency Test", async () => {
  const patientId = "00000000-0000-0000-0000-000000000001"; // Mock ID
  
  // Clean up any existing active jobs for this mock patient
  await supabase.from("meal_plan_jobs").delete().eq("patient_id", patientId);

  // 1. Create first job
  const { data: job1, error: error1 } = await supabase
    .from("meal_plan_jobs")
    .insert({ patient_id: patientId, status: "pending", payload: {} })
    .select()
    .single();

  assertEquals(error1, null);
  assertNotEquals(job1, null);

  // 2. Try to create second job (should fail due to unique index)
  const { error: error2 } = await supabase
    .from("meal_plan_jobs")
    .insert({ patient_id: patientId, status: "pending", payload: {} });

  assertNotEquals(error2, null, "Should not allow two active jobs for same patient");
});

Deno.test("Meal Plan Jobs - Metrics Validation", async () => {
  const { data: metrics, error } = await supabase.from("meal_plan_job_metrics").select("*").single();
  assertEquals(error, null);
  assertNotEquals(metrics, null);
});

Deno.test("Meal Plan Jobs - Anomaly Detection", async () => {
  const { data: anomalies, error } = await supabase.rpc("check_job_anomalies");
  assertEquals(error, null);
});
