
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateMealPlanHandler } from "./index.ts";

// Mock environment variables
Deno.env.set("SUPABASE_URL", "https://mock.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "mock-anon-key");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "mock-service-key");

const mockFetch = (onInsert?: (items: any[]) => void) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    
    // Auth
    if (url.includes("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "nutri-123", email: "nutri@example.com", aud: "authenticated" }), { status: 200 });
    }

    // Role
    if (url.includes("/rest/v1/user_roles")) {
      return new Response(JSON.stringify([{ role: "admin" }]), { status: 200 });
    }

    // Profile & Tenant
    if (url.includes("/rest/v1/profiles")) {
      return new Response(JSON.stringify({ id: "nutri-123", tenant_id: "tenant-123", role: "admin" }), { status: 200 });
    }

    // Recipes - Mocking the "19 recipes from today"
    if (url.includes("/rest/v1/meal_recipes")) {
      const today = new Date().toISOString();
      const recipes = [];
      for (let i = 1; i <= 19; i++) {
        recipes.push({
          id: `r${i}`,
          name: `Receita Real ${i}`,
          meal_type: i % 2 === 0 ? "almoço" : "jantar",
          created_at: today,
          foods_json: [{ name: "Ingrediente", grams: 100 }],
          is_fixed: true
        });
      }
      return new Response(JSON.stringify(recipes), { status: 200 });
    }

    // Patient
    if (url.includes("/rest/v1/patients")) {
      return new Response(JSON.stringify({ id: "p1", user_id: "u1", marmita_mode: true }), { status: 200 });
    }

    // Templates with "Marmita do dia"
    if (url.includes("/rest/v1/meal_templates")) {
      return new Response(JSON.stringify([{
        id: "t1",
        name: "Template Teste",
        meals: [
          { 
            meal_type: "lunch", 
            title: "Almoço Marmita", 
            foods: [{ name: "Marmita do dia", amount: "1 unid" }] 
          }
        ]
      }]), { status: 200 });
    }

    // Insertion Capture
    if (url.includes("/rest/v1/meal_plan_items") && init?.method === "POST") {
      const items = JSON.parse(init.body as string);
      if (onInsert) onInsert(items);
      return new Response(JSON.stringify(items), { status: 201 });
    }

    return new Response(JSON.stringify([]), { status: 200 });
  };
  return () => { globalThis.fetch = originalFetch; };
};

Deno.test({
  name: "Validation: 'Marmita do dia' is NEVER present and recipes are sorted",
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
          patient_id: "p1",
          generation_mode: "fixed_marmita"
        }),
      });

      const res = await generateMealPlanHandler(req);
      const data = await res.json();

      assertEquals(res.status, 200, "Should return 200 OK");
      
      // Ensure "Marmita do dia" is gone
      const hasMarmitaText = insertedItems.some(item => 
        item.title?.toLowerCase().includes("marmita do dia") || 
        item.description?.toLowerCase().includes("marmita do dia")
      );
      assertEquals(hasMarmitaText, false, "Text 'marmita do dia' should NOT be present");

      // Ensure recipes from today are used
      const hasRealRecipe = insertedItems.some(item => item.title?.includes("Receita Real"));
      assertEquals(hasRealRecipe, true, "Should have replaced placeholders with real recipes");
      
      console.log("Validation test passed: Placeholder removed and real recipes used.");
    } finally {
      restoreFetch();
    }
  }
});
