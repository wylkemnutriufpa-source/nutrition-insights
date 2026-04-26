import { test, expect } from "./fixtures";

test.describe("BuilderTopbar — Badge & Visual Regression", () => {
  test.beforeEach(async ({ nutriPage }) => {
    // Intercept with a consistent template name for snapshots
    await nutriPage.route("**/rest/v1/meal_plans?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "plan-snapshot-123",
          title: "Plano Snapshot",
          plan_status: "draft",
          generation_metadata: { template_name_used: "Modelo Estável" }
        }])
      });
    });
  });

  test("Badge visual snapshot regression and exact label validation", async ({ nutriPage }) => {
    await nutriPage.goto("/patients");
    await nutriPage.waitForLoadState("networkidle");
    
    // Select first patient
    await nutriPage.locator("table tbody tr").first().click();
    await nutriPage.waitForURL(/\/patient\//);

    // Open Hybrid Builder
    const builderBtn = nutriPage.getByRole("button", { name: /Builder Híbrido|Plano de Dieta/i }).first();
    await builderBtn.click();

    // Locate badge by test-id with retries handled by Playwright
    const badge = nutriPage.locator("[data-testid='builder-template-badge']");
    await expect(badge).toBeVisible({ timeout: 15000 });

    // Validate exact label
    await expect(badge).toHaveText(/Template: Modelo Estável/i);

    // Visual Snapshot with regression tolerance
    // This generates artifacts in e2e/builder-topbar-badge.spec.ts-snapshots/
    await expect(badge).toHaveScreenshot("builder-template-badge.png", {
      maxDiffPixels: 50,
      threshold: 0.1,
      animations: "disabled",
    });
  });

  test("Badge persistence after UI interaction and section re-opening", async ({ nutriPage }) => {
    await nutriPage.goto("/patients");
    await nutriPage.locator("table tbody tr").first().click();
    await nutriPage.getByRole("button", { name: /Builder Híbrido/i }).first().click();

    const badge = nutriPage.locator("[data-testid='builder-template-badge']");
    await expect(badge).toBeVisible();

    // Simulate switching tabs or sections if available
    // Look for tabs in the hybrid builder
    const tab = nutriPage.locator("[role='tab'], .tabs-list button").nth(1);
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await nutriPage.waitForTimeout(500);
      await expect(badge).toBeVisible();
    }

    // Close and re-open the panel
    const backBtn = nutriPage.locator("button:has(svg.lucide-arrow-left)").first();
    await backBtn.click();
    await nutriPage.waitForURL(/\/patient\//);
    
    await nutriPage.getByRole("button", { name: /Builder Híbrido/i }).first().click();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/Template: Modelo Estável/i);
  });
});
