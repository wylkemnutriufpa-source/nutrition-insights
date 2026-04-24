import { test, expect, Page, Request } from '@playwright/test';

/**
 * Reusable E2E Helpers for MealSmartEditorModal
 */
export const openMealEditor = async (page: Page, itemId: string) => {
  const trigger = page.getByTestId(`edit-meal-${itemId}`);
  await trigger.click();
  await expect(page.locator('role=dialog')).toBeVisible();
};

export const addSubstitutions = async (page: Page, texts: string[]) => {
  for (const text of texts) {
    await page.getByTestId('add-substitution-button').click();
    const inputs = page.locator('[data-testid^="substitution-input-"]');
    await inputs.last().fill(text);
  }
};

export const closeViaEscape = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const closeViaOverlay = async (page: Page) => {
  await page.mouse.click(1, 1);
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const closeViaCancel = async (page: Page) => {
  await page.getByTestId('meal-editor-cancel-button').click();
  await expect(page.locator('role=dialog')).toBeHidden();
};

test.describe('MealSmartEditorModal E2E Resilience & Integrity', () => {
  const TEST_ITEM_ID = 'item-1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle PATCH error (500), keep modal open, and show error message', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Mock 500 error for PATCH
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
      } else {
        await route.continue();
      }
    });

    await page.getByTestId('add-substitution-button').click();
    await page.getByTestId('meal-editor-save-button').click();

    // Modal should stay open
    await expect(page.locator('role=dialog')).toBeVisible();
    // Should show error toast/message
    await expect(page.getByText(/Erro ao salvar/i)).toBeVisible();
  });

  test('should not trigger PATCH and reset state when closing via Cancel button', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    let patchCalled = false;
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') patchCalled = true;
      await route.continue();
    });

    const textarea = page.locator('textarea').first();
    const originalValue = await textarea.inputValue();
    await textarea.fill('Modification that should be lost');
    
    await closeViaCancel(page);
    expect(patchCalled).toBe(false);

    // Re-open and verify original state
    await openMealEditor(page, TEST_ITEM_ID);
    await expect(textarea).toHaveValue(originalValue);
  });

  test('should normalize 6 random items to top 4 sorted items in PATCH payload', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const rawItems = ['Zebra', 'Apple', 'Banana', 'Carrot', 'Date', 'Eggplant'];
    const expectedNormalized = ['Apple', 'Banana', 'Carrot', 'Date']; // Top 4 alphabetically

    await addSubstitutions(page, rawItems);

    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/rest/v1/meal_plan_items') && 
      request.method() === 'PATCH'
    );

    await page.getByTestId('meal-editor-save-button').click();

    const request = await requestPromise;
    const payload = request.postDataJSON();
    
    // Verify payload structure and normalization
    expect(payload.edit_metadata).toBeDefined();
    expect(payload.edit_metadata.substitutions_json).toEqual(expectedNormalized);
    expect(Object.keys(payload)).toContain('description');
    expect(Object.keys(payload)).toContain('edit_metadata');
  });

  test('should restore focus with focus-visible styles after closing via multiple methods', async ({ page }) => {
    const trigger = page.getByTestId(`edit-meal-${TEST_ITEM_ID}`);
    
    const methods = [closeViaEscape, closeViaOverlay, closeViaCancel];
    
    for (const closeMethod of methods) {
      // Open via keyboard to trigger focus-visible behavior
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('role=dialog')).toBeVisible();
      
      await closeMethod(page);
      
      // Verify focus is restored to the trigger
      await expect(trigger).toBeFocused();
      
      // Check for visible focus indicators (Tailwind focus-visible:ring-2)
      // Note: This relies on how the trigger button is styled in your app
      await expect(trigger).toHaveClass(/focus-visible:ring/);
    }
  });
});
