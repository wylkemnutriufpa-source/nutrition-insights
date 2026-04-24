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

export const removeSubstitutionAt = async (page: Page, index: number) => {
  await page.getByTestId(`remove-substitution-button-${index}`).click();
};

export const closeViaEscape = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const closeViaOverlay = async (page: Page) => {
  // Radix UI Dialog: clicking at (0,0) or outside the content area closes the modal
  await page.mouse.click(1, 1);
  await expect(page.locator('role=dialog')).toBeHidden();
};

/**
 * Helper to intercept and validate the update request
 */
export const waitForAndValidateSaveRequest = async (
  page: Page,
  validateFn: (payload: any) => void
) => {
  const requestPromise = page.waitForRequest((request: Request) => 
    request.url().includes('/rest/v1/meal_plan_items') && 
    request.method() === 'PATCH'
  );

  await page.getByTestId('meal-editor-save-button').click();

  const request = await requestPromise;
  const payload = request.postDataJSON();
  validateFn(payload);
  
  await expect(page.locator('role=dialog')).toBeHidden();
  return payload;
};

test.describe('MealSmartEditorModal E2E Refined & Generalized', () => {
  const TEST_ITEM_ID = 'item-1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should restore focus to trigger and reset state when closing via overlay after edits', async ({ page }) => {
    const trigger = page.getByTestId(`edit-meal-${TEST_ITEM_ID}`);
    await trigger.focus();
    await openMealEditor(page, TEST_ITEM_ID);
    
    const textarea = page.locator('textarea').first();
    const originalValue = await textarea.inputValue();
    
    await textarea.fill('Dirty temporary change');
    await addSubstitutions(page, ['New temporary sub']);
    
    await closeViaOverlay(page);
    
    // Verify focus restoration
    await expect(trigger).toBeFocused();
    
    // Re-open and verify reset
    await openMealEditor(page, TEST_ITEM_ID);
    await expect(textarea).toHaveValue(originalValue);
    await expect(page.getByTestId('substitution-input-0')).not.toBeVisible();
  });

  test('should navigate with Tab/Shift+Tab and show :focus-visible indicators', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const cancelButton = page.getByTestId('meal-editor-cancel-button');
    const saveButton = page.getByTestId('meal-editor-save-button');

    // Focus first element manually to start sequence
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();
    // Check for focus-visible ring (using our Tailwind class)
    await expect(cancelButton).toHaveClass(/focus-visible:ring-2/);

    await page.keyboard.press('Tab');
    await expect(saveButton).toBeFocused();
    
    await page.keyboard.press('Shift+Tab');
    await expect(cancelButton).toBeFocused();
  });

  test('should intercept save and compare payload JSON with normalized preview text', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const rawInput = '   Apple    \n   Crisp   ';
    const expectedNormalized = 'Apple Crisp';
    
    await addSubstitutions(page, [rawInput]);
    
    // Check preview area
    const preview = page.getByTestId('aria-live-preview');
    await expect(preview).toContainText(expectedNormalized);

    // Intercept and validate
    await waitForAndValidateSaveRequest(page, (payload) => {
      const subs = payload.edit_metadata?.substitutions_json;
      expect(subs).toBeDefined();
      expect(subs).toContain(expectedNormalized);
      // Ensure no raw spacing/newlines survived
      expect(subs[0]).toBe(expectedNormalized);
    });
  });

  test('should announce correct aria-live messages during addition and removal', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const ariaLive = page.getByTestId('aria-live-preview');

    // Add 5 unique items using generalized helper
    await addSubstitutions(page, ['S1', 'S2', 'S3', 'S4', 'S5']);

    await expect(page.getByText(/Limite Excedido/i)).toBeVisible();
    await expect(ariaLive).toContainText('Apenas as 4 primeiras serão salvas');

    // Remove one using index helper
    await removeSubstitutionAt(page, 0);

    await expect(page.getByText(/Prévia do Plano/i)).toBeVisible();
    await expect(ariaLive).toContainText('Veja como as substituições serão organizadas');
  });
});
