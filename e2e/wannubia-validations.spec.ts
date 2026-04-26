import { test, expect } from "./fixtures";

test.describe("Wannubia Specific E2E Validations", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a plan editor where the patient is Wannubia
    // In our mock environment, we might need a specific ID or 
    // we can use a fixture that sets the patient name in the store.
    // For now, let's assume we go to a generic plan and we'll check if we can "set" the patient.
    await page.goto("/meal-plan-editor-v2/cc51e7bd-55b2-49d3-90ef-f9ac1de002e6");
  });

  test("should block isolated foods in smart editor for Wannubia", async ({ page }) => {
    // 1. Ensure patient is Wannubia (this might be set via the plan ID in a real scenario)
    // For this test to work, the plan linked to the ID must have patient 'Wannubia'
    // or we can simulate it if our mock database is set up that way.
    
    // 2. Open a meal editor
    const mealCard = page.locator("[id^='meal-item-']").first();
    await expect(mealCard).toBeVisible();
    await mealCard.click();

    // 3. Check if 'Alimento' tab shows the warning for Wannubia
    const warning = page.getByText(/Apenas Marmitas Permitidas/i);
    await expect(warning).toBeVisible();

    // 4. Verify 'Adicionar ao editor' from search is not visible or shows warning
    // (Already checked by the specific UI block in MealSmartEditorModal)
  });

  test("should block specific substitution combinations for Wannubia", async ({ page }) => {
    // 1. Open meal editor
    const mealCard = page.locator("[id^='meal-item-']").first();
    await mealCard.click();

    // 2. Add a substitution that should be blocked for Wannubia
    // Let's assume 'Ovo' + 'Frango' in the same substitution line is blocked
    await page.getByTestId("add-substitution-button").click();
    const lastInput = page.locator('[data-testid^="substitution-input-"]').last();
    await lastInput.fill("Ovo e Frango");
    
    // 3. Save meal changes
    await page.getByRole("button", { name: /Salvar Alterações/i }).click();

    // 4. Try to save the whole plan
    await page.getByRole("button", { name: /Salvar/i }).first().click();

    // 5. Verify validation error toast
    // This requires the logic to be implemented in validateMealSubstitutions
    await expect(page.getByText(/Combinação bloqueada para esta paciente/i)).toBeVisible();
  });

  test("should block saving plan if daily totals are zero", async ({ page }) => {
    // 1. Clear all meals in a day (simulated by having no items or all items with 0 macros)
    // This is hard to do without a 'clear all' button that works across days.
    // But we can try to save a plan that we know has 0 totals.
    
    // 2. Click Save
    await page.getByRole("button", { name: /Salvar/i }).first().click();

    // 3. Verify error toast
    // This requires logic in handleSave to check totals
    await expect(page.getByText(/O plano não pode ter totais zerados/i)).toBeVisible();
  });
});
