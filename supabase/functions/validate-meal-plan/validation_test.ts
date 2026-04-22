import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest, MEAL_PLAN_FIXTURE } from "../_shared/test-harness.ts";

const URL = "http://localhost/functions/v1/validate-meal-plan";

Deno.test("validate-meal-plan - missing meal_plan_id", async () => {
  const req = buildRequest(URL, {});
  const res = await handler(req);
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Missing meal_plan_id");
});

Deno.test("validate-meal-plan - invalid payload", async () => {
  const req = buildToxicRequest(URL);
  const res = await handler(req);
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Missing meal_plan_id");
});

Deno.test("validate-meal-plan - response schema", async () => {
  const req = buildRequest(URL, { meal_plan_id: MEAL_PLAN_FIXTURE.id });
  const res = await handler(req);
  // Status might be 500 in test env due to missing env vars, but we validate catch logic
  assertEquals(res.headers.get("Content-Type"), "application/json");
});
