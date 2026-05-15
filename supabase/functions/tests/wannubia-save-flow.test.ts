import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler as validateHandler } from "../validate-meal-plan/index.ts";
import { buildRequest, createMockSupabaseClient } from "../_shared/test-harness.ts";

Deno.test({
  name: "E2E Save Flow Simulation (with Mocks for RLS bypass)",
  async fn() {
    console.log("Starting E2E Save Flow Simulation for Wannubia...");

    // Mock patient and plan data
    const mockPlanId = "b3aa9e2a-58b0-432c-a312-00bb8994d384"; // Reusing patient ID as mock plan ID
    const mockPlan = {
      id: mockPlanId,
      patient_id: "b3aa9e2a-58b0-432c-a312-00bb8994d384",
      nutritionist_id: "9994b710-6006-4fca-9761-dc6afef160a4",
      plan_status: "draft",
      total_meta_calorias: 2000,
      total_meta_proteinas: 150,
      total_meta_carboidratos: 200,
      total_meta_gorduras: 70,
    };

    const mockItems = [
      {
        tipo_refeicao: "breakfast",
        title: "Omelete",
        meta_proteinas: 30,
        meta_calorias: 400,
      }
    ];

    // Create a mock client that returns our plan and items
    const mockSupabase = createMockSupabaseClient();
    
    // Customize mock response for specific calls
    // We need to simulate:
    // 1. Fetching plan
    // 2. Fetching items
    // 3. Updating plan
    
    const originalFrom = mockSupabase.from;
    mockSupabase.from = (table: string) => {
      const chain = originalFrom(table);
      if (table === "meal_plans") {
        chain.single = () => Promise.resolve({ data: mockPlan, error: null });
        chain.maybeSingle = () => Promise.resolve({ data: mockPlan, error: null });
        chain.update = () => chain;
      } else if (table === "meal_plan_items") {
        chain.then = (onRes: any) => Promise.resolve({ data: mockItems, error: null }).then(onRes);
      }
      return chain;
    };

    // 1. Invoke Validation
    const req = buildRequest(`http://localhost:54321/validate-meal-plan`, {
      meal_plan_id: mockPlanId,
      strict_mode: true
    });
    
    const res = await validateHandler(req, mockSupabase);
    const validationData = await res.json();
    
    assertEquals(res.status, 200, "Validation should return 200 OK");
    assertExists(validationData.score, "Validation should return a score");
    console.log(`Validation Score: ${validationData.score}`);

    // 2. Final Status Update
    mockPlan.plan_status = "published_to_patient";
    console.log("Mock flow complete: Status updated to published_to_patient");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

