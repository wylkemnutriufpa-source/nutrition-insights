import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/compute-clinical-simulation-engine";

Deno.test("compute-clinical-simulation-engine - empty payload (high priority fallback)", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assertExists(data.processed);
});

Deno.test("compute-clinical-simulation-engine - specific patient not found", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assertEquals(data.processed, 0);
});

Deno.test("compute-clinical-simulation-engine - invalid json", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "toxic payload",
  });
  // The engine catches parse error and uses {} which falls back to high-priority
  assertEquals(res.status, 200); 
});
