import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Mobile QA Automated Steps", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mobile-qa");
  });

  test("should automatically discover and iterate all modal triggers", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    // 1. Discover all triggers
    const triggers = page.locator('[data-testid^="trigger-"]');
    const count = await triggers.count();
    expect(count).toBeGreaterThan(0);
    
    const triggerIds = [];
    for (let i = 0; i < count; i++) {
      const id = await triggers.nth(i).getAttribute('data-testid');
      triggerIds.push(id);
    }
    
    // Sort to ensure deterministic order
    triggerIds.sort();

    for (const triggerId of triggerIds) {
      const trigger = page.locator(`[data-testid="${triggerId}"]`);
      
      // Scroll into view check
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger).toBeInViewport();
      
      // Open modal
      await trigger.click();
      const modalId = triggerId.replace('trigger-', 'modal-');
      const modal = page.locator(`[data-testid="${modalId}"]`);
      await expect(modal).toBeVisible();
      
      // Close modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test("should assert focus restoration to original trigger after Esc-close", async ({ page }) => {
    const trigger = page.locator('[data-testid^="trigger-"]').first();
    const triggerId = await trigger.getAttribute('data-testid');
    
    await trigger.click();
    const modalId = triggerId!.replace('trigger-', 'modal-');
    await expect(page.locator(`[data-testid="${modalId}"]`)).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Assertion: focus restoration must happen within 500ms
    // We use a custom poll to verify the activeElement
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const active = document.activeElement;
        return active ? active.getAttribute('data-testid') : null;
      });
    }, {
      message: `Focus did not return to trigger ${triggerId} within 500ms`,
      timeout: 500
    }).toBe(triggerId);
    
    // Take screenshot on failure is handled by Playwright config usually, 
    // but we can force one if we want specific evidence here.
    if (test.info().status === 'failed') {
      await page.screenshot({ path: `test-results/focus-restoration-fail-${Date.now()}.png` });
    }
  });

  test("should trap focus and cycle inside role=dialog", async ({ page }) => {
    await page.locator('[data-testid^="trigger-"]').first().click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Get all focusable elements in the dialog
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    // We'll press Tab repeatedly and track activeElement
    const initialActive = await page.evaluate(() => document.activeElement?.outerHTML);
    
    // Cycle at least twice
    // We don't know exactly how many elements, but we can detect when we return to start
    let startElementId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.innerText);
    let cycles = 0;
    let iterations = 0;
    const maxIterations = 50; // Safety break

    while (cycles < 2 && iterations < maxIterations) {
      await page.keyboard.press('Tab');
      iterations++;
      
      const currentInDialog = await page.evaluate((sel) => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement);
      }, focusableSelector);
      
      expect(currentInDialog, "Focus left the dialog!").toBe(true);
      
      const currentId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.innerText);
      if (currentId === startElementId) {
        cycles++;
      }
    }
    
    expect(cycles).toBeGreaterThanOrEqual(2);
  });

  test("should verify overflow persistence detection with different frame thresholds", async ({ page }) => {
    // Helper to trigger overflow
    const triggerOverflow = async () => {
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.id = 'overflow-trigger';
        div.style.width = '2000px';
        div.style.height = '10px';
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        document.body.appendChild(div);
        window.dispatchEvent(new Event('scroll'));
      });
    };

    const removeOverflow = async () => {
      await page.evaluate(() => {
        document.getElementById('overflow-trigger')?.remove();
        window.scrollTo(0, 0);
      });
    };

    const slider = page.locator('[data-testid="overflow-threshold-slider"]');

    // Test Case 1: Low threshold (5 frames)
    await slider.fill('5');
    await triggerOverflow();
    
    // Wait for approx 5-10 frames (Playwright is fast, so we might need a small wait)
    await expect(page.locator('text="Overflow Detectado Automático"')).toBeVisible({ timeout: 2000 });
    await removeOverflow();
    await page.reload(); // Clear state

    // Test Case 2: High threshold (60 frames)
    await page.locator('[data-testid="overflow-threshold-slider"]').fill('60');
    await triggerOverflow();
    
    // Should NOT be visible immediately
    await page.waitForTimeout(200); 
    await expect(page.locator('text="Overflow Detectado Automático"')).not.toBeVisible();
    
    // Wait longer
    await expect(page.locator('text="Overflow Detectado Automático"')).toBeVisible({ timeout: 5000 });
  });

  test("should validate exported JSON/CSV schema and data consistency", async ({ page }) => {
    // 1. Generate some evidence
    await page.click('text="Sem conteúdo cortado"');
    await page.locator('button:has(.lucide-camera)').first().click();
    
    // 2. Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text="Exportar Relatório"')
    ]);
    
    const filePath = await download.path();
    const fileName = download.suggestedFilename();
    
    if (fileName.endsWith('.json')) {
      const content = JSON.parse(fs.readFileSync(filePath!, 'utf8'));
      
      // Schema validation
      expect(content).toHaveProperty('evidences');
      expect(Array.isArray(content.evidences)).toBe(true);
      
      if (content.evidences.length > 0) {
        const ev = content.evidences[0];
        expect(ev).toHaveProperty('modalId');
        expect(ev).toHaveProperty('viewport');
        expect(ev).toHaveProperty('sequence');
        expect(typeof ev.sequence).toBe('number');
      }
    } else if (fileName.endsWith('.csv')) {
      const content = fs.readFileSync(filePath!, 'utf8');
      const lines = content.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      const headers = lines[0].split(',');
      expect(headers).toContain('ModalID');
      expect(headers).toContain('Viewport');
    }
  });
});