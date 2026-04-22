import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest, createMockSupabaseClient, PATIENT_FIXTURE } from "../_shared/test-harness.ts";

const URL = "http://localhost/functions/v1/compute-clinical-simulation-engine";

Deno.test("compute-clinical-simulation-engine - empty payload fallback", async () => {
  const req = buildRequest(URL, {});
  const mockClient = createMockSupabaseClient({ patient_id: "p1" });
  const res = await handler(req, mockClient);
  const data = await res.json();
  assertEquals(res.status, 200);
  assertExists(data.processed);
});

Deno.test("compute-clinical-simulation-engine - toxic payload", async () => {
  const req = buildToxicRequest(URL);
  const mockClient = createMockSupabaseClient();
  const res = await handler(req, mockClient);
  assertEquals(res.status, 200);
});

Deno.test("compute-clinical-simulation-engine - valid patient", async () => {
  const req = buildRequest(URL, { patient_id: PATIENT_FIXTURE.id });
  const mockClient = createMockSupabaseClient({ patient_id: PATIENT_FIXTURE.id });
  const res = await handler(req, mockClient);
  assertEquals(res.status, 200);
});
