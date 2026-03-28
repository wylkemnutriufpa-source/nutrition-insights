/**
 * FitJourney E2E — Realtime & Notifications
 */
import { test, expect } from "./fixtures";

test.describe("Realtime & Notificações", () => {
  test("deve acessar notificações", async ({ authenticatedPage: page }) => {
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("chat deve carregar sem erros", async ({ nutriPage: page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // No uncaught errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(3000);
    expect(errors.length).toBe(0);
  });
});
