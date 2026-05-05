import { test, expect } from '@playwright/test';

test.describe('Loader Resilience', () => {
  test('should show loader on welcome and navigate to auth if unauthenticated', async ({ page }) => {
    // Start at welcome page
    await page.goto('/welcome');

    // 1. Loader should be visible initially
    const loader = page.getByRole('progressbar');
    await expect(loader).toBeVisible();

    // 2. It should have appropriate aria-label (from messages)
    const ariaLabel = await loader.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // 3. Loader should disappear within a reasonable time (10s max for auth check)
    await expect(loader).not.toBeVisible({ timeout: 15000 });

    // 4. Should navigate to /auth if not logged in
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle video load failure gracefully', async ({ page }) => {
    // Intercept video request and abort it to simulate failure
    await page.route('**/*.mp4', route => route.abort());

    await page.goto('/welcome');

    // Loader should still be visible (fallback UI)
    const loader = page.getByRole('progressbar');
    await expect(loader).toBeVisible();

    // Even if video fails, the navigation should still happen
    await expect(loader).not.toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
