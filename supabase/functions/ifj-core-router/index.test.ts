import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Helper to call the edge function
async function callIFJCore(command: string, token?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ input_text: command, session_key: "test" }),
  });
  const body = await res.text();
  return { status: res.status, body: JSON.parse(body) };
}

// ══════════════════════════════════════════════════════════════
// 1. AUTH VALIDATION
// ══════════════════════════════════════════════════════════════
Deno.test("Returns 401 without auth header", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ input_text: "oi" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("Returns 401 with invalid token", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid_token",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ input_text: "oi" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

// ══════════════════════════════════════════════════════════════
// 2. INTENT DETECTION (structural validation via response shape)
// ══════════════════════════════════════════════════════════════
// NOTE: These tests validate the response format even without auth.
// With a valid auth token, they would also validate intent routing.

Deno.test("CORS preflight returns 200", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ifj-core-router`, {
    method: "OPTIONS",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.status, 200);
  await res.text();
});
