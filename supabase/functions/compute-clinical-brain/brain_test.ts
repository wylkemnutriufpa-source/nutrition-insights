import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest, createMockSupabaseClient } from "../_shared/test-harness.ts";

const URL = "http://localhost/functions/v1/compute-clinical-brain";

Deno.test("compute-clinical-brain - run process for all active", async () => {
  const req = buildRequest(URL, {});
  const mockClient = createMockSupabaseClient({ patient_id: "p1", nutritionist_id: "n1" });
  const res = await handler(req, mockClient);
  const data = await res.json();
  assertEquals(res.status, 200);
  assertExists(data.patients_processed);
});

Deno.test("compute-clinical-brain - invalid payload", async () => {
  const req = buildToxicRequest(URL);
  const mockClient = createMockSupabaseClient();
  const res = await handler(req, mockClient);
  assertEquals(res.status, 200);
});
