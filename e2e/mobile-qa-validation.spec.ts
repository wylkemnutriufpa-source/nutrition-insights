import { test, expect } from "@playwright/test";

test.describe("Mobile QA Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Mobile QA page
    await page.goto("/mobile-qa");
    // Ensure we are logged in or have access if needed. 
    // Assuming professional route is handled by fixtures if it's protected, 
    // but here we just try to navigate.
  });

  test("should open modal and close with X (48x48 hit area)", async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 390, height: 844 });

    // Open Consultor de Estratégia modal
    await page.click('text="Abrir Consultor de Estratégia"');

    // Check if dialog is visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Find the close button
    const closeButton = dialog.locator('button:has-text("Fechar")');
    await expect(closeButton).toBeVisible();

    // Verify 48x48 size
    const box = await closeButton.boundingBox();
    expect(box?.width).toBeCloseTo(48, 1);
    expect(box?.height).toBeCloseTo(48, 1);

    // Click to close
    await closeButton.click();

    // Validate closure
    await expect(dialog).not.toBeVisible();
  });

  test("should detect horizontal overflow during navigation", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    // Helper to check for horizontal overflow
    const checkOverflow = async () => {
      return await page.evaluate(() => {
        const scrollX = window.scrollX;
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          hasOverflow: scrollX > 0 || scrollWidth > clientWidth,
          scrollX,
          scrollWidth,
          clientWidth
        };
      });
    };

    // Initial check
    let overflow = await checkOverflow();
    expect(overflow.hasOverflow, `Horizontal overflow detected: ${JSON.stringify(overflow)}`).toBe(false);

    // Open modal and check again
    await page.click('text="Abrir Consultor de Estratégia"');
    overflow = await checkOverflow();
    expect(overflow.hasOverflow, `Horizontal overflow detected after opening modal: ${JSON.stringify(overflow)}`).toBe(false);
  });

  test("should prevent double scroll (only one vertical scroll active)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open modal
    await page.click('text="Abrir Consultor de Estratégia"');

    // When modal is open, body should have overflow: hidden
    const bodyOverflow = await page.evaluate(() => window.getComputedStyle(document.body).overflow);
    expect(bodyOverflow).toBe("hidden");

    // Modal content should be scrollable
    const dialogContent = page.locator('[role="dialog"]');
    const isScrollable = await dialogContent.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.overflowY === "auto" || style.overflowY === "scroll";
    });
    expect(isScrollable).toBe(true);
  });

  test("should not overlap header when scrolling in modal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open modal
    await page.click('text="Abrir Consultor de Estratégia"');

    // Scroll down inside modal
    const dialog = page.locator('[role="dialog"]');
    await dialog.evaluate((el) => el.scrollTop = 500);

    // Check if the close button (part of the header/ui) is still in a valid position or visible
    const closeButton = dialog.locator('button:has-text("Fechar")');
    await expect(closeButton).toBeVisible();
    
    // Check if it hasn't moved unexpectedly (it's absolute top-2 right-2)
    const box = await closeButton.boundingBox();
    expect(box?.y).toBeLessThan(100); // Should stay at the top of the dialog
  });
});
