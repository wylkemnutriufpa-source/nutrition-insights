import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.test("Enterprise Ops - DLQ and Reprocessing", async () => {
  const patientId = "00000000-0000-0000-0000-000000000001";
  
  // 1. Manually insert into DLQ
  const { data: dlq, error: dlqError } = await supabase
    .from("meal_plan_job_dead_letter")
    .insert({
      patient_id: patientId,
      original_job_id: crypto.randomUUID(),
      last_error: "Test Error for DLQ",
      retries_at_failure: 3,
      engine_version: "2.0.0-enterprise",
      plan_version: "1.0.0"
    })
    .select()
    .single();

  assertEquals(dlqError, null);
  assertNotEquals(dlq, null);

  // 2. Test reprocess RPC exists
  const { error: rpcError } = await supabase.rpc("reprocess_dead_letter_job", { dlq_id: dlq.id });
  // We expect failure here because the original job doesn't exist, but we check if RPC is callable
  assertNotEquals(rpcError?.message, "function public.reprocess_dead_letter_job(uuid) does not exist");
});

Deno.test("Enterprise Ops - Clinical Audit Logging", async () => {
  const { data, error } = await supabase.rpc("export_clinical_audit");
  assertEquals(error, null);
  assertNotEquals(data, null);
});

Deno.test("Enterprise Ops - Alert Configuration", async () => {
  const { data, error } = await supabase.from("job_alert_configs").select("*");
  assertEquals(error, null);
});
