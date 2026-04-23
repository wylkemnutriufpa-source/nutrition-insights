import { test, expect } from '@playwright/test';

/**
 * E2E test to verify that replacing a specific meal (Lunch/Almoço) 
 * only affects that interval and does not leak to Breakfast or Dinner.
 */
test('Professional can replace only lunch without affecting other meals', async ({ page }) => {
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

  // 3. Create a new plan "Do Zero"
  await page.click('button:has-text("Novo Plano")');
  await page.click('text=Elaborar do Zero');
  
  // Wait for editor
  await expect(page).toHaveURL(/.*meal-plans\/[a-f0-9-]+/);
  
  // 4. Fill Monday (Segunda-feira, day index 1) with Breakfast, Lunch, and Dinner
  const mealRows = page.locator('.grid.grid-cols-\\[160px_repeat\\(7\\,1fr\\)\\]');
  
  // CAFÉ DA MANHÃ (Row 1 after headers)
  const breakfastCell = mealRows.filter({ hasText: 'Café da Manhã' }).locator('.glass.rounded-lg').nth(1);
  await breakfastCell.locator('button:has-text("Manual")').click();
  await page.fill('input[placeholder="Ex: 2 ovos cozidos"]', 'Café Original');
  await page.keyboard.press('Enter');
  await expect(breakfastCell.locator('text=Café Original')).toBeVisible();

  // ALMOÇO (Row 3 after headers)
  const lunchCell = mealRows.filter({ hasText: 'Almoço' }).locator('.glass.rounded-lg').nth(1);
  await lunchCell.locator('button:has-text("Manual")').click();
  await page.fill('input[placeholder="Ex: 2 ovos cozidos"]', 'Almoço Original');
  await page.keyboard.press('Enter');
  await expect(lunchCell.locator('text=Almoço Original')).toBeVisible();

  // JANTAR (Row 5 after headers)
  const dinnerCell = mealRows.filter({ hasText: 'Jantar' }).locator('.glass.rounded-lg').nth(1);
  await dinnerCell.locator('button:has-text("Manual")').click();
  await page.fill('input[placeholder="Ex: 2 ovos cozidos"]', 'Jantar Original');
  await page.keyboard.press('Enter');
  await expect(dinnerCell.locator('text=Jantar Original')).toBeVisible();

  // 5. Replace ONLY the Lunch
  await lunchCell.locator('text=Almoço Original').hover();
  // Click replacement button (usually a swap icon or similar in MealItemCard)
  // According to MealSubstitutionPanel logic, we often replace via library or manual edit
  // Let's use the replacement via library flow if available, or just delete and add new
  // In our store, we can also use 'Substituir' which opens the library sidebar
  await lunchCell.locator('button[title="Substituir pela biblioteca"]').click();
  
  // Choose a meal from the library
  await expect(page.locator('text=Banco de Refeições FitJourney')).toBeVisible();
  const replacementMeal = page.locator('button:has-text("Hipertrofia")').first();
  const replacementTitle = await replacementMeal.locator('span.font-medium').innerText();
  await replacementMeal.click();

  // 6. Verify only Lunch changed
  await expect(lunchCell.locator('text=Almoço Original')).not.toBeVisible();
  await expect(lunchCell.locator(`text=${replacementTitle}`)).toBeVisible();

  // 7. Verify Breakfast and Dinner are intact
  await expect(breakfastCell.locator('text=Café Original')).toBeVisible();
  await expect(dinnerCell.locator('text=Jantar Original')).toBeVisible();

  // 8. Save and confirm
  await page.click('button:has-text("Salvar")');
  await expect(page.locator('text=Plano salvo com sucesso')).toBeVisible();
  
  // 9. Re-open and verify persistence
  await page.reload();
  await expect(breakfastCell.locator('text=Café Original')).toBeVisible();
  await expect(lunchCell.locator(`text=${replacementTitle}`)).toBeVisible();
  await expect(dinnerCell.locator('text=Jantar Original')).toBeVisible();
});