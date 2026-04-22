import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/compute-clinical-brain";

Deno.test("compute-clinical-brain - run process for all active", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  assertEquals(res.status, 200);
  assertExists(data.patients_processed);
});

Deno.test("compute-clinical-brain - invalid payload", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "toxic",
  });
  // Catches and proceeds with {}
  assertEquals(res.status, 200);
});
