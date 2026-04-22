
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateMealPlanHandler } from "./index.ts";

// Mock environment variables
Deno.env.set("SUPABASE_URL", "https://mock.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "mock-anon-key");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key");

// Helper to create a mock Supabase response
const mockFetch = (responses: Record<string, any>) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    // console.log(`Mocking fetch to: ${url}`);

    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({
        id: "patient-123",
        email: "patient@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      }), { status: 200 });
    }

    if (url.includes("/rest/v1/user_roles")) {
      return new Response(JSON.stringify([]), { status: 200 }); // Patient has no special roles
    }

    if (url.includes("/rest/v1/profiles")) {
      if (url.includes("select=tenant_id")) {
        return new Response(JSON.stringify({ tenant_id: "tenant-123" }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "patient-123", user_id: "patient-123", marmita_mode: true }), { status: 200 });
    }

    if (url.includes("/rest/v1/patient_anamnesis")) {
      return new Response(JSON.stringify({
        id: "anamnesis-123",
        user_id: "patient-123",
        status: "completed",
        answers: {
          weight: 70,
          height: 175,
          age: 30,
          sex: "male",
          goal: "maintain",
          activity_level: "moderate",
          restrictions: [],
          enabled_meals: ["breakfast", "lunch", "dinner"],
        }
      }), { status: 200 });
    }

    if (url.includes("/rest/v1/meal_visual_library")) {
      return new Response(JSON.stringify([
        { id: "v1", slug: "pao-com-ovo", name: "Pão com Ovo", display_name: "Pão com Ovo", category: "cafe_da_manha", image_url: "http://image.com/1", clinical_tags: [] },
        { id: "v2", slug: "frango-com-arroz", name: "Frango com Arroz", display_name: "Frango com Arroz", category: "almoco", image_url: "http://image.com/2", clinical_tags: [] },
        { id: "v3", slug: "peixe-com-batata", name: "Peixe com Batata", display_name: "Peixe com Batata", category: "jantar", image_url: "http://image.com/3", clinical_tags: [] },
        { id: "v4", slug: "fruta", name: "Fruta", display_name: "Fruta", category: "lanche", image_url: "http://image.com/4", clinical_tags: [] },
        { id: "v5", slug: "iogurte", name: "Iogurte", display_name: "Iogurte", category: "ceia", image_url: "http://image.com/5", clinical_tags: [] },
      ]), { status: 200 });
    }

    if (url.includes("/rest/v1/meal_recipes")) {
      return new Response(JSON.stringify([
        {
          id: "r1",
          name: "Marmita Fixa Frango",
          meal_type: "lunch",
          foods_json: [{ name: "Frango", grams: 150 }, { name: "Arroz", grams: 200 }],
          is_fixed: true,
          is_scalable: false, // PRESERVES GRAMMAGES
          fixed_calories: 500,
          fixed_protein: 40,
          fixed_carbs: 50,
          fixed_fat: 10
        }
      ]), { status: 200 });
    }
    
    if (url.includes("/rest/v1/nutritionist_patients")) {
      return new Response(JSON.stringify([{ id: "link-123" }]), { status: 200 });
    }

    // Default empty success
    return new Response(JSON.stringify([]), { status: 200 });
  };
  return () => { globalThis.fetch = originalFetch; };
};

Deno.test("generate-meal-plan: Patient Mode Integration", async (t) => {
  const restoreFetch = mockFetch({});
  
  try {
    await t.step("should preserve grammages in Patient Mode (weekly_marmita) for non-scalable recipes", async () => {
      const req = new Request("http://localhost/generate-meal-plan", {
        method: "POST",
        headers: { 
          "Authorization": "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          patient_id: "patient-123",
          generationMode: "weekly_marmita" // Or let marmita_mode trigger it
        }),
      });

      const res = await generateMealPlanHandler(req);
      const data = await res.json();

      assertEquals(res.status, 200);
      assertEquals(data.success, true);
      
      // Check if items were generated
      const items = data.items || [];
      const lunchItems = items.filter((i: any) => i.meal_type === "lunch");
      
      if (lunchItems.length > 0) {
        const item = lunchItems[0];
        // The recipe has 150g Frango and 200g Arroz.
        // Since is_scalable is false, the description should contain exactly these grammages.
        assertEquals(item.description.includes("150g Frango"), true, "Should preserve 150g Frango");
        assertEquals(item.description.includes("200g Arroz"), true, "Should preserve 200g Arroz");
        
        // Macros should match the recipe's fixed macros if provided, or estimated ones
        // In our mock, we provided fixed_protein: 40
        assertEquals(item.protein_target, 40, "Should return correct protein macro");
      }
    });
  } finally {
    restoreFetch();
  }
});
