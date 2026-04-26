
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

  test("should show preview of reformulation and apply changes", async ({ page }) => {
    await page.goto("/admin/template-mass-reformulation");
    
    // 1. Load templates
    const loadButton = page.locator('button:has-text("Carregar Templates")');
    await expect(loadButton).toBeVisible();
    await loadButton.click();
    
    // 2. Wait for preview
    await expect(page.locator('text=Prévia de Alterações')).toBeVisible({ timeout: 15000 });
    
    // 3. Check for coherence warnings
    // We expect at least some templates to have "convertido para V2" or soup removed
    const changesCount = await page.locator('div.text-amber-600').count();
    console.log(`Found ${changesCount} suggested changes in preview.`);

    // 4. Export checklist
    const exportButton = page.locator('button:has-text("Exportar Checklist")');
    await expect(exportButton).toBeVisible();
    
    // 5. Apply (Check payload consistency)
    // We listen for the update request
    const updatePromise = page.waitForRequest(request => 
      request.url().includes('diet_templates') && request.method() === 'PATCH'
    );
    
    const applyButton = page.locator('button:has-text("Aplicar Reformulação")');
    await applyButton.click();
    
    const request = await updatePromise;
    const payload = request.postDataJSON();
    
    // Coherence Validation: payload never includes template_id or inconsistent substitutions
    expect(payload).not.toHaveProperty('template_id');
    
    if (payload.meals) {
      for (const meal of payload.meals) {
        // Rule: Soup should not be a substitution for Lunch/Dinner
        const title = (meal.title || "").toLowerCase();
        if (title.includes("almoço") || title.includes("jantar")) {
          const blocks = meal.blocks || [];
          const allOptions = blocks.flatMap((b: any) => b.options || []);
          const hasSoup = allOptions.some((o: any) => (o.name || "").toLowerCase().includes("sopa"));
          expect(hasSoup).toBe(false);
        }
      }
    }

    await expect(page.locator('text=reformulados com sucesso')).toBeVisible();
  });

  test("audit should detect soup as substitution and legacy structures", async ({ page }) => {
    await page.goto("/admin/template-nutrition-audit");
    
    // Ensure critical tab is active
    await page.click('button:has-text("Crítico")');
    
    // Check if new rules are listed in settings
    await page.click('button:has-text("Regras")');
    await expect(page.locator('text=Sopa como Substituição')).toBeVisible();
    await expect(page.locator('text=Agrupamento V2 Coerente')).toBeVisible();
  });
});
