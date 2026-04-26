import { test, expect } from "./fixtures";

/**
 * FitJourney E2E — Navigation Guards & Step Sequencing
 */

test.describe("Navigation Guards", () => {

  test("deve redirecionar para consentimento se tentar acessar anamnese sem aceitar o termo", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login with a user who hasn't accepted consent (or mock the check)
    // For this test, we can mock the clinical-consent response
    await page.route("**/rest/v1/clinical_consents?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]), // Empty array means no consent
      });
    });

    await page.goto("/auth");
    await page.getByPlaceholder(/email/i).fill("e2e-test@fitjourney.app");
    await page.getByPlaceholder(/senha/i).fill("E2eTest@2026!");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Try to access anamnesis directly
    await page.goto("/anamnesis");
    
    // Should be redirected to consent-required
    await expect(page).toHaveURL(/\/consent-required/);
    await expect(page.getByText(/Proteção dos Seus Dados Clínicos/i)).toBeVisible();
    
    await context.close();
  });

  test("não deve travar o usuário em loops de redirecionamento se o consentimento existir", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Mock existing consent
    await page.route("**/rest/v1/clinical_consents?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "consent-123", accepted_terms_version: "1.0" }]),
      });
    });

    await page.goto("/auth");
    await page.getByPlaceholder(/email/i).fill("e2e-test@fitjourney.app");
    await page.getByPlaceholder(/senha/i).fill("E2eTest@2026!");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Access anamnesis
    await page.goto("/anamnesis");
    
    // Should stay on anamnesis
    await expect(page).toHaveURL(/\/anamnesis/);
    
    await context.close();
  });
});
