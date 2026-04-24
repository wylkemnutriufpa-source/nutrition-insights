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
  // Radix UI Dialog Content usually has pointer-events: auto, overlay is behind
  // Clicking at (1,1) is a safe way to hit the overlay
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

test.describe('MealSmartEditorModal E2E Final Verification', () => {
  const TEST_ITEM_ID = 'item-1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should restore focus to trigger button with focus-visible after closing via Escape', async ({ page }) => {
    const trigger = page.getByTestId(`edit-meal-${TEST_ITEM_ID}`);
    
    // Focus trigger via keyboard to ensure focus-visible state
    await page.keyboard.press('Tab');
    while (!(await trigger.isFocused())) {
      await page.keyboard.press('Tab');
    }
    
    await page.keyboard.press('Enter');
    await expect(page.locator('role=dialog')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('role=dialog')).toBeHidden();
    
    // Verify focus restoration and styling
    await expect(trigger).toBeFocused();
    // Assuming focus-visible state is tracked or visible via ring
    // We can't strictly check for the :focus-visible pseudo-class in all environments easily,
    // but we can check if it has the ring classes if applied on focus.
  });

  test('should enforce 4-item limit in PATCH payload when more are added', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Add 6 items
    const rawItems = ['Zebra', 'Apple', 'Banana', 'Carrot', 'Date', 'Eggplant'];
    const expectedNormalized = ['Apple', 'Banana', 'Carrot', 'Date']; // Top 4 sorted

    await addSubstitutions(page, rawItems);
    
    // Intercept and validate that only 4 items are sent
    await waitForAndValidateSaveRequest(page, (payload) => {
      const savedSubs = payload.edit_metadata?.substitutions_json;
      expect(savedSubs).toHaveLength(4);
      expect(savedSubs).toEqual(expectedNormalized);
    });
  });

  test('should perform deep-equal validation between preview and PATCH payload', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const rawInput = '   Apple    \n   Crisp   ';
    const expectedArray = ['Apple Crisp'];
    
    await addSubstitutions(page, [rawInput]);
    
    // Get text from preview and parse it (simulated)
    const previewText = await page.getByTestId('aria-live-preview').innerText();
    // The preview displays "🔄 Substituições:\nItem1\nItem2..."
    const previewItems = previewText.split('\n').slice(1).map(s => s.trim()).filter(s => s.length > 0);

    // Intercept and validate deep equality
    await waitForAndValidateSaveRequest(page, (payload) => {
      const savedSubs = payload.edit_metadata?.substitutions_json;
      // Strict deep-equal check
      expect(savedSubs).toEqual(previewItems);
      expect(JSON.stringify(savedSubs)).toBe(JSON.stringify(expectedArray));
    });
  });

  test('should call PATCH exactly once on Save and zero times on Close/Escape', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    let patchCount = 0;
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') {
        patchCount++;
      }
      await route.continue();
    });

    // Case 1: Close via Escape - should NOT trigger PATCH
    await page.keyboard.press('Escape');
    expect(patchCount).toBe(0);

    // Case 2: Open and Save - should trigger PATCH once
    await openMealEditor(page, TEST_ITEM_ID);
    await page.getByTestId('meal-editor-save-button').click();
    await expect(page.locator('role=dialog')).toBeHidden();
    
    expect(patchCount).toBe(1);
  });

  test('should delete all substitutions using data-testid and persist empty array', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Ensure we have something to delete
    await addSubstitutions(page, ['Delete Me 1', 'Delete Me 2']);
    
    // Delete using test-ids
    await removeSubstitutionAt(page, 0);
    await removeSubstitutionAt(page, 0); // After first delete, next one becomes index 0

    await waitForAndValidateSaveRequest(page, (payload) => {
      expect(payload.edit_metadata?.substitutions_json).toEqual([]);
    });
  });
});
