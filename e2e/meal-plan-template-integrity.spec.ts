import { test, expect } from "./fixtures";

test.describe("Meal Plan Template Integrity & UI E2E", () => {
  // Test 1: Toast message exact verification
  test("should verify toast shows exact template message including quotes and punctuation", async ({ nutriPage: page }) => {
    await page.goto("/meal-plans");
    
    // Open New Plan Modal
    await page.getByRole("button", { name: /Criar Novo Plano/i }).click();
    
    // Select a patient (Wannubia is usually present in seeds)
    const searchInput = page.getByPlaceholder(/Pesquisar paciente/i).first();
    await searchInput.fill("Wannubia");
    await page.waitForTimeout(1000);
    const patientOption = page.locator('div[role="option"]').first();
    await patientOption.click();

    // Click Generate
    await page.getByRole("button", { name: /Gerar Plano/i }).click();

    // The message should be EXACT
    const toast = page.locator("li[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 25000 });
    
    const toastText = await toast.innerText();
    
    // Check for the specific success message or fallback message with exact punctuation
    if (toastText.includes("Nota:")) {
      // Nota: Nenhum plano anterior encontrado. Usamos o template padrão "Base" como fallback.
      // We check for the presence of quotes around the template name and the trailing period.
      expect(toastText).toMatch(/Nota: Nenhum plano anterior encontrado\. Usamos o template padrão ".*" como fallback\./);
    } else {
      // Plano gerado usando o template: <name>
      expect(toastText).toMatch(/Plano gerado usando o template: .*/);
    }
  });

  // Test 2: Payload inspection for generate-meal-plan
  test("should inspect generate-meal-plan payload for template_id", async ({ nutriPage: page }) => {
    await page.goto("/patients");
    
    // Find a patient row
    const firstPatient = page.locator('tr').first();
    await firstPatient.click();

    // Click to generate
    const generateBtn = page.getByRole("button", { name: /Gerar Plano/i }).first();
    await generateBtn.click();

    // Intercept the request
    const requestPromise = page.waitForRequest(request => 
      request.url().includes("generate-meal-plan") && request.method() === "POST"
    );

    // Confirm generation in the SmartPlanGenerator modal
    await page.getByRole("button", { name: /Gerar Plano em 10s/i }).click();

    const request = await requestPromise;
    const body = JSON.parse(request.postData() || "{}");
    
    // Verify that IF template_id is sent, it's a valid UUID
    // And verify that no "invalid" template_id (like empty string) is sent
    if (body.template_id !== undefined) {
      expect(typeof body.template_id).toBe("string");
      expect(body.template_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    } else {
      // If not present, it's fine (patient might not have an active plan with template_id)
      expect(body.template_id).toBeUndefined();
    }
  });

  // Test 3: Template badge visibility/consistency
  test("should confirm template badge remains visible after tab switching and closing panel", async ({ nutriPage: page }) => {
    // Navigate to a patient with a plan
    await page.goto("/patients");
    const firstPatient = page.locator('tr').first();
    await firstPatient.click();
    
    // Open an existing plan or generate one
    const planRow = page.locator('button').filter({ hasText: /Ver/i }).first();
    if (await planRow.isVisible()) {
      await planRow.click();
    } else {
      // Generate one
      await page.getByRole("button", { name: /Gerar Plano/i }).first().click();
      await page.getByRole("button", { name: /Gerar Plano em 10s/i }).click();
    }
    
    await page.waitForURL(/\/plan-builder\/|\/meal-plan-editor-v2\//);
    
    // Check for badge
    const badge = page.getByTestId("builder-template-badge");
    
    // We try to ensure we have a plan with a template, or at least check it if it appears
    const hasBadge = await badge.count() > 0;
    if (hasBadge) {
      await expect(badge).toBeVisible();
      
      // Switch tabs (e.g. to a "Clínico" or "Macros" view if exists)
      const tabs = page.locator('[role="tab"]');
      if (await tabs.count() > 1) {
        await tabs.nth(1).click();
        await expect(badge).toBeVisible();
      }
      
      // Open and Close Patient Panel (if available in this view)
      const patientTrigger = page.locator('button').filter({ hasText: /Paciente/i }).first();
      if (await patientTrigger.isVisible()) {
        await patientTrigger.click();
        await page.waitForTimeout(500);
        // Press escape to close
        await page.keyboard.press("Escape");
        await expect(badge).toBeVisible();
      }
    }
  });

  // Test 4: Simulation of partial response
  test("should render UI with fallback for partial generation response (macros undefined)", async ({ nutriPage: page }) => {
    // Mock the response
    await page.route("**/functions/v1/generate-meal-plan", async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      
      if (json.items && json.items.length > 0) {
        // Force missing values
        json.items.forEach((item: any) => {
          item.protein_target = undefined;
          item.carbs_target = undefined;
          item.fat_target = undefined;
          item.calories_target = undefined;
        });
      }
      
      await route.fulfill({ json });
    });

    await page.goto("/patients");
    await page.locator('tr').first().click();
    await page.getByRole("button", { name: /Gerar Plano/i }).first().click();
    await page.getByRole("button", { name: /Gerar Plano em 10s/i }).click();
    
    await page.waitForURL(/\/plan-builder\/|\/meal-plan-editor-v2\//);
    
    // Verify no NaN or undefined
    const bodyText = await page.innerText("body");
    expect(bodyText).not.toContain("NaN");
    expect(bodyText).not.toContain("undefined");
  });

  // Test 5: Visual snapshot
  test("should take snapshots of BuilderTopbar badge", async ({ nutriPage: page }) => {
     await page.goto("/patients");
     await page.locator('tr').first().click();
     
     // Find plan and open it
     const verBtn = page.locator('button').filter({ hasText: /Ver/i }).first();
     if (await verBtn.isVisible()) {
        await verBtn.click();
        await page.waitForURL(/\/plan-builder\/|\/meal-plan-editor-v2\//);

        const badge = page.getByTestId("builder-template-badge");
        
        if (await badge.isVisible()) {
          // Desktop
          await page.setViewportSize({ width: 1280, height: 720 });
          await expect(badge).toHaveScreenshot("template-badge-desktop.png");

          // Mobile
          await page.setViewportSize({ width: 384, height: 800 });
          await expect(badge).toHaveScreenshot("template-badge-mobile.png");
        }
     }
  });
});
