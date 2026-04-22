import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest } from "../_shared/test-harness.ts";

const URL = "http://localhost/functions/v1/compute-clinical-brain";

Deno.test("compute-clinical-brain - run process for all active", async () => {
  const req = buildRequest(URL, {});
  const res = await handler(req);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("compute-clinical-brain - toxic payload", async () => {
  const req = buildToxicRequest(URL);
  const res = await handler(req);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});
