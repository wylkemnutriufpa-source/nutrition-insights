import { describe, it, expect, afterAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * Integration test to verify that the onboarding blocking logic is correctly 
 * persisted in the `patient_lifecycle_states` table in Supabase.
 * 
 * NOTE: For these tests to run successfully in a CI environment with RLS enabled, 
 * you must use a client with the Service Role key or mock the session to match 
 * the nutritionist_id/patient_id.
 */
describe("Onboarding Blocking Integration — Supabase Persistence", () => {
  // Use a unique ID for each test run to avoid collision
  const patientId = crypto.randomUUID();
  // Using a known nutritionist ID or a random one (if RLS allows)
  const nutritionistId = "67f47696-a778-4ada-9ff9-9615fb7a7c48"; 

  afterAll(async () => {
    // Cleanup: delete test data to keep the database clean
    // If RLS is enabled, this might fail unless using a service role key
    try {
      await supabase.from("onboarding_pipelines").delete().eq("patient_id", patientId);
      await supabase.from("patient_lifecycle_states").delete().eq("patient_id", patientId);
    } catch (e) {
      console.warn("Cleanup failed due to RLS, manually delete test patient if needed:", patientId);
    }
  });

  it("should persist 'Anamnese obrigatória incompleta' when anamnesis is missing", async () => {
    // 1. Create an onboarding pipeline for the patient with anamnesis incomplete
    // In a real integration environment, this would be done by the application
    const { error: insertError } = await supabase.from("onboarding_pipelines").insert({
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      status: "started",
      anamnesis_completed: false,
      body_data_completed: false,
      preferences_completed: false,
      release_status: "pending",
    });
    
    // If RLS blocks the insert, we'll get an error here. 
    // This confirms the test requires proper permissions to run.
    if (insertError) {
      console.error("Test setup failed: RLS blocked the insertion. Use a Service Role key.");
      throw insertError;
    }

    // 2. Call the RPC that resolves the lifecycle state and updates the table
    // This RPC is the "Engine" that applies the blocking logic
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "resolve_patient_lifecycle_state" as any,
      { _patient_id: patientId }
    );

    if (rpcError) throw rpcError;

    // 3. Verify in Supabase table `patient_lifecycle_states` directly
    // This confirms the "persistence" requirement (not just the RPC return value)
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!lifecycleData) throw new Error("Persistence failed: lifecycle state not found for patient");

    // Assert the blocking status and reason are correctly persisted
    expect(lifecycleData.is_onboarding_blocked).toBe(true);
    expect(lifecycleData.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
    
    // Also verify the RPC output for consistency
    expect(rpcData.is_onboarding_blocked).toBe(true);
    expect(rpcData.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
  });

  it("should persist 'Dados antropométricos...' when anamnesis is OK but body data is missing", async () => {
    // 1. Update onboarding pipeline: anamnesis is now completed, but body data is still missing
    const { error: updateError } = await supabase
      .from("onboarding_pipelines")
      .update({
        anamnesis_completed: true,
        body_data_completed: false,
      })
      .eq("patient_id", patientId);

    if (updateError) throw updateError;

    // Force re-computation by clearing the cache entry (deleting the persisted row)
    // The RPC caches for 1 minute based on `computed_at`.
    await supabase.from("patient_lifecycle_states").delete().eq("patient_id", patientId);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "resolve_patient_lifecycle_state" as any,
      { _patient_id: patientId }
    );

    if (rpcError) throw rpcError;

    // 2. Verify in Supabase table
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!lifecycleData) throw new Error("Persistence failed after update");

    expect(lifecycleData.is_onboarding_blocked).toBe(true);
    expect(lifecycleData.onboarding_block_reason).toContain("Dados antropométricos");
    expect(rpcData.onboarding_block_reason).toContain("Dados antropométricos");
  });

  it("should clear blocking reason when all mandatory steps are completed", async () => {
    // 1. Complete all mandatory steps (anamnesis + body data)
    const { error: updateError } = await supabase
      .from("onboarding_pipelines")
      .update({
        anamnesis_completed: true,
        body_data_completed: true,
      })
      .eq("patient_id", patientId);

    if (updateError) throw updateError;

    // Force re-computation
    await supabase.from("patient_lifecycle_states").delete().eq("patient_id", patientId);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "resolve_patient_lifecycle_state" as any,
      { _patient_id: patientId }
    );

    if (rpcError) throw rpcError;

    // 2. Verify in Supabase - blocking should be removed
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!lifecycleData) throw new Error("Persistence failed after completion");

    expect(lifecycleData.is_onboarding_blocked).toBe(false);
    expect(lifecycleData.onboarding_block_reason).toBeNull();
    expect(rpcData.is_onboarding_blocked).toBe(false);
  });
});
