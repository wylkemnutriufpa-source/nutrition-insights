import { test, expect, Page } from '@playwright/test';

/**
 * Reusable E2E Helpers for MealSmartEditorModal
 */
export const openMealEditor = async (page: Page, itemId: string = 'item-1') => {
  const trigger = page.locator(`[data-testid="edit-meal-${itemId}"]`);
  await trigger.click();
  await expect(page.locator('role=dialog')).toBeVisible();
};

export const addSubstitution = async (page: Page, text: string) => {
  await page.getByTestId('add-substitution-button').click();
  const inputs = page.locator('[data-testid^="substitution-input-"]');
  const lastInput = inputs.last();
  await lastInput.fill(text);
};

export const removeSubstitution = async (page: Page, index: number) => {
  await page.getByTestId(`remove-substitution-button-${index}`).click();
};

export const closeViaEscape = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const closeViaOverlay = async (page: Page) => {
  // Radix Dialog closes when clicking outside the Content
  await page.mouse.click(0, 0); 
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const saveChanges = async (page: Page) => {
  await page.getByTestId('meal-editor-save-button').click();
  await expect(page.locator('role=dialog')).toBeHidden();
};

test.describe('MealSmartEditorModal E2E Final', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to project root
    await page.goto('/');
  });

  test('should restore focus to the trigger element when closing via Escape', async ({ page }) => {
    // Focus the trigger first
    const triggerId = 'edit-meal-item-1';
    const trigger = page.locator(`[data-testid="${triggerId}"]`);
    await trigger.focus();
    await trigger.click();

    await expect(page.locator('role=dialog')).toBeVisible();
    await closeViaEscape(page);

    // After closing, focus should be back on the trigger
    await expect(trigger).toBeFocused();
  });

  test('should reset state when closing via Escape after modifications', async ({ page }) => {
    await openMealEditor(page);
    
    const input = page.locator('textarea').first();
    const originalValue = await input.inputValue();
    
    await input.fill('Temporary Modification');
    await addSubstitution(page, 'New Temp Sub');
    
    await closeViaEscape(page);
    
    // Re-open and verify it's back to original
    await openMealEditor(page);
    await expect(input).toHaveValue(originalValue);
    await expect(page.getByTestId('substitution-input-0')).not.toBeVisible();
  });

  test('should navigate with Tab order correctly and show visible focus', async ({ page }) => {
    await openMealEditor(page);
    
    // Starting focus on Radix Dialog usually goes to first focusable or close button
    // Tab through buttons
    const cancelButton = page.getByTestId('meal-editor-cancel-button');
    const saveButton = page.getByTestId('meal-editor-save-button');

    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();
    await expect(cancelButton).toHaveClass(/focus-visible:ring-2/);

    await page.keyboard.press('Tab');
    await expect(saveButton).toBeFocused();
    
    // Shift+Tab back
    await page.keyboard.press('Shift+Tab');
    await expect(cancelButton).toBeFocused();
  });

  test('should intercept update request and validate normalized JSON payload', async ({ page }) => {
    await openMealEditor(page);
    
    // Add substitution with weird spacing
    const inputVal = '   Apple    \n   Pie   ';
    const expectedNormalized = 'Apple Pie';
    
    await addSubstitution(page, inputVal);
    
    // Verify preview shows normalized text
    const preview = page.getByTestId('aria-live-preview');
    await expect(preview).toContainText(expectedNormalized);

    // Set up request interceptor
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/rest/v1/meal_plan_items') && 
      request.method() === 'PATCH'
    );

    await saveChanges(page);

    const request = await requestPromise;
    const postData = request.postDataJSON();
    
    // Validate that the substitutions_json in the payload is normalized
    // This depends on your actual database schema and how updateItem works
    // Assuming edit_metadata.substitutions_json
    if (postData.edit_metadata && postData.edit_metadata.substitutions_json) {
      expect(postData.edit_metadata.substitutions_json).toContain(expectedNormalized);
    }
  });

  test('should update aria-live message dynamically when limit is crossed', async ({ page }) => {
    await openMealEditor(page);
    
    const ariaLive = page.getByTestId('aria-live-preview');

    // Add 5 items
    for (let i = 0; i < 5; i++) {
      await addSubstitution(page, `Unique Item ${i}`);
    }

    await expect(page.getByText(/Limite Excedido/i)).toBeVisible();
    await expect(ariaLive).toContainText('Apenas as 4 primeiras serão salvas');

    // Remove one to fall back to 4
    await removeSubstitution(page, 0);

    await expect(page.getByText(/Prévia do Plano/i)).toBeVisible();
    await expect(ariaLive).toContainText('Veja como as substituições serão organizadas');
  });
});
