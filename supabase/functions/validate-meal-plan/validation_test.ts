import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = "http://localhost:54321/functions/v1/validate-meal-plan";

Deno.test("validate-meal-plan - missing meal_plan_id", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Missing meal_plan_id");
});

Deno.test("validate-meal-plan - invalid payload", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "invalid json",
  });
  assertEquals(res.status, 400);
});

Deno.test("validate-meal-plan - plan not found", async () => {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meal_plan_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const data = await res.json();
  assertEquals(res.status, 400);
  assertEquals(data.error, "Meal plan not found");
});
