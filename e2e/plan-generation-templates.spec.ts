import { test, expect } from "./fixtures";

test.describe("Plan Generation & Templates E2E", () => {
  test.beforeEach(async ({ nutriPage: page }) => {
    // Ensure we are on the meal plans page
    await page.goto("/meal-plans");
  });

  test("should generate plan for Wannubia and validate no column errors", async ({ nutriPage: page }) => {
    // 1. Open New Plan Modal
    await page.getByRole("button", { name: /Criar Novo Plano/i }).click();

    // 2. Select Wannubia (assuming she exists or we create her - for now search)
    // If she doesn't exist, this might fail, but in Lovable E2E we usually have seeded data
    // or we can use a known ID if we prefer.
    const searchInput = page.getByPlaceholder(/Pesquisar paciente/i).first();
    await searchInput.fill("Wannubia");
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Select first result if available, otherwise just use a generic patient for the flow
    const patientOption = page.locator('div[role="option"]').filter({ hasText: "Wannubia" }).first();
    if (await patientOption.isVisible()) {
      await patientOption.click();
    } else {
      console.log("Wannubia not found, using first available patient for general flow validation");
      await searchInput.clear();
      await page.locator('div[role="option"]').first().click();
    }

    // 3. Generate Plan
    await page.getByRole("button", { name: /Gerar Plano/i }).click();

    // 4. Validate Toast and Redirection
    // Check for template info in toast
    const toastMessage = page.getByText(/Plano gerado/i);
    await expect(toastMessage).toBeVisible({ timeout: 15000 });
    
    // Check if it mentions template (either fallback or previous)
    const templateToast = page.getByText(/Usamos o template|Plano gerado usando o template/i);
    await expect(templateToast).toBeVisible();

    // 5. Check Plan Builder for "column errors" (placeholders or NaN)
    await page.waitForURL(/\/plan-builder\/|\/meal-plan-editor-v2\//);
    
    // Verify no "NaN" or "Undefined" in the UI which often indicates column mapping errors
    await expect(page.getByText("NaN")).not.toBeVisible();
    await expect(page.getByText("undefined")).not.toBeVisible();
    await expect(page.getByText("Error", { exact: false })).not.toBeVisible();
  });

  test("should confirm template_id usage from last active plan", async ({ nutriPage: page }) => {
    // 1. Navigate to a patient details who has an active plan
    // This is hard to guarantee without a specific ID, so we'll use a generic approach
    await page.goto("/patients");
    const firstPatient = page.locator('tr').filter({ hasText: "Ativo" }).first();
    await firstPatient.click();

    // 2. Click to create plan from details
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();

    // 3. Verify the toast mentions the template
    // If they have an active plan, it should use that template
    await expect(page.getByText(/Plano gerado usando o template/i).or(page.getByText(/Usamos o template padrão/i))).toBeVisible({ timeout: 20000 });
  });

  test("should verify Marmita Mode logic in generation", async ({ nutriPage: page }) => {
    // 1. Go to a patient known to be in Marmita Mode
    // For Wannubia, we know she is often used for Marmita tests
    await page.goto("/patients");
    await page.getByPlaceholder(/Buscar/i).fill("Wannubia");
    await page.waitForTimeout(1000);
    
    const wannubiaRow = page.locator('tr').filter({ hasText: "Wannubia" }).first();
    if (await wannubiaRow.isVisible()) {
      await wannubiaRow.click();
      
      // 2. Click to generate
      await page.getByRole("button", { name: /Gerar Plano/i }).first().click();
      
      // 3. Verify it applies fixed_marmita or mentions marmita structure
      await expect(page.getByText(/Plano gerado/i)).toBeVisible({ timeout: 20000 });
      
      // Navigate to plan and check if items have "Marmita" in title or description
      await page.waitForURL(/\/plan-builder\/|\/meal-plan-editor-v2\//);
      
      // Check for Marmita items
      const marmitaItem = page.locator('text=Marmita').first();
      await expect(marmitaItem).toBeVisible();
    }
  });
});
