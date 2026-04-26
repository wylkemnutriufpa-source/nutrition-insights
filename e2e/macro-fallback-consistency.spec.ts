import { test, expect } from "./fixtures";

test.describe("Macro Fallback Consistency", () => {
  test("UI uses fallback '-' or '0' for missing macro fields without NaN/undefined", async ({ nutriPage }) => {
    // Poison the response with missing/null fields
    await nutriPage.route("**/rest/v1/meal_plan_items?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "toxic-item-1",
            label: "Refeição Tóxica",
            calories_target: null,
            protein_target: null,
            carbs_target: null,
            fat_target: null,
          }
        ])
      });
    });

    await nutriPage.goto("/patients");
    await nutriPage.waitForLoadState("networkidle");
    await nutriPage.locator("table tbody tr").first().click();
    
    const builderBtn = nutriPage.getByRole("button", { name: /Builder Híbrido/i }).first();
    await builderBtn.click();

    // Verify BuilderTopbar macro chips
    const chips = nutriPage.locator(".flex.items-center.gap-4.text-xs div");
    await expect(chips.first()).toBeVisible();

    const bodyText = await nutriPage.innerText("body");
    expect(bodyText).not.toContain("NaN");
    expect(bodyText).not.toContain("undefined");
    expect(bodyText).not.toContain("null");

    // Check that we see "0" or "—"
    const kcalChip = nutriPage.locator("span:has-text('Kcal:') + span");
    const kcalValue = await kcalChip.innerText();
    expect(["0", "—"]).toContain(kcalValue.trim());
  });

  test("Consistency between Desktop and Mobile for fallbacks", async ({ nutriPage }) => {
    // Desktop check
    await nutriPage.setViewportSize({ width: 1280, height: 720 });
    await nutriPage.goto("/diet-templates"); // Another page with macros
    await nutriPage.waitForLoadState("networkidle");
    
    let desktopText = await nutriPage.innerText("body");
    expect(desktopText).not.toContain("NaN");

    // Mobile check
    await nutriPage.setViewportSize({ width: 375, height: 812 });
    await nutriPage.reload();
    await nutriPage.waitForLoadState("networkidle");
    
    let mobileText = await nutriPage.innerText("body");
    expect(mobileText).not.toContain("NaN");
    
    // Ensure both render the same fallback character if any
    const desktopFallback = desktopText.includes("—");
    const mobileFallback = mobileText.includes("—");
    expect(desktopFallback).toBe(mobileFallback);
  });
});
