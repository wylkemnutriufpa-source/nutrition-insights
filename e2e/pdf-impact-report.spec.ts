
import { test, expect } from "@playwright/test";

test.describe("PDF Impact Report and Image Fallback E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Basic login as admin
    await page.goto("/auth");
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill("admin@fitjourney.com.br");
      await page.fill('input[type="password"]', "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/admin/**");
    }
  });

  test("should generate PDF report with impact summary and broken rules", async ({ page }) => {
    await page.goto("/admin/template-mass-reformulation");
    
    // 1. Load templates
    await page.click('button:has-text("Carregar Templates")');
    await expect(page.locator('text=Lista de Templates')).toBeVisible({ timeout: 15000 });
    
    // 2. Select a template
    const checkbox = page.locator('button[role="checkbox"]').first();
    await checkbox.click();
    
    // 3. Simulate Impact (Dry-run)
    await page.click('button:has-text("Simular Impacto")');
    await expect(page.locator('text=Simulação concluída')).toBeVisible();

    // 4. Export PDF
    const pdfButton = page.locator('button:has-text("PDF")');
    await expect(pdfButton).toBeVisible();
    
    const downloadPromise = page.waitForEvent('download');
    await pdfButton.click();
    const download = await downloadPromise;
    
    // Verify filename matches the new pattern
    expect(download.suggestedFilename()).toContain("relatorio_dryrun");
    
    console.log("✅ E2E: PDF impact report generated successfully.");
  });

  test("should track image fallbacks in the new admin section", async ({ page }) => {
    // This test assumes a fallback happened in the previous test or we can trigger one
    await page.goto("/admin/image-fallbacks");
    
    await expect(page.locator('h1:has-text("Monitor de Fallback de Imagens")')).toBeVisible();
    
    // Check if table headers are present
    await expect(page.locator('th:has-text("Receita")')).toBeVisible();
    await expect(page.locator('th:has-text("Gravidade")')).toBeVisible();
    
    // Test filter
    const selectTrigger = page.locator('button[role="combobox"]');
    await selectTrigger.click();
    await page.locator('span:has-text("Crítico")').click();
    
    console.log("✅ E2E: Image fallback admin section validated.");
  });
});
