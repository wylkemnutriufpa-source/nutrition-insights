import { test, expect } from "@playwright/test";

const MAIN_ROUTES = [
  "/",
  "/auth",
  "/landing",
  "/landing-paciente",
  "/landing-personal",
  "/landing-afiliado",
  "/biquini-branco",
  "/reset-password",
  "/politica-de-privacidade",
  "/termos-de-uso",
  "/exclusao-de-conta",
];

test.describe("Main Routing Validation", () => {
  for (const route of MAIN_ROUTES) {
    test(`Route "${route}" should load without 404`, async ({ page }) => {
      // Capture all responses to check for 404 status codes
      const responses: number[] = [];
      page.on("response", (response) => {
        if (response.url().includes(route)) {
          responses.push(response.status());
        }
      });

      await page.goto(route, { waitUntil: "networkidle" });

      // 1. Check if the page contains the 404 text from NotFound component
      const notFoundText = page.getByText("Página não encontrada");
      await expect(notFoundText).not.toBeVisible();

      // 2. Check if the "404" indicator is NOT present
      const fourOhFourIndicator = page.locator("span").filter({ hasText: /^404$/ });
      await expect(fourOhFourIndicator).not.toBeVisible();

      // 3. Ensure we didn't get an actual 404 from the server for the main doc
      // Note: In SPAs, the main doc is usually 200 even if the route is "404" inside the app.
      // But if there's a misconfiguration in basePath, the whole page might fail.
    });
  }

  test("Invalid route should show 404 page", async ({ page }) => {
    await page.goto("/non-existent-route-123456", { waitUntil: "networkidle" });
    const notFoundText = page.getByText("Página não encontrada");
    await expect(notFoundText).toBeVisible();
    
    const fourOhFourIndicator = page.locator("span").filter({ hasText: /^404$/ });
    await expect(fourOhFourIndicator).toBeVisible();
  });
});
