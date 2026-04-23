import { test, expect } from '@playwright/test';

test.describe('Investigation: Route Accessibility & 404 Detection', () => {
  const routes = [
    '/',
    '/auth',
    '/landing-paciente',
    '/landing-personal',
    '/landing-afiliado',
    '/pricing',
    '/politica-de-privacidade',
    '/termos-de-uso',
    '/exclusao-de-conta'
  ];

  for (const route of routes) {
    test(`Route "${route}" should not show 404 page`, async ({ page }) => {
      console.log(`Checking route: ${route}`);
      const response = await page.goto(route);
      
      // Wait for either the main content or the 404 page
      await page.waitForLoadState('networkidle');
      
      const notFoundHeading = page.getByRole('heading', { name: /Página não encontrada/i });
      const isVisible = await notFoundHeading.isVisible();
      
      if (isVisible) {
        const currentPath = await page.evaluate(() => window.location.pathname);
        console.error(`[INVESTIGATION] 404 detected on route: ${route} (Current Path: ${currentPath})`);
        
        // Take a screenshot for evidence if it fails
        await page.screenshot({ path: `e2e/failures/404-${route.replace(/\//g, '_')}.png` });
      }
      
      expect(isVisible, `Route ${route} should not show 404 page`).toBe(false);
    });
  }
});
