import { test, expect } from "./fixtures";

test.use({ 
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
});

test.describe("Publish Plan Flow - Mobile Wizard", () => {
  test.setTimeout(90000);

  test("verify full wizard flow reproduction on mobile and layout integrity", async ({ nutriPage }) => {
    const page = nutriPage;

    // 1. Setup: Navigate to a patient and start a session
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Click on the first patient card
    const patientCard = page.locator('[data-testid="patient-card"], .patient-row, tr').filter({ hasText: /./ }).first();
    await patientCard.click();
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);
    
    const currentUrl = page.url();
    const patientId = currentUrl.split('/').pop();

    // Click "Iniciar Consulta" or "Consultório"
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    
    // Wait for the wizard to load
    await page.waitForURL(/\/in-office\/[a-zA-Z0-9-]+/);
    await page.waitForLoadState("networkidle");

    // Skip to step 5 (Finalizar)
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await expect(step5).toBeVisible();
    await step5.click();
    
    // Ensure we are on the final step by checking for the publish button
    const publishBtn = page.getByTestId("publish-button");
    await expect(publishBtn).toBeVisible({ timeout: 10000 });

    // 2. Mock a slow response to capture the "Publishing..." state
    await page.route("**/rest/v1/meal_plans*", async (route) => {
      if (route.request().method() === "PATCH") {
        await new Promise(r => setTimeout(r, 4000)); // 4 seconds delay
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
      // Allow for small rounding differences
      expect(boundingBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
      expect(boundingBox.height).toBeGreaterThanOrEqual(viewport.height - 1);
    }

    // Ensure the card inside the overlay is not breaking layout (not wider than viewport)
    const overlayCard = overlay.locator('.lucide-send').locator('xpath=ancestor::div[contains(@class, "rounded-xl") or contains(@class, "border")]').first();
    // Actually, I can just check the Card component directly if I know its structure
    const card = overlay.locator('.rounded-lg, .border').first();
    const cardBox = await card.boundingBox();
    if (cardBox && viewport) {
      expect(cardBox.width).toBeLessThanOrEqual(viewport.width);
    }

    // 5. Verify interaction blocking - steps should NOT be clickable
    // We try to click Step 1 using force: true to see if we can trigger a navigation
    const step1 = page.getByRole("button", { name: /1|Cadastro/i }).first();
    await step1.click({ force: true }).catch(() => {});
    
    // Overlay should still be visible (if step changed, overlay would unmount)
    await expect(overlay).toBeVisible();

    // 6. Verify progress text is visible and updating
    const progressText = page.getByTestId("publish-progress-text");
    await expect(progressText).toBeVisible();
    await expect(progressText).toHaveText(/%/);

    // 7. Wait for success state
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    await expect(overlay).not.toBeVisible();

    // 8. Verify "Ver perfil do paciente" redirection
    const viewProfileBtn = page.getByTestId("view-patient-profile-button");
    await expect(viewProfileBtn).toBeVisible();
    
    await viewProfileBtn.click();

    // Ensure we are redirected back to the correct patient profile
    await page.waitForURL(new RegExp(`/patients/${patientId}`));
    expect(page.url()).toContain(`/patients/${patientId}`);
    
    // Verify patient profile content is loaded
    await expect(page.locator('h1, h2')).toContainText(/./);
  });
});
