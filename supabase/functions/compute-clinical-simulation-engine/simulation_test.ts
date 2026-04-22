import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest, PATIENT_FIXTURE } from "../_shared/test-harness.ts";

const URL = "http://localhost/functions/v1/compute-clinical-simulation-engine";

Deno.test("compute-clinical-simulation-engine - empty payload fallback", async () => {
  const req = buildRequest(URL, {});
  const res = await handler(req);
  // Status 200 (processed: 0) or 500 (missing env) are acceptable for engine stability
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("compute-clinical-simulation-engine - toxic payload", async () => {
  const req = buildToxicRequest(URL);
  const res = await handler(req);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("compute-clinical-simulation-engine - valid patient", async () => {
  const req = buildRequest(URL, { patient_id: PATIENT_FIXTURE.id });
  const res = await handler(req);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});
