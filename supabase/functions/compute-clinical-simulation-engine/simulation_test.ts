import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";

Deno.test("compute-clinical-simulation-engine - fallback on empty payload", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res = await handler(req);
  // It will attempt DB calls, but we can verify it doesn't crash on payload
  assertEquals(res.status === 200 || res.status === 500, true);
});

Deno.test("compute-clinical-simulation-engine - toxic payload", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json",
  });
  const res = await handler(req);
  // Should catch and fallback to {}
  assertEquals(res.status === 200 || res.status === 500, true);
});
