import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Mobile QA Extra Assertions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mobile-qa");
  });

  const testScreens = [
    { id: "strategy", label: "Consultor de Estratégia" },
    { id: "settings", label: "Configurações Profissionais" },
    { id: "profile", label: "Perfil do Usuário" },
    { id: "wizard", label: "InOffice Wizard" },
  ];

  test("should return focus to trigger after closing with Esc", async ({ page }) => {
    for (const screen of testScreens) {
      const trigger = page.getByTestId(`trigger-${screen.id}`);
      await trigger.click();
      
      const modal = page.getByTestId(`modal-${screen.id}`);
      await expect(modal).toBeVisible();
      
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
      
      // Check if focus returned to the trigger
      const isActive = await trigger.evaluate((el) => document.activeElement === el);
      expect(isActive).toBe(true);
    }
  });

  test("should maintain scroll stability after Esc-close", async ({ page }) => {
    for (const screen of testScreens) {
      const trigger = page.getByTestId(`trigger-${screen.id}`);
      await trigger.click();
      
      await page.keyboard.press("Escape");
      await expect(page.getByTestId(`modal-${screen.id}`)).not.toBeVisible();
      
      // Wait for stability window
      await page.waitForTimeout(300);
      
      const metrics = await page.evaluate(() => ({
        scrollX: window.scrollX,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      
      expect(metrics.scrollX).toBe(0);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    }
  });

  test("should keep focus trap within sequentially opened modals", async ({ page }) => {
    // Test with two different modals
    const screensToTest = testScreens.slice(0, 2);
    
    for (const screen of screensToTest) {
      const trigger = page.getByTestId(`trigger-${screen.id}`);
      await trigger.click();
      
      const modal = page.getByTestId(`modal-${screen.id}`);
      await expect(modal).toBeVisible();
      
      // Get all focusable elements inside the modal
      const focusableElements = await modal.evaluate((el) => {
        const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(el.querySelectorAll(selector)).length;
      });
      
      // Tab through all of them + some extra to check wrap-around
      for (let i = 0; i < focusableElements + 2; i++) {
        await page.keyboard.press("Tab");
        const isInside = await modal.evaluate((el) => el.contains(document.activeElement));
        expect(isInside).toBe(true);
      }
      
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    }
  });

  test("should verify exported report data integrity", async ({ page }) => {
    // 1. Open a modal and register evidence
    const screen = testScreens[0];
    await page.getByTestId(`trigger-${screen.id}`).click();
    
    // Register evidence manually using one of the checklist items camera button
    // The first camera button in the checklist
    await page.locator('button:has(svg.lucide-camera)').first().click();
    
    // Wait for toast to ensure registration is done
    await expect(page.getByText("Evidência registrada!")).toBeVisible();
    
    // 2. Export report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText("Exportar Relatório").click(),
    ]);
    
    const downloadPath = path.join("/tmp", download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // 3. Parse and verify JSON if it's the JSON file
    // Note: The app triggers 3 downloads (PDF, JSON, CSV). 
    // Playwright's waitForEvent('download') usually catches the first one.
    // Based on the code, it's JSON first.
    
    if (download.suggestedFilename().endsWith('.json')) {
      const fileContent = fs.readFileSync(downloadPath, 'utf8');
      const report = JSON.parse(fileContent);
      
      expect(report.evidences.length).toBeGreaterThan(0);
      
      const evidence = report.evidences[report.evidences.length - 1];
      expect(evidence.modalId).toBe(screen.id);
      expect(evidence.viewport).toBeDefined();
      expect(evidence.sequence).toBe(1);
      
      // Check for unique keys
      const keys = report.evidences.map((e: any) => e.id);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    }
  });

  test("should capture overflow only after configured buffer window", async ({ page }) => {
    // 1. Set a 500ms buffer
    const bufferSlider = page.locator('#buffer-range');
    await bufferSlider.fill("500");
    
    // 2. Simulate a transient overflow (200ms)
    await page.evaluate(() => {
      document.documentElement.style.width = '2000px';
      window.dispatchEvent(new Event('scroll'));
      setTimeout(() => {
        document.documentElement.style.width = '';
      }, 200);
    });
    
    // Wait 1 second and check if any evidence was registered
    await page.waitForTimeout(1000);
    const toast = page.getByText("Overflow Horizontal Persistente!");
    await expect(toast).not.toBeVisible();
    
    // 3. Simulate a persistent overflow (800ms)
    await page.evaluate(() => {
      document.documentElement.style.width = '2000px';
      window.dispatchEvent(new Event('scroll'));
    });
    
    // Wait for buffer + safety margin
    await expect(toast).toBeVisible({ timeout: 2000 });
    
    // Cleanup
    await page.evaluate(() => {
      document.documentElement.style.width = '';
    });
  });
});
