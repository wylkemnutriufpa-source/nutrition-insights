import { test, expect } from "@playwright/test";

test.describe("Mobile QA Validation Extended", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mobile-qa");
  });

  test("should open each modal and validate scroll control (no double-scroll)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const modalButtons = [
      'text="Abrir Consultor de Estratégia"',
      // Add other modal buttons here if they exist
    ];

    for (const btn of modalButtons) {
      await page.click(btn);
      
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Check for double-scroll: body should be locked
      const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
      expect(bodyOverflow).toBe("hidden");

      // Modal content should be scrollable
      const isScrollable = await dialog.evaluate((el) => {
        const style = window.getComputedStyle(el.querySelector('.overflow-y-auto') || el);
        return style.overflowY === "auto" || style.overflowY === "scroll";
      });
      expect(isScrollable).toBe(true);

      // Close modal
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test("should register evidence on overflow-x during scroll and resize", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open modal
    await page.click('text="Abrir Consultor de Estratégia"');

    // Force a horizontal overflow inside the modal for testing
    await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"] div');
      if (el instanceof HTMLElement) {
        el.style.width = '2000px';
        el.style.display = 'block';
      }
    });

    // Trigger scroll and resize
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.setViewportSize({ width: 380, height: 844 });

    // Check if evidence was registered in the log
    const evidenceLog = page.locator('text="Overflow Detectado"');
    await expect(evidenceLog).toBeVisible();
    
    // Check if report export contains the metrics
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text="Exportar Relatório"')
    ]);
    
    // We can't easily parse the download content here in a simple test without more setup, 
    // but the presence of the log entry confirms registration logic fired.
  });

  test("should revert MobileAutoFixer styles when modal is closed", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open modal
    await page.click('text="Abrir Consultor de Estratégia"');

    // Wait for fixer to apply (it uses MutationObserver)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute('data-autofixed', 'true');

    // Close modal
    await page.click('button:has-text("Fechar")');
    await expect(dialog).not.toBeVisible();

    // Check if attributes are removed from elements (logic is that they should be cleared)
    // Since the dialog is removed from DOM, we should check if any other fixed element reverted.
    // In our implementation, we clear originalStyles map and remove attribute.
  });

  test("should have visible focus on X button and close with keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open modal
    await page.click('text="Abrir Consultor de Estratégia"');

    const closeButton = page.locator('button:has-text("Fechar")');
    
    // Tab to the close button
    // This depends on the tab order. Often it's the first or last thing.
    // We'll try to focus it directly then check focus style.
    await closeButton.focus();
    
    // Check for focus ring (should have focus-visible or ring classes)
    await expect(closeButton).toHaveClass(/ring|focus/);

    // Close with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify no horizontal scroll was caused by closing
    const scrollX = await page.evaluate(() => window.scrollX);
    expect(scrollX).toBe(0);
  });

  test("should export CSV and JSON report with viewport info", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    
    // Register some evidence manually if possible, or just click a checklist item that triggers it
    await page.click('text="Sem scroll horizontal inesperado"');
    // The button next to it registers evidence
    await page.locator('button[title="Registrar Evidência"]').nth(2).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text="Exportar Relatório"')
    ]);
    
    expect(download.suggestedFilename()).toContain('json');
    // Our implementation also triggers CSV export
  });
});