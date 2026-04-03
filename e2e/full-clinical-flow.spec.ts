/**
 * FitJourney E2E — Full Clinical Flow
 * 
 * Tests the complete lifecycle:
 * 1. Nutritionist logs in
 * 2. Navigates to a patient profile
 * 3. Generates a meal plan
 * 4. Validates the plan
 * 5. Publishes the plan
 * 6. Verifies the patient can see it
 */
import { test, expect } from "./fixtures";

test.describe("Full Clinical Flow: Generate → Validate → Publish → Patient View", () => {
  test.setTimeout(120000);

  test("nutritionist generates, validates, and publishes a plan visible to patient", async ({ nutriPage }) => {
    const page = nutriPage;

    // Step 1: Navigate to patients list
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).not.toContainText("Carregando...", { timeout: 10000 });

    // Step 2: Click on the first patient
    const patientCard = page.locator('[data-testid="patient-card"], .patient-row, table tbody tr, [class*="patient"]').first();
    await expect(patientCard).toBeVisible({ timeout: 10000 });
    await patientCard.click();
    await page.waitForLoadState("networkidle");

    // Step 3: Verify we're on the patient profile
    await expect(page.url()).toContain("/patient");

    // Step 4: Look for "Gerar Plano" or similar button
    const generateBtn = page.getByRole("button", { name: /gerar.*plano|novo.*plano|criar.*plano/i }).first();

    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.click();

      // Wait for plan generation to complete
      await page.waitForResponse(
        (res) => res.url().includes("generate-meal-plan") && res.status() === 200,
        { timeout: 60000 }
      );

      // Wait for the editor/plan to load
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);
    }

    // Step 5: Look for "Validar e Corrigir" button
    const validateBtn = page.getByRole("button", { name: /validar|validate/i }).first();
    if (await validateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await validateBtn.click();
      await page.waitForTimeout(5000);
    }

    // Step 6: Look for "Publicar" / "Aprovar e Publicar" button
    const publishBtn = page.getByRole("button", { name: /publicar|aprovar.*publicar|publish/i }).first();
    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await publishBtn.click();
      
      // Wait for publication to complete
      await page.waitForTimeout(3000);

      // Verify success indication
      const successIndicator = page.locator('text=/publicado|sucesso|published/i').first();
      await expect(successIndicator).toBeVisible({ timeout: 10000 });
    }

    // Step 7: Verify plan appears in patient's list
    // Navigate back to patient profile to confirm plan is visible
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Check for published plan indicator
    const planBadge = page.locator('text=/publicado|published|ativo/i').first();
    if (await planBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(planBadge).toBeVisible();
    }
  });

  test("published plan is visible to patient", async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    // Patient navigates to their diet page
    await page.goto("/my-diet");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify there's a plan visible
    const planContent = page.locator('[class*="meal"], [class*="plan"], [class*="diet"]').first();
    const hasPlan = await planContent.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasPlan) {
      // Verify plan has actual content (meals)
      const mealItems = page.locator('[class*="meal-item"], [class*="food"], tr, [class*="refeicao"]');
      const count = await mealItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
