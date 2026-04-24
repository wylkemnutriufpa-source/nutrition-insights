import { test, expect, Page, Request, Locator } from '@playwright/test';

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

/**
 * Helper to assert focus-visible state using computed styles
 */
export const expectFocusVisible = async (locator: Locator) => {
  await expect(locator).toBeFocused();
  // focus-visible usually manifests as an outline or box-shadow (ring)
  // Radix/Tailwind focus-visible:ring-2 usually sets box-shadow or outline
  const styles = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle
    };
  });
  
  const hasVisibleFocus = 
    (styles.outlineStyle !== 'none' && parseInt(styles.outlineWidth) > 0) || 
    (styles.boxShadow !== 'none' && styles.boxShadow !== '');
    
  expect(hasVisibleFocus).toBe(true);
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

test.describe('MealSmartEditorModal E2E Strict Validation', () => {
  const TEST_ITEM_ID = 'item-1';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should restore focus-visible state using computed styles after multiple close routes', async ({ page }) => {
    const trigger = page.getByTestId(`edit-meal-${TEST_ITEM_ID}`);
    const methods = [
      { name: 'Escape', fn: closeViaEscape },
      { name: 'Overlay', fn: closeViaOverlay },
      { name: 'Cancel', fn: closeViaCancel }
    ];

    for (const method of methods) {
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('role=dialog')).toBeVisible();
      
      await method.fn(page);
      await expectFocusVisible(trigger);
    }
  });

  test('should track PATCH attempts and verify exactly one request on error and modal persistence', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    let patchAttempts = 0;
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') {
        patchAttempts++;
        await route.abort('timedout');
      } else {
        await route.continue();
      }
    });

    await page.getByTestId('meal-editor-save-button').click();

    // Verify exactly one attempt (no hidden retries or duplicates)
    expect(patchAttempts).toBe(1);
    
    // Modal stays open and error toast persists
    await expect(page.locator('role=dialog')).toBeVisible();
    const errorToast = page.getByText(/Erro ao salvar/i);
    await expect(errorToast).toBeVisible();
    
    // Verify toast is not stacked (only one should exist)
    await expect(errorToast).toHaveCount(1);
  });

  test('should validate PATCH payload keys and substitutions_json normalization strictly', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const rawItems = ['   Zebra  ', 'Apple', 'Banana', '   Apple   '];
    const expectedArray = ['Apple', 'Banana', 'Zebra']; // Sorted, trimmed, deduplicated

    await addSubstitutions(page, rawItems);
    
    // Extract normalized JSON from preview via data-testid
    const previewJsonText = await page.getByTestId('preview-substitutions-json').innerText();
    const previewItems = JSON.parse(previewJsonText);
    expect(previewItems).toEqual(expectedArray);

    const requestPromise = page.waitForRequest(request => 
      request.url().includes('/rest/v1/meal_plan_items') && 
      request.method() === 'PATCH'
    );

    await page.getByTestId('meal-editor-save-button').click();

    const request = await requestPromise;
    const payload = request.postDataJSON();
    
    // Verify top-level keys
    const topLevelKeys = Object.keys(payload).sort();
    // description and edit_metadata are required
    expect(topLevelKeys).toEqual(['description', 'edit_metadata', 'notes'].sort());

    // Verify edit_metadata content strictly
    const metaKeys = Object.keys(payload.edit_metadata);
    expect(metaKeys).toContain('substitutions_json');
    expect(payload.edit_metadata.substitutions_json).toEqual(expectedArray);
  });
});
