
import { test, expect } from "./fixtures";

test.describe("Publish Plan Flow - In-Office Wizard", () => {
  test.setTimeout(60000);

  test("verify overlay progress, retry on failure, and success redirection", async ({ nutriPage }) => {
    const page = nutriPage;

    // 1. Setup: Navigate to a patient and start a session
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Click on the first patient card or row
    const patientRow = page.locator('[data-testid="patient-card"], .patient-row, tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);

    // Click "Consultório FitJourney" or "Iniciar Consulta"
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    
    // Wait for the wizard to load
    await page.waitForURL(/\/in-office\/[a-zA-Z0-9-]+/);
    await page.waitForLoadState("networkidle");

    // Skip to step 5 (Finalizar)
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();
    
    // Ensure we are on the final step
    const publishBtn = page.getByTestId("publish-button");
    await expect(publishBtn).toBeVisible({ timeout: 10000 });

    // 2. Simulate Timeout/Network Failure (408/504)
    await page.route("**/rest/v1/meal_plans*", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 504,
          contentType: "application/json",
          body: JSON.stringify({ message: "Gateway Timeout" }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Click Publish and check intervals and interaction blocking
    await publishBtn.click();

    // Verify interaction is blocked (button disabled)
    await expect(publishBtn).toBeDisabled();
    
    // Verify Overlay
    const overlay = page.getByTestId("publish-progress-overlay");
    await expect(overlay).toBeVisible();

    // Verify progress intervals (Realistic intervals 0 -> 25 -> 50 -> 75 -> 100)
    // Note: We might miss some if they happen too fast, so we check for their appearance
    const progressText = page.getByTestId("publish-progress-text");
    await expect(progressText).toHaveText(/0%/);
    await expect(progressText).toHaveText(/25%/, { timeout: 1000 });
    await expect(progressText).toHaveText(/50%/, { timeout: 1000 });
    await expect(progressText).toHaveText(/75%/, { timeout: 1000 });

    // 4. Verify Failure State for 504
    await expect(page.getByText("Falha no envio")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("publish-error-message")).toContainText("Gateway Timeout");
    
    const retryBtn = page.getByTestId("retry-publish-button");
    await expect(retryBtn).toBeVisible();

    // 5. Simulate Success for the second attempt
    await page.unroute("**/rest/v1/meal_plans*");
    await page.route("**/rest/v1/meal_plans*", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Click Retry
    await retryBtn.click();

    // Check progress reaches 100% on success
    await expect(progressText).toHaveText(/100%/, { timeout: 5000 });

    // Verify success indication
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    
    // Overlay should be gone
    await expect(overlay).not.toBeVisible();

    // 6. Redirect to Patient Profile
    const viewProfileBtn = page.getByRole("button", { name: /Ver perfil do paciente/i });
    await viewProfileBtn.click();

    // Check redirection URL
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);
  });

  test("interaction prevention while publishing", async ({ nutriPage }) => {
    const page = nutriPage;
    await page.goto("/patients");
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await startBtn.click();
    
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();

    const publishBtn = page.getByTestId("publish-button");
    
    // Mock a slow response to test blocking
    await page.route("**/rest/v1/meal_plans*", async (route) => {
      await new Promise(r => setTimeout(r, 5000));
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await publishBtn.click();

    // Check that we can't click other steps while publishing
    const step1 = page.getByRole("button", { name: /1|Cadastro/i }).first();
    // Attempting to click should either do nothing (because overlay is on top) or be ignored
    // We check if the overlay is still there after the attempt
    await step1.click({ force: true }).catch(() => {}); 
    await expect(page.getByTestId("publish-progress-overlay")).toBeVisible();
    
    // Check URL hasn't changed (still in the wizard)
    expect(page.url()).toContain("/in-office/");
  });
});
