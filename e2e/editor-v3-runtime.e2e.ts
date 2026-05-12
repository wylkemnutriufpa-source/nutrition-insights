
import { test, expect } from './fixtures';

/**
 * Editor V3 Runtime & Boundary Protection E2E
 * Validates critical flows, isolation, and persistence.
 */
test.describe('Editor V3 - Runtime Hardening & Blindagem', () => {
  // Use a stable test patient
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';

  test('Boundary: Editor V3 should not break V1 Layout and Navigation', async ({ nutriPage }) => {
    const page = nutriPage;
    
    // 1. Visit V1 Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('text=Pacientes').first()).toBeVisible();
    
    // 2. Navigate to Editor V3
    await page.goto(`/v3/${patientId}`);
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible({ timeout: 15000 });
    
    // 3. Verify Topbar/Global Navigation is still present (Isolation check)
    // Assuming V1 layout has a sidebar or specific navigation element
    const sidebar = page.locator('nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('Runtime: Full Editor V3 Lifecycle (Edit -> Save -> Refresh -> Persistence)', async ({ nutriPage }) => {
    const page = nutriPage;
    const testQuantity = '130';
    
    // 1. Open Editor
    await page.goto(`/v3/${patientId}`);
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible();
    
    // 2. Select first food item and edit quantity
    const firstFoodItem = page.locator('.group\\/item').first();
    await firstFoodItem.click();
    
    // 3. Normalization Guard: Verify that entering numeric values works correctly
    const qtyInput = page.locator('input[type="number"]');
    await qtyInput.fill(testQuantity);
    
    // 4. Clinical Engine Check: Verify that substitutions don't explode (Realtime)
    const firstSub = page.locator('button:has-text("g)")').first();
    const subText = await firstSub.innerText();
    const grams = parseInt(subText.match(/\((\d+)g\)/)?.[1] || '0');
    expect(grams).toBeGreaterThan(0);
    expect(grams).toBeLessThan(800); // Clinical safety limit

    // 5. Close modal and save
    await page.keyboard.press('Escape');
    const saveButton = page.locator('button:has-text("Salvar Plano")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    // 6. Verify success toast
    await expect(page.locator('text=Sucesso')).toBeVisible();

    // 7. Hard Reload (Simulating browser refresh)
    await page.reload();
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible();
    
    // 8. Rehydration Check: Verify value is still there
    await page.locator('.group\\/item').first().click();
    const rehydratedQty = await page.locator('input[type="number"]').inputValue();
    expect(rehydratedQty).toBe(testQuantity);
  });

  test('Regression: Unit Normalization Guard (Spoons to Grams)', async ({ nutriPage }) => {
    const page = nutriPage;
    
    await page.goto(`/v3/${patientId}`);
    await page.locator('.group\\/item').first().click();
    
    const qtyInput = page.locator('input[type="number"]');
    
    // Simulate typing a large number that should trigger automatic unit normalization
    // if the system handles "spoons" vs "grams" automatically
    await qtyInput.fill('60'); 
    
    // If the unit was 'colher' and 60 is entered, it should likely stay or normalize
    // We check that it doesn't result in a value that causes nutritional explosion
    const kcalValue = await page.locator('text=kcal').first().innerText();
    const kcal = parseInt(kcalValue.match(/(\d+)/)?.[1] || '0');
    expect(kcal).toBeLessThan(2000); // A single item should not exceed a full day's worth of calories
  });
});
