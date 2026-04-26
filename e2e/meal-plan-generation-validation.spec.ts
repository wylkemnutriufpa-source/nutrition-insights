import { test, expect } from "./fixtures";

test.describe("Meal Plan Generation - Payload & Toast Validation", () => {
  test("Scenario 1: With active previous plan (template_id should be sent)", async ({ nutriPage }) => {
    let requestPayload: any = null;
    
    // Intercept generation call
    await nutriPage.route("**/functions/v1/generate-meal-plan", async (route) => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          mealPlanId: "mock-id-123",
          items_count: 5,
          template_name_used: "Plano Hipertrofia",
          is_fallback_template: false
        })
      });
    });

    // Mock initial patient data and plan state
    await nutriPage.route("**/rest/v1/profiles?id=eq.*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "patient-123", full_name: "Test Patient" }])
      });
    });

    await nutriPage.goto("/patients");
    await nutriPage.waitForLoadState("networkidle");
    
    // Click a patient (assuming list works or mocking it)
    await nutriPage.locator("table tbody tr").first().click();
    await nutriPage.waitForURL(/\/patient\//);

    // Open Hybrid Builder
    const builderBtn = nutriPage.getByRole("button", { name: /Builder Híbrido|Plano de Dieta/i }).first();
    await builderBtn.click();

    // In the builder, open generation mode selector
    const generateBtn = nutriPage.getByRole("button", { name: /Gerar Plano/i }).first();
    await generateBtn.click();
    
    // Choose Strategy Mode
    await nutriPage.getByText(/Gerar Template de 1 Dia \(Estratégia\)/i).click();
    
    // Confirm strategy
    await nutriPage.getByRole("button", { name: /Abrir Preview/i }).first().click();
    await nutriPage.getByRole("button", { name: /Confirmar.*e Gerar Plano/i }).click();

    // Assertion: Payload check
    expect(requestPayload).toBeTruthy();
    expect(requestPayload.body.strategyOverride.strategyId).toBeTruthy();
    expect(requestPayload.body.existingPlanId).toBeTruthy();

    // Assertion: Toast check
    // Wait for toast by data-testid
    const toaster = nutriPage.locator("[data-testid='sonner-toaster']");
    await expect(toaster).toBeVisible();
    
    const toast = toaster.locator("li");
    // Verify exact text expected (handling possible line breaks/spaces)
    await expect(toast).toContainText(/Plano gerado usando o template: Plano Hipertrofia/);
  });

  test("Scenario 2: No active previous plan (template_id never blank)", async ({ nutriPage }) => {
    let requestPayload: any = null;
    
    await nutriPage.route("**/functions/v1/generate-meal-plan", async (route) => {
      requestPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          mealPlanId: "mock-id-456",
          items_count: 3,
          template_name_used: "Base",
          is_fallback_template: true
        })
      });
    });

    // Mock no existing plan
    await nutriPage.route("**/rest/v1/meal_plans?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    await nutriPage.goto("/patients");
    await nutriPage.locator("table tbody tr").first().click();
    
    const builderBtn = nutriPage.getByRole("button", { name: /Builder Híbrido|Plano de Dieta/i }).first();
    await builderBtn.click();

    const generateBtn = nutriPage.getByRole("button", { name: /Gerar Plano/i }).first();
    await generateBtn.click();
    
    await nutriPage.getByText(/Gerar Template de 1 Dia \(Estratégia\)/i).click();
    await nutriPage.getByRole("button", { name: /Abrir Preview/i }).first().click();
    await nutriPage.getByRole("button", { name: /Confirmar.*e Gerar Plano/i }).click();

    // Assertion: Payload check - template_id (strategyId) should NOT be null or empty
    expect(requestPayload.body.strategyOverride.strategyId).not.toBeNull();
    expect(requestPayload.body.strategyOverride.strategyId).not.toBe("");

    // Assertion: Toast check for fallback
    const toast = nutriPage.locator("[data-testid='sonner-toaster'] li");
    await expect(toast).toContainText(/Nota: Nenhum plano anterior encontrado/);
    await expect(toast).toContainText(/Usamos o template padrão "Base" como fallback/);
  });
});
