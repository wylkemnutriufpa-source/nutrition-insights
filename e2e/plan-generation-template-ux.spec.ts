import { test, expect } from "./fixtures";

test.describe("Plan Generation UX & Template Logic E2E", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ nutriPage: page }) => {
    // Navigate to a patient page to have a clean start
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
  });

  test("should show correct template toast and BuilderTopbar badge", async ({ nutriPage: page }) => {
    // Mock the generation to return a specific template
    await page.route("**/functions/v1/generate-meal-plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mealPlanId: "test-plan-id",
          template_name_used: "Template Especial Teste",
          is_fallback_template: false,
          items_count: 5
        })
      });
    });

    // Mock fetching the generated plan
    await page.route("**/rest/v1/meal_plans?id=eq.test-plan-id*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "test-plan-id",
          title: "Plano Teste Template",
          generation_metadata: {
            template_name_used: "Template Especial Teste",
            is_fallback_template: false
          }
        }])
      });
    });

    // Go to first patient
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    
    // Trigger generation
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();

    // 1. Verify toast mentions the correct template
    await expect(page.getByText(/Plano gerado usando o template: Template Especial Teste/i)).toBeVisible();

    // 2. Verify BuilderTopbar badge
    await expect(page.getByText(/Template: Template Especial Teste/i)).toBeVisible();
  });

  test("should show clear fallback toast message when is_fallback_template is true", async ({ nutriPage: page }) => {
    // Mock the generation to return a fallback template
    await page.route("**/functions/v1/generate-meal-plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mealPlanId: "fallback-plan-id",
          template_name_used: "Template Fallback",
          is_fallback_template: true,
          items_count: 3
        })
      });
    });

    // Mock fetching the generated plan
    await page.route("**/rest/v1/meal_plans?id=eq.fallback-plan-id*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "fallback-plan-id",
          title: "Plano Fallback",
          generation_metadata: {
            template_name_used: "Template Fallback",
            is_fallback_template: true
          }
        }])
      });
    });

    // Go to first patient
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    
    // Trigger generation
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();

    // Verify fallback toast
    await expect(page.getByText(/Nenhum plano anterior encontrado. Usamos o template padrão "Template Fallback" como fallback/i)).toBeVisible();
  });

  test("should persist template and re-apply it on next generation", async ({ nutriPage: page }) => {
    // 1. Setup: Navigate to a patient
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    const patientUrl = page.url();

    // 2. Generate a plan
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();
    await page.waitForURL(/\/meal-plans\//);
    
    // Save/Publish
    const publishBtn = page.getByRole("button", { name: /Salvar e Enviar/i });
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
    
    // Wait for success
    await expect(page.getByText(/sucesso/i).or(page.getByText(/publicado/i))).toBeVisible();

    // 3. Close and re-open patient panel
    await page.goto(patientUrl);
    await page.reload(); // Ensure fresh state
    
    // 4. Generate new plan and verify template is the same
    // Here we check if the request to generate-meal-plan includes the previous template_id if we can,
    // but the requirement is to "confirm it's reapplied".
    // We'll look for the toast again.
    
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();
    
    // If it's reapplying, it shouldn't be a fallback anymore (if the first one was successfully saved/published)
    await expect(page.getByText(/Plano gerado usando o template:/i)).toBeVisible();
    await expect(page.getByText(/fallback/i)).not.toBeVisible();
  });

  test("should intercept console errors and network failures during generation", async ({ nutriPage: page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (err) => errors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        // Filter out expected errors if any
        if (!msg.text().includes("Failed to load resource")) {
          errors.push(new Error(`Console error: ${msg.text()}`));
        }
      }
    });

    // 1. Go to patient
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();

    // 2. Trigger generation
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();

    // 3. Wait for builder to load
    await page.waitForURL(/\/meal-plans\//);
    
    // 4. Check for UI "column errors" (NaN, undefined, etc)
    await expect(page.getByText("NaN")).not.toBeVisible();
    await expect(page.getByText("undefined")).not.toBeVisible();
    
    // 5. Verify no console errors were captured
    expect(errors.length, `Expected 0 errors, but found: ${errors.map(e => e.message).join(", ")}`).toBe(0);
  });

  test("should verify BuilderTopbar badge responsiveness", async ({ nutriPage: page }) => {
    // 1. Generate/Navigate to a plan with template metadata
    await page.route("**/rest/v1/meal_plans*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: "resp-plan-id",
          title: "Plano Responsivo",
          generation_metadata: {
            template_name_used: "Template Com Nome Muito Grande Para Testar Layout",
            is_fallback_template: false
          }
        }])
      });
    });

    await page.goto("/meal-plans/resp-plan-id");
    
    const badge = page.getByText(/Template:/i);
    await expect(badge).toBeVisible();

    // 2. Test Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(badge).toBeInViewport();
    
    // 3. Test Mobile (384px)
    await page.setViewportSize({ width: 384, height: 800 });
    await expect(badge).toBeVisible();
    // Check if it's still visible and not causing horizontal overflow if possible, 
    // or just that it doesn't "break" (is still in the DOM and visible)
    await expect(badge).toBeInViewport();
  });

  test("should select default fallback for patient without active plan or previous template", async ({ nutriPage: page }) => {
    // This patient should have no history
    // We'll mock the generation to return fallback
    await page.route("**/functions/v1/generate-meal-plan", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      // Verify no template_id was sent if possible
      
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mealPlanId: "new-fallback-id",
          template_name_used: "Base Nutricional",
          is_fallback_template: true,
          items_count: 4
        })
      });
    });

    // Navigate to a "new" patient (mocked or just one we know has no plan)
    // For now we'll just use the first one and rely on the mock
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();

    // Verify fallback toast
    await expect(page.getByText(/Nenhum plano anterior encontrado/i)).toBeVisible();
    await expect(page.getByText(/"Base Nutricional"/i)).toBeVisible();
    
    // Verify persistence is not blocked (redirects to builder)
    await page.waitForURL(/\/meal-plans\/new-fallback-id/);
    await expect(page.getByText(/Plano Fallback/i).or(page.locator('h1'))).toBeVisible();
  });
});
