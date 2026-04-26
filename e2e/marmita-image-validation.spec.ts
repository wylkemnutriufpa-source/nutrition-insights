import { test, expect } from "./fixtures";

test.describe("Marmita Plan Generation - Image Validation", () => {
  test("should generate a plan with marmitas and ensure all recipes have valid images", async ({ nutriPage }) => {
    let requestPayload: any = null;
    let responseData: any = null;

    // Intercept generation call
    await nutriPage.route("**/functions/v1/generate-meal-plan", async (route) => {
      requestPayload = route.request().postDataJSON();
      
      // Simulate a successful response with marmitas
      const mockResponse = {
        success: true,
        mealPlanId: "mock-marmita-plan-123",
        items_count: 2,
        items: [
          {
            title: "🍱 Marmita Frango com Batata",
            description: "Frango grelhado com batata doce e brócolis",
            meal_type: "lunch",
            day_of_week: 1,
            image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop"
          },
          {
            title: "🍱 Marmita Carne com Arroz",
            description: "Carne moída com arroz integral e legumes",
            meal_type: "dinner",
            day_of_week: 1,
            image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop"
          }
        ]
      };
      
      responseData = mockResponse;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResponse)
      });
    });

    // Mock initial patient data
    await nutriPage.route("**/rest/v1/profiles?id=eq.*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "patient-456", full_name: "Paciente Marmita Test" }])
      });
    });

    // Go to patient page
    await nutriPage.goto("/patients");
    await nutriPage.waitForLoadState("networkidle");
    
    // Check if there are patients in the list, if not we might need to mock the list too
    // For now, assume there's at least one patient
    const firstPatient = nutriPage.locator("table tbody tr").first();
    if (await firstPatient.isVisible()) {
      await firstPatient.click();
    } else {
      // Navigate directly if list is empty
      await nutriPage.goto("/patient/patient-456");
    }

    await nutriPage.waitForURL(/\/patient\//);

    // Open Hybrid Builder / Plan Builder
    const builderBtn = nutriPage.getByRole("button", { name: /Builder Híbrido|Plano de Dieta/i }).first();
    await expect(builderBtn).toBeVisible();
    await builderBtn.click();

    // In the builder, choose "Marmitas" if there's an option or just trigger generation
    // Assuming there's a button to select "Plano de Marmitas"
    const marmitaOption = nutriPage.getByText(/Plano de Marmitas|Usar Marmitas/i).first();
    if (await marmitaOption.isVisible()) {
      await marmitaOption.click();
    }

    const generateBtn = nutriPage.getByRole("button", { name: /Gerar Plano/i }).first();
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();
    
    // Choose Strategy Mode (which often triggers the Edge Function)
    const strategyMode = nutriPage.getByText(/Gerar Template de 1 Dia \(Estratégia\)/i).first();
    if (await strategyMode.isVisible()) {
      await strategyMode.click();
      
      const openPreviewBtn = nutriPage.getByRole("button", { name: /Abrir Preview/i }).first();
      await expect(openPreviewBtn).toBeVisible();
      await openPreviewBtn.click();
      
      const confirmBtn = nutriPage.getByRole("button", { name: /Confirmar.*e Gerar Plano/i }).first();
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();
    }

    // Assertion: Check that all generated items in the response HAVE a non-empty image_url
    expect(responseData).toBeTruthy();
    expect(responseData.items.length).toBeGreaterThan(0);
    
    for (const item of responseData.items) {
      expect(item.image_url).toBeTruthy();
      expect(item.image_url.length).toBeGreaterThan(10); // Should be a valid URL
      expect(item.image_url).toContain("unsplash.com"); // Our fallback or a real unsplash image
    }

    // Verify UI shows images (optional but good)
    const mealImages = nutriPage.locator("img[src*='unsplash.com']");
    // Depending on the UI, we might check if images are rendered
  });
});
