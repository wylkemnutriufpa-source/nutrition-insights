
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateMealPlanHandler } from "./index.ts";

// Mock environment variables
Deno.env.set("SUPABASE_URL", "https://mock.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "mock-anon-key");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key");

// Helper to create a mock Supabase response
const mockFetch = (onInsert?: (items: any[]) => void) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    
    if (url.includes("/rest/v1/meal_plan_items") && init?.method === "POST") {
      const items = JSON.parse(init.body as string);
      if (onInsert) onInsert(items);
      return new Response(JSON.stringify(items), { status: 201 });
    }
    
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({
        id: "patient-123",
        email: "patient@example.com",
        aud: "authenticated",
      }), { status: 200 });
    }

    if (url.includes("/rest/v1/user_roles")) {
      return new Response(JSON.stringify([]), { status: 200 });
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
          weight: 70, height: 175, age: 30, sex: "male", goal: "maintain",
          activity_level: "moderate", restrictions: [], enabled_meals: ["breakfast", "lunch", "dinner"],
        }
      }), { status: 200 });
    }

    if (url.includes("/rest/v1/meal_visual_library")) {
      return new Response(JSON.stringify([
        { id: "v1", slug: "v1", name: "V1", display_name: "V1", category: "cafe_da_manha", image_url: "http://i/1" },
        { id: "v2", slug: "v2", name: "V2", display_name: "V2", category: "almoco", image_url: "http://i/2" },
        { id: "v3", slug: "v3", name: "V3", display_name: "V3", category: "jantar", image_url: "http://i/3" },
        { id: "v4", slug: "v4", name: "V4", display_name: "V4", category: "lanche", image_url: "http://i/4" },
        { id: "v5", slug: "v5", name: "V5", display_name: "V5", category: "ceia", image_url: "http://i/5" },
      ]), { status: 200 });
    }

    if (url.includes("/rest/v1/meal_recipes")) {
      return new Response(JSON.stringify([
        {
          id: "r1", name: "R1", meal_type: "almoço", is_fixed: true, is_scalable: false,
          foods_json: [{ name: "Frango", grams: 150 }, { name: "Arroz", grams: 200 }],
          fixed_calories: 500, fixed_protein: 40, fixed_carbs: 50, fixed_fat: 10
        },
        {
          id: "r2", name: "R2", meal_type: "jantar", is_fixed: true, is_scalable: false,
          foods_json: [{ name: "Carne", grams: 100 }, { name: "Arroz", grams: 150 }],
          fixed_calories: 400, fixed_protein: 30, fixed_carbs: 40, fixed_fat: 10
        }
      ]), { status: 200 });
    }
    
    if (url.includes("/rest/v1/nutritionist_patients")) {
      return new Response(JSON.stringify([{ id: "link-123" }]), { status: 200 });
    }
    
    if (url.includes("/rest/v1/meal_plans")) {
      return new Response(JSON.stringify([{ id: "plan-123" }]), { status: 200 });
    }
    
    return new Response(JSON.stringify([]), { status: 200 });
  };
  return () => { globalThis.fetch = originalFetch; };
};

Deno.test({
  name: "generate-meal-plan: serve() contract - Patient Mode preservation",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let insertedItems: any[] = [];
    const restoreFetch = mockFetch((items) => { insertedItems = items; });
    try {
      const req = new Request("http://localhost/generate-meal-plan", {
        method: "POST",
        headers: { "Authorization": "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patient_id: "patient-123",
          meal_plan_id: "plan-123",
          generationMode: "weekly_marmita"
        }),
      });

      const res = await generateMealPlanHandler(req);
      const data = await res.json();

      assertEquals(res.status, 200);
      assertEquals(data.success, true);
      
      const lunch = insertedItems.find((i: any) => i.meal_type === "lunch");
      console.log("Lunch Description:", lunch.description);
      assertEquals(lunch.description.includes("150g Frango"), true);
      assertEquals(lunch.description.includes("200g Arroz"), true);
      assertEquals(lunch.protein_target, 40);
      
      const dinner = insertedItems.find((i: any) => i.meal_type === "dinner");
      assertEquals(dinner.description.includes("100g Carne"), true);
      assertEquals(dinner.description.includes("150g Arroz"), true);
      assertEquals(dinner.protein_target, 30);
    } finally {
      restoreFetch();
    }
  }
});

Deno.test({
  name: "generate-meal-plan: serve() contract - unauthorized",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const req = new Request("http://localhost/generate-meal-plan", {
      method: "POST",
      body: JSON.stringify({ patient_id: "patient-123" }),
    });

    const res = await generateMealPlanHandler(req);
    assertEquals(res.status, 401);
  }
});
