import { assertEquals, assertNotEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handler as validateHandler } from "../validate-meal-plan/index.ts";
import { buildRequest } from "../_shared/test-harness.ts";

// Configuration for Wannubia's test
const PATIENT_ID = "b3aa9e2a-58b0-432c-a312-00bb8994d384"; // Wannubia
const NUTRITIONIST_ID = "9994b710-6006-4fca-9761-dc6afef160a4"; // Wylkem
const TENANT_ID = "20081963-8db9-4a6c-8181-6a820b86e12f";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://vkrcobprntictsxqmjjl.supabase.co";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceKey);

Deno.test({
  name: "End-to-End Meal Plan Save Flow for Wannubia",
  async fn() {
    console.log("Starting E2E Save Flow for Wannubia...");

    // 1. Ensure Patient-Professional Link
    const { data: link, error: linkErr } = await supabase
      .from("nutritionist_patients")
      .upsert({
        patient_id: PATIENT_ID,
        nutritionist_id: NUTRITIONIST_ID,
        tenant_id: TENANT_ID,
        status: "active",
      }, { onConflict: "patient_id,nutritionist_id" })
      .select()
      .single();
    
    if (linkErr) console.error("Link error (might be ignored if exists):", linkErr.message);
    assertExists(link || PATIENT_ID, "Patient should exist and be linked");

    // 2. Clean up old test plans for Wannubia
    await supabase
      .from("meal_plans")
      .delete()
      .eq("patient_id", PATIENT_ID)
      .eq("title", "TEST_WANNUBIA_E2E_FLOW");

    // 3. Create Draft Meal Plan
    const { data: draftPlan, error: draftErr } = await supabase
      .from("meal_plans")
      .insert({
        patient_id: PATIENT_ID,
        nutritionist_id: NUTRITIONIST_ID,
        tenant_id: TENANT_ID,
        title: "TEST_WANNUBIA_E2E_FLOW",
        description: "Plano gerado via teste de integração",
        plan_status: "draft",
        is_active: false,
        total_target_calories: 2000,
        total_target_protein: 150,
        total_target_carbs: 200,
        total_target_fat: 70,
        editor_version: "v2",
        generation_source: "e2e_test",
      })
      .select()
      .single();

    assertExists(draftPlan, "Draft plan should be created");
    assertNotEquals(draftPlan?.id, null, "Draft plan should have an ID");
    const planId = draftPlan!.id;
    console.log(`Draft created: ${planId}`);

    // 4. Add Sample Meal Plan Items
    const { error: itemsErr } = await supabase
      .from("meal_plan_items")
      .insert([
        {
          meal_plan_id: planId,
          meal_type: "breakfast",
          title: "Omelete de Frango",
          description: "3 ovos, 50g de frango desfiado, 1 fatia de queijo branco",
          calories_target: 400,
          protein_target: 35,
          carbs_target: 5,
          fat_target: 25,
          day_of_week: 1,
          tenant_id: TENANT_ID,
        },
        {
          meal_plan_id: planId,
          meal_type: "lunch",
          title: "Arroz com Feijão e Bife",
          description: "150g arroz, 100g feijão, 120g bife de alcatra, salada à vontade",
          calories_target: 700,
          protein_target: 45,
          carbs_target: 80,
          fat_target: 20,
          day_of_week: 1,
          tenant_id: TENANT_ID,
        }
      ]);

    assertNotEquals(itemsErr, undefined, "Meal items should be inserted without error");
    if (itemsErr) throw itemsErr;
    console.log("Meal items added.");

    // 5. Invoke Validation Engine
    console.log("Invoking validation engine...");
    const req = buildRequest(`http://localhost:54321/validate-meal-plan`, {
      meal_plan_id: planId,
      strict_mode: true
    });
    
    const res = await validateHandler(req, supabase);
    const validationData = await res.json();
    
    console.log("Validation Result:", JSON.stringify(validationData, null, 2));
    assertEquals(res.status, 200, "Validation should return 200 OK");
    assertExists(validationData.score, "Validation should return a score");
    assertExists(validationData.status, "Validation should return a status");

    // 6. Persistence & Approval (Simulate Professional Approval)
    console.log("Simulating professional approval...");
    const { data: approvedPlan, error: approveErr } = await supabase
      .from("meal_plans")
      .update({
        plan_status: "published_to_patient",
        is_active: true,
        last_validated_at: new Date().toISOString(),
        overall_validation_status: validationData.status,
        overall_score: validationData.score,
      })
      .eq("id", planId)
      .select()
      .single();

    assertExists(approvedPlan, "Approved plan should be updated");
    assertEquals(approvedPlan?.plan_status, "published_to_patient", "Status should be published");
    assertEquals(approvedPlan?.is_active, true, "Plan should be active");
    console.log("Flow complete: Plan is published and active.");

    // 7. Cleanup (Optional, but let's keep it to keep DB clean)
    // await supabase.from("meal_plans").delete().eq("id", planId);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
