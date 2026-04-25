
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

    // Patient
    if (url.includes("/rest/v1/patients")) {
      return new Response(JSON.stringify({ id: "p1", user_id: "u1", marmita_mode: true }), { status: 200 });
    }

    // Visual Library - Mixed items
    if (url.includes("/rest/v1/meal_visual_library")) {
      return new Response(JSON.stringify([
        { 
          id: "v1", slug: "marmita-1", name: "Marmita 1", display_name: "Marmita 1", 
          category: "almoco", plan_type: "marmita", is_active: true, clinical_tags: ["marmita"] 
        },
        { 
          id: "v2", slug: "normal-1", name: "Normal 1", display_name: "Normal 1", 
          category: "almoco", plan_type: "normal", is_active: true, clinical_tags: [] 
        }
      ]), { status: 200 });
    }

    // Templates
    if (url.includes("/rest/v1/meal_templates")) {
      return new Response(JSON.stringify([{
        id: "t1",
        name: "Template Teste",
        meals: [
          { 
            meal_type: "lunch", 
            title: "Almoço", 
            foods: [{ name: "Teste", amount: "1 unid" }] 
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
  name: "Consistency: Motor MUST NOT mix plan_type (NORMAL vs MARMITA)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    let insertedItems: any[] = [];
    const restoreFetch = mockFetch((items) => { insertedItems = items; });
    try {
      // Test for marmita mode
      const reqMarmita = new Request("http://localhost/generate-meal-plan", {
        method: "POST",
        headers: { "Authorization": "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patient_id: "p1",
          generation_mode: "smart",
          plan_type: "marmita"
        }),
      });

      const resMarmita = await generateMealPlanHandler(reqMarmita);
      assertEquals(resMarmita.status, 200);
      
      const hasNormalItem = insertedItems.some(item => item.plan_type === "normal");
      assertEquals(hasNormalItem, false, "Marmita plan should NOT contain normal items");

      // Reset for normal mode
      insertedItems = [];
      const reqNormal = new Request("http://localhost/generate-meal-plan", {
        method: "POST",
        headers: { "Authorization": "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patient_id: "p1",
          generation_mode: "smart",
          plan_type: "normal"
        }),
      });

      const resNormal = await generateMealPlanHandler(reqNormal);
      assertEquals(resNormal.status, 200);
      
      const hasMarmitaItem = insertedItems.some(item => item.plan_type === "marmita");
      assertEquals(hasMarmitaItem, false, "Normal plan should NOT contain marmita items");

    } finally {
      restoreFetch();
    }
  }
});
