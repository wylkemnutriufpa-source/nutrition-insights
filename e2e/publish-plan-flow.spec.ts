import { test, expect } from "./fixtures";

test.describe("Publish Plan Flow - In-Office Wizard", () => {
  test.setTimeout(90000);

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

    // 2. Simulate Network Error followed by Timeout (408)
    let attempt = 0;
    await page.route("**/rest/v1/meal_plans*", async (route, request) => {
      if (request.method() === "PATCH") {
        attempt++;
        if (attempt === 1) {
          // First attempt: Network Error
          await route.abort("internetdisconnected");
        } else if (attempt === 2) {
          // Second attempt: 408 Timeout
          await route.fulfill({
            status: 408,
            contentType: "application/json",
            body: JSON.stringify({ message: "Request Timeout" }),
          });
        } else {
          // Third attempt onwards: Success
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
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
    // We use a regex and wait for each step to ensure we capture them even with timing variations
    const progressText = page.getByTestId("publish-progress-text");
    await expect(progressText).toHaveText(/0%/, { timeout: 2000 });
    await expect(progressText).toHaveText(/25%/, { timeout: 2000 });
    await expect(progressText).toHaveText(/50%/, { timeout: 2000 });
    await expect(progressText).toHaveText(/75%/, { timeout: 2000 });

    // 4. Verify Failure State for 408
    await expect(page.getByText("Falha no envio")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("publish-error-message")).toContainText("Request Timeout");
    
    const retryBtn = page.getByTestId("retry-publish-button");
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toBeEnabled();

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
    await expect(progressText).toHaveText(/100%/, { timeout: 10000 });

    // Verify success indication
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    
    // Overlay should be gone
    await expect(overlay).not.toBeVisible();

    // 6. Redirect to Patient Profile and verify consistency
    const currentUrl = page.url();
    const viewProfileBtn = page.getByTestId("view-patient-profile-button");
    await viewProfileBtn.click();

    // Check redirection URL
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);
    const newUrl = page.url();
    expect(newUrl).not.toBe(currentUrl);
    
    // Verify we are on a patient profile (the patient name should be visible or the ID should be in the URL)
    await expect(page.locator('h1, h2')).toContainText(/./);
  });

  test("interaction prevention while publishing and blocking steps", async ({ nutriPage }) => {
    const page = nutriPage;
    await page.goto("/patients");
    const patientRow = page.locator('[data-testid="patient-card"], .patient-row, tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await startBtn.click();
    
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();

    const publishBtn = page.getByTestId("publish-button");
    
    // Mock a slow response to test blocking
    await page.route("**/rest/v1/meal_plans*", async (route) => {
      await new Promise(r => setTimeout(r, 6000));
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await publishBtn.click();

    // Verify overlay is visible
    const overlay = page.getByTestId("publish-progress-overlay");
    await expect(overlay).toBeVisible();

    // Check that we can't click other steps while publishing
    const step1 = page.getByRole("button", { name: /1|Cadastro/i }).first();
    
    // Try to click step 1 while overlay is active
    // We expect the overlay to still be visible and the URL to remain the same
    await step1.click({ force: true }).catch(() => {}); 
    await expect(overlay).toBeVisible();
    expect(page.url()).toContain("/in-office/");
    
    // Also try clicking outside or on other buttons
    const prevBtn = page.getByRole("button", { name: /Voltar/i }).first();
    if (await prevBtn.isVisible()) {
        await prevBtn.click({ force: true }).catch(() => {});
        await expect(overlay).toBeVisible();
    }

    // Wait for completion and verify success
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    await expect(overlay).not.toBeVisible();
  });
});
