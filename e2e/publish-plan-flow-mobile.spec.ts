import { test, expect } from "./fixtures";
import { devices } from "@playwright/test";

test.use({ ...devices["iPhone 13"] });

test.describe("Publish Plan Flow - Mobile Wizard", () => {
  test.setTimeout(90000);

  test("verify full wizard flow reproduction on mobile and layout integrity", async ({ nutriPage }) => {
    const page = nutriPage;

    // 1. Setup: Navigate to a patient and start a session
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Click on the first patient card or row
    const patientCard = page.locator('[data-testid="patient-card"], .patient-row, tr').filter({ hasText: /./ }).first();
    await patientCard.click();
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);

    // Click "Iniciar Consulta" (mobile might have different text or visibility)
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    
    // Wait for the wizard to load
    await page.waitForURL(/\/in-office\/[a-zA-Z0-9-]+/);
    await page.waitForLoadState("networkidle");

    // Skip to step 5 (Finalizar)
    // On mobile, the step buttons might be in a scrollable container or different layout
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();
    
    // Ensure we are on the final step
    const publishBtn = page.getByTestId("publish-button");
    await expect(publishBtn).toBeVisible({ timeout: 10000 });

    // 2. Mock a slow response to capture the "Publishing..." state
    await page.route("**/rest/v1/meal_plans*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise(r => setTimeout(r, 5000)); // 5 seconds delay
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // 3. Click Publish
    await publishBtn.click();

    // 4. Verify Overlay and Layout Integrity
    const overlay = page.getByTestId("publish-progress-overlay");
    await expect(overlay).toBeVisible();

    // Verify it covers the whole screen (inset-0)
    const boundingBox = await overlay.boundingBox();
    const viewport = page.viewportSize();
    if (boundingBox && viewport) {
      expect(boundingBox.width).toBeGreaterThanOrEqual(viewport.width);
      expect(boundingBox.height).toBeGreaterThanOrEqual(viewport.height);
    }

    // Verify interaction blocking - steps should NOT be clickable
    // We try to click Step 1 using force: true to see if we can trigger a navigation
    const step1 = page.getByRole("button", { name: /1|Cadastro/i }).first();
    await step1.click({ force: true }).catch(() => {});
    
    // Overlay should still be visible and URL should NOT have changed (unless it was already at step 1, but we are at step 5)
    await expect(overlay).toBeVisible();
    expect(page.url()).toContain("step=5"); // Assuming step 5 is part of the URL or state

    // 5. Verify progress text is visible and updating
    const progressText = page.getByTestId("publish-progress-text");
    await expect(progressText).toBeVisible();
    // It starts at 0% or 25% quickly based on the component logic
    await expect(progressText).toHaveText(/%/);

    // 6. Wait for success state
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    await expect(overlay).not.toBeVisible();

    // 7. Verify "Ver perfil do paciente" redirection
    const viewProfileBtn = page.getByTestId("view-patient-profile-button");
    await expect(viewProfileBtn).toBeVisible();
    
    const patientProfileUrlRegex = /\/patients\/[a-zA-Z0-9-]+/;
    const expectedPatientIdMatch = page.url().match(/\/in-office\/([a-zA-Z0-9-]+)/);
    const patientId = expectedPatientIdMatch ? expectedPatientIdMatch[1] : null;

    await viewProfileBtn.click();

    // Ensure we are redirected to the correct patient profile
    await page.waitForURL(patientProfileUrlRegex);
    if (patientId) {
      expect(page.url()).toContain(`/patients/${patientId}`);
    }
    
    // Verify patient profile content is loaded
    await expect(page.locator('h1, h2')).toContainText(/./);
  });
});
