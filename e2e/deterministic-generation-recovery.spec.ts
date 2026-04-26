import { test, expect } from "./fixtures";

test.describe("Plan Generation Recovery & Deterministic Flow", () => {
  test.setTimeout(90000);

  test("should handle deterministic generation and recover from network failure with retry", async ({ nutriPage }) => {
    const page = nutriPage;

    // Navigate to a patient
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    
    const patientCard = page.locator('[data-testid="patient-card"], .patient-row').first();
    await patientCard.click();
    await expect(page.url()).toContain("/patient");

    // Click on "Gerar Plano" to open the generator
    const openGeneratorBtn = page.getByRole("button", { name: /gerar.*plano/i }).first();
    await openGeneratorBtn.click();

    // Select "Plano Clínico" (Deterministic/Clinical motor)
    const clinicalModeBtn = page.getByText(/Plano Clínico/i).first();
    await clinicalModeBtn.click();

    // Intercept the edge function call to simulate failure and then success
    let callCount = 0;
    await page.route("**/functions/v1/generate-meal-plan", async (route) => {
      callCount++;
      if (callCount === 1) {
        // Simulate a network failure on first attempt
        await route.abort("failed");
      } else {
        // Succeed on subsequent attempts
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            mealPlanId: "fake-plan-id",
            items_count: 5,
            explainability: {
              strategy: "clinical_deterministic",
              score: 95
            }
          })
        });
      }
    });

    // Start generation
    const generateBtn = page.getByRole("button", { name: /Gerar Plano/i }).last();
    await generateBtn.click();

    // Verify retry logic (should automatically retry)
    // We expect at least 2 calls to the edge function
    await expect.poll(() => callCount).toBeGreaterThan(1);

    // Verify success toast/message after recovery
    await expect(page.locator("text=/Plano gerado com 5 refeições/i")).toBeVisible({ timeout: 20000 });

    // Verify the editor is NOT frozen (we can still interact with other elements)
    const closeBtn = page.getByRole("button", { name: /Cancelar/i }).first();
    if (await closeBtn.isVisible()) {
        await expect(closeBtn).toBeEnabled();
    }
  });

  test("should allow comparing generation attempts in Plan Audit", async ({ nutriPage }) => {
    const page = nutriPage;
    
    // Navigate to Plan Audit
    await page.goto("/plan-audit");
    await page.waitForLoadState("networkidle");

    // Switch to diagnostics tab
    await page.getByText(/Diagnóstico/i).click();
    
    // Select a patient to view logs (assuming some exist or we mock them)
    // For the sake of the test, let's assume we are viewing a patient's logs
    // We can mock the RPC call that loads logs
    await page.route("**/rest/v1/audit_logs*", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
                {
                    id: "log1",
                    action: "generate_meal_plan",
                    created_at: "2026-01-01T10:00:00Z",
                    type: "log",
                    metadata: { items: 3, strategy: "ai" }
                },
                {
                    id: "log2",
                    action: "generate_meal_plan",
                    created_at: "2026-01-01T10:05:00Z",
                    type: "log",
                    metadata: { items: 5, strategy: "deterministic" }
                }
            ])
        });
    });

    // Mock patient select if needed or just wait for table
    const firstRow = page.locator("table tbody tr").first();
    // In our simplified mock, we need to make sure the diagnostic view shows these logs
    // This part depends on how the user interacts with the page to load diagnostics
    
    // Let's assume logs are visible. We should see checkboxes now.
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);

    // Select two logs
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Click "Comparar Selecionados"
    const compareBtn = page.getByRole("button", { name: /Comparar Selecionados/i });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();

    // Verify Diff Dialog is open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("text=/Campos Alterados/i")).toBeVisible();
    await expect(page.locator("text=/items/i")).toBeVisible();
    await expect(page.locator("text=/strategy/i")).toBeVisible();
  });
});
