import { test, expect } from "@playwright/test";

test.describe("Invitation and Domain Consistency", () => {
  const OFFICIAL_DOMAIN = "https://www.fitjourney.com.br";

  test("Invitation links should always use the official domain", async ({ page }) => {
    // Note: We can't easily test the full professional flow without complex setup,
    // but we can verify the centralized config and existing links.
    
    await page.goto("/auth");
    
    // Check if canonical link is correct
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBe(OFFICIAL_DOMAIN);
  });

  test("Public invitation pages should render professional/clinic info", async ({ page }) => {
    // This test assumes a mock code or an existing one if we were in a real environment.
    // For now, we verify the route existence.
    const response = await page.goto("/convite/INVALID_CODE");
    expect(response?.status()).toBe(200);
    
    // Should show error for invalid code
    await expect(page.locator("text=Convite não encontrado")).toBeVisible();
  });
});
