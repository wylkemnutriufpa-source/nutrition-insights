import { test, expect } from '@playwright/test';

/**
 * E2E test covering:
 * 1. Manual protein adjustment
 * 2. Meal replacement via Library
 * 3. Copy/Paste meal between days
 */
test('Professional can manage meal plans with manual adjustments and copy/paste', async ({ page }) => {
  // 1. Login
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'nutri@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // 2. Navigate to Meal Plans
  await page.click('a[href="/meal-plans"]');
  await expect(page).toHaveURL(/.*meal-plans/);

  // 3. Create a new plan for a patient
  await page.click('button:has-text("Novo Plano")');
  await page.click('text=Elaborar do Zero');
  
  // Wait for editor to load
  await expect(page).toHaveURL(/.*meal-plans\/[a-f0-9-]+/);
  
  // 4. Add a manual item to Monday Breakfast
  // Cell is 1st day (Segunda) and 1st meal (Café da Manhã)
  // Our WeeklyGrid uses 0 for Domingo, 1 for Segunda.
  const mondayBreakfastCell = page.locator('.glass.rounded-lg').filter({ hasText: 'Café da Manhã' }).nth(1); // Row 1, Col 2 (Monday)
  
  await mondayBreakfastCell.click();
  await page.click('button:has-text("Manual")');
  await page.fill('input[placeholder="Ex: 2 ovos cozidos"]', 'Ovos mexidos');
  await page.keyboard.press('Enter');

  // Verify item added
  await expect(page.locator('text=Ovos mexidos')).toBeVisible();

  // 5. Manual protein adjustment
  await page.hover('text=Ovos mexidos');
  await page.click('button[title="Editar macros"]');
  
  await expect(page.locator('text=Editar Macros — Ovos mexidos')).toBeVisible();
  await page.fill('input[placeholder="g"]', '25'); // Protein field (using placeholder 'g')
  await page.click('button:has-text("Salvar")');

  // Verify updated macros in UI
  await expect(page.locator('text=25g')).toBeVisible();

  // 6. Meal replacement via Library
  await page.click('button[title="Substituir pela biblioteca"]');
  await expect(page.locator('text=Banco de Refeições FitJourney')).toBeVisible();
  
  // Search for something if library is large, or just pick the first one
  // Let's assume there's at least one meal in the library
  const firstLibraryMeal = page.locator('button:has-text("Hipertrofia")').first();
  const mealTitle = await firstLibraryMeal.locator('span.font-medium').innerText();
  await firstLibraryMeal.click();

  // Verify original item is gone and new one is there
  await expect(page.locator('text=Ovos mexidos')).not.toBeVisible();
  await expect(page.locator(`text=${mealTitle}`)).toBeVisible();

  // 7. Copy/Paste meal
  await page.hover(`text=${mealTitle}`);
  await page.click('button[title="Copiar Refeição"]');
  
  // Paste to Tuesday (Terça - index 2)
  const tuesdayBreakfastCell = page.locator('.glass.rounded-lg').filter({ hasText: 'Café da Manhã' }).nth(2);
  await expect(tuesdayBreakfastCell.locator('button[title="Colar Refeição aqui"]')).toBeVisible();
  await tuesdayBreakfastCell.locator('button[title="Colar Refeição aqui"]').click();

  // Verify item appeared on Tuesday
  await expect(tuesdayBreakfastCell.locator(`text=${mealTitle}`)).toBeVisible();

  // 8. Save and confirm
  await page.click('button:has-text("Salvar")');
  await expect(page.locator('text=Plano salvo com sucesso')).toBeVisible();
});
