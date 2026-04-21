import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Integration test to verify that the onboarding blocking logic is correctly 
 * persisted in the `patient_lifecycle_states` table in Supabase.
 */
describe("Onboarding Blocking Integration — Supabase Persistence", () => {
  const patientId = uuidv4();
  const nutritionistId = "67f47696-a778-4ada-9ff9-9615fb7a7c48"; // Known dummy nutritionist from previous query

  afterAll(async () => {
    // Cleanup: delete test data
    await supabase.from("onboarding_pipelines").delete().eq("patient_id", patientId);
    await supabase.from("patient_lifecycle_states").delete().eq("patient_id", patientId);
  });

  it("should persist 'Anamnese obrigatória incompleta' when anamnesis is missing", async () => {
    // 1. Create an onboarding pipeline for the patient with anamnesis incomplete
    const { error: insertError } = await supabase.from("onboarding_pipelines").insert({
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      status: "started",
      anamnesis_completed: false,
      body_data_completed: false,
      preferences_completed: false,
      release_status: "pending",
    });
    
    if (insertError) throw insertError;

    // 2. Call the RPC that resolves the lifecycle state and updates the table
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "resolve_patient_lifecycle_state" as any,
      { _patient_id: patientId }
    );

    if (rpcError) throw rpcError;

    // 3. Verify in Supabase table `patient_lifecycle_states`
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (selectError) throw selectError;

    expect(lifecycleData.is_onboarding_blocked).toBe(true);
    expect(lifecycleData.onboarding_block_reason).toBe("Anamnese obrigatória incompleta");
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

    // 2. Call RPC to re-evaluate (Note: RPC has a 1-min cache, but the migration showed 
    // it returns early IF computed_at > now() - 1 min. 
    // Wait, the migration code does:
    // SELECT lifecycle_state::text INTO v_lifecycle_state
    // FROM patient_lifecycle_states
    // WHERE patient_id = _patient_id AND computed_at > now() - interval '1 minute';
    // IF v_lifecycle_state IS NOT NULL THEN RETURN cached_data; END IF;
    
    // For test consistency, we might need to delete the lifecycle state record or wait, 
    // OR we can just call it and hope it's fast or that we can bypass the cache.
    // Let's delete it before calling RPC to force re-computation.
    await supabase.from("patient_lifecycle_states").delete().eq("patient_id", patientId);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "resolve_patient_lifecycle_state" as any,
      { _patient_id: patientId }
    );

    if (rpcError) throw rpcError;

    // 3. Verify in Supabase
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (selectError) throw selectError;

    expect(lifecycleData.is_onboarding_blocked).toBe(true);
    expect(lifecycleData.onboarding_block_reason).toContain("Dados antropométricos");
    expect(rpcData.onboarding_block_reason).toContain("Dados antropométricos");
  });

  it("should clear blocking reason when all mandatory steps are completed", async () => {
    // 1. Complete all mandatory steps
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

    // 2. Verify in Supabase
    const { data: lifecycleData, error: selectError } = await supabase
      .from("patient_lifecycle_states")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (selectError) throw selectError;

    expect(lifecycleData.is_onboarding_blocked).toBe(false);
    expect(lifecycleData.onboarding_block_reason).toBeNull();
  });
});
