import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handler } from "./index.ts";
import { buildRequest, buildToxicRequest, createMockSupabaseClient, MEAL_PLAN_FIXTURE } from "../_shared/test-harness.ts";

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

Deno.test("validate-meal-plan - valid plan", async () => {
  const req = buildRequest(URL, { meal_plan_id: MEAL_PLAN_FIXTURE.id });
  // Mock client returns a plan and some items
  const mockClient = createMockSupabaseClient({ id: MEAL_PLAN_FIXTURE.id, patient_id: "p1" });
  
  const res = await handler(req, mockClient);
  const data = await res.json();
  
  // Should successfully process
  assertEquals(res.status, 200);
  assertExists(data.overall_passed);
});

function assertExists(val: any) {
  if (val === undefined || val === null) throw new Error("Value should exist");
}
