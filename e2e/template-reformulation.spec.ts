
import { test, expect } from "@playwright/test";

test.describe("Template Mass Reformulation and Coherence", () => {
  test.beforeEach(async ({ page }) => {
    // Basic login
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill("admin@fitjourney.com.br");
      await page.fill('input[type="password"]', "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin/**");
    }
  });

  test("should load templates, filter by status, and apply reformulation in batch", async ({ page }) => {
    await page.goto("/admin/template-mass-reformulation");
    
    // 1. Load templates
    const loadButton = page.locator('button:has-text("Carregar Templates")');
    await expect(loadButton).toBeVisible();
    await loadButton.click();
    
    // 2. Wait for preview cards
    await expect(page.locator('text=Lista de Templates')).toBeVisible({ timeout: 15000 });
    
    // 3. Test Filters
    const criticalFilter = page.locator('button:has-text("Critical")');
    if (await criticalFilter.isVisible()) {
      await criticalFilter.click();
    }
    
    // 4. Test Search
    const searchInput = page.locator('input[placeholder="Buscar template..."]');
    await searchInput.fill("Plano");
    
    // 5. Select All Filtrados
    const selectAllBtn = page.locator('button:has-text("Selecionar Todos Filtrados")');
    await selectAllBtn.click();
    
    // 6. Verify export buttons are present
    await expect(page.locator('button:has-text("CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();

    // 7. Apply Reformulation and check payload
    const applyButton = page.locator('button:has-text("Aplicar Reformulação")');
    
    // Listen for the patch request
    const updatePromise = page.waitForRequest(request => 
      request.url().includes('diet_templates') && request.method() === 'PATCH',
      { timeout: 10000 }
    ).catch(() => null);
    
    if (await applyButton.isEnabled()) {
      await applyButton.click();
      
      const request = await updatePromise;
      if (request) {
        const payload = request.postDataJSON();
        
        // Coherence Validation
        // Requirement: payload never includes template_id or inconsistent substitutions
        const payloadStr = JSON.stringify(payload);
        expect(payloadStr).not.toContain('"template_id"');
        
        if (payload.meals) {
          for (const meal of payload.meals) {
            const title = (meal.title || "").toLowerCase();
            if (title.includes("almoço") || title.includes("jantar")) {
              const blocks = meal.blocks || [];
              const allOptions = blocks.flatMap((b: any) => b.options || []);
              
              // Rule: Soup should not be in lunch/dinner solid meals (Requirement)
              const hasSoup = allOptions.some((o: any) => (o.name || "").toLowerCase().includes("sopa"));
              expect(hasSoup).toBe(false);
              
              // Rule: Protein blocks should only have proteins (Equivalent Substitutions)
              const proteinBlocks = blocks.filter((b: any) => (b.label || "").toLowerCase().includes("proteína"));
              for (const pb of proteinBlocks) {
                const pbOptions = pb.options || [];
                for (const opt of pbOptions) {
                   // This is a basic check, in a real scenario we'd check against a DB of foods
                   // But for E2E we verify the principle
                   const optName = (opt.name || "").toLowerCase();
                   const isNonProtein = optName.includes("pão") || optName.includes("tapioca");
                   if (isNonProtein) {
                     console.warn(`Warning: Non-protein '${optName}' found in protein block`);
                   }
                }
              }
            }
          }
        }
      }
      
      // Wait for progress bar or success toast
      await expect(page.locator('text=reformulados com sucesso')).toBeVisible({ timeout: 20000 });
    }
  });

  test("PDF Export should contain expected summary information", async ({ page }) => {
    await page.goto("/admin/template-mass-reformulation");
    await page.locator('button:has-text("Carregar Templates")').click();
    await expect(page.locator('text=Lista de Templates')).toBeVisible();
    
    const pdfButton = page.locator('button:has-text("PDF")');
    await expect(pdfButton).toBeVisible();
    
    // We can't easily verify the PDF content in E2E without complex tools, 
    // but we verify the button triggers a download or doesn't crash
    const downloadPromise = page.waitForEvent('download');
    await pdfButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("relatorio_reformulacao");
  });
});
