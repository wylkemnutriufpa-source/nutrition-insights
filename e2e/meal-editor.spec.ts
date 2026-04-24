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
  // Radix UI Dialog: clicking outside the content area closes the modal
  await page.mouse.click(1, 1);
  await expect(page.locator('role=dialog')).toBeHidden();
};

export const closeViaCancel = async (page: Page) => {
  await page.getByTestId('meal-editor-cancel-button').click();
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

test.describe('MealSmartEditorModal E2E Final Refinement', () => {
  const TEST_ITEM_ID = 'item-1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle PATCH timeout, keep modal open, and show error message', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Intercept PATCH and simulate a timeout/delayed failure
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') {
        // Abort with a timeout-like error
        await route.abort('timedout');
      } else {
        await route.continue();
      }
    });

    await page.getByTestId('add-substitution-button').click();
    
    // Use a counter to ensure only one request was attempted if we trigger save once
    let patchAttempts = 0;
    page.on('request', request => {
      if (request.url().includes('/rest/v1/meal_plan_items') && request.method() === 'PATCH') {
        patchAttempts++;
      }
    });

    await page.getByTestId('meal-editor-save-button').click();

    // Modal should stay open
    await expect(page.locator('role=dialog')).toBeVisible();
    // Should show error message (toast)
    await expect(page.getByText(/Erro ao salvar/i)).toBeVisible();
    // Verify only one attempt was made
    expect(patchAttempts).toBe(1);
  });

  test('should restore focus with focus-visible after closing via Escape, Overlay, or Cancel', async ({ page }) => {
    const trigger = page.getByTestId(`edit-meal-${TEST_ITEM_ID}`);
    
    const closeMethods = [
      { name: 'Escape', fn: closeViaEscape },
      { name: 'Overlay', fn: closeViaOverlay },
      { name: 'Cancel', fn: closeViaCancel }
    ];

    for (const method of closeMethods) {
      // Focus via keyboard to trigger focus-visible state
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('role=dialog')).toBeVisible();
      
      await method.fn(page);
      
      // Verify focus restoration
      await expect(trigger).toBeFocused();
      
      // Check for focus-visible style (assuming ring class is used for visibility)
      await expect(trigger).toHaveClass(/focus-visible:ring/);
    }
  });

  test('should not trigger PATCH and reset form when closing via Cancel button after edits', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    let patchCalled = false;
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') patchCalled = true;
      await route.continue();
    });

    const textarea = page.locator('textarea').first();
    const originalValue = await textarea.inputValue();
    await textarea.fill('Unsaved modifications');
    await addSubstitutions(page, ['Temporary Sub']);
    
    await closeViaCancel(page);
    expect(patchCalled).toBe(false);

    // Re-open and verify original state
    await openMealEditor(page, TEST_ITEM_ID);
    await expect(textarea).toHaveValue(originalValue);
    await expect(page.getByTestId('substitution-input-0')).not.toBeVisible();
  });

  test('should validate PATCH payload structure and normalization against preview', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Mix of spaces and random order
    const rawItems = [' Zebra ', ' Apple ', ' Banana '];
    const expectedArray = ['Apple', 'Banana', 'Zebra']; // Sorted and trimmed

    await addSubstitutions(page, rawItems);
    
    // Check preview area
    const preview = page.getByTestId('aria-live-preview');
    for (const item of expectedArray) {
      await expect(preview).toContainText(item);
    }

    // Intercept and validate deep equality and keys
    await waitForAndValidateSaveRequest(page, (payload) => {
      // Chaves esperadas: description, edit_metadata
      expect(Object.keys(payload)).toContain('description');
      expect(Object.keys(payload)).toContain('edit_metadata');
      
      const savedSubs = payload.edit_metadata?.substitutions_json;
      expect(savedSubs).toEqual(expectedArray);
      
      // Ensure no unexpected fields in metadata if possible to verify
      // (This depends on how much currentMeta is merged)
      expect(payload.edit_metadata.substitutions_json).toHaveLength(3);
    });
  });
});
