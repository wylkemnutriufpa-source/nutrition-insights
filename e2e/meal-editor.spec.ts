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
  // Radix UI Dialog: clicking outside the content area closes the modal
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

test.describe('MealSmartEditorModal E2E Final Refinement', () => {
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

  test('should handle rapid Escape + Overlay click race condition without double PATCH', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    let patchCount = 0;
    await page.route('**/rest/v1/meal_plan_items**', async route => {
      if (route.request().method() === 'PATCH') {
        patchCount++;
      }
      await route.continue();
    });

    await page.getByPlaceholder(/Os alimentos selecionados/i).fill('Rapid close test');

    // Trigger rapid fire close events
    await page.keyboard.press('Escape');
    await page.mouse.click(1, 1); 

    await expect(page.locator('role=dialog')).toBeHidden();
    
    // Verify no PATCH request was sent during close
    expect(patchCount).toBe(0);
    
    // Re-open to verify reset
    await openMealEditor(page, TEST_ITEM_ID);
    await expect(page.getByPlaceholder(/Os alimentos selecionados/i)).not.toHaveValue('Rapid close test');
  });

  test('should save exactly 4 complex substitutions and match preview JSON exactly', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    const subs = [
      '  Banana  \n ',
      ' Apple ',
      ' Zebra ',
      ' Carrot '
    ];
    const expectedNormalized = ['Apple', 'Banana', 'Carrot', 'Zebra']; // Sorted, trimmed

    await addSubstitutions(page, subs);
    
    // Check preview area for exact text and aria-live status
    const preview = page.getByTestId('aria-live-preview');
    await expect(page.getByText(/Prévia do Plano/i)).toBeVisible();
    await expect(page.getByText(/Limite Excedido/i)).not.toBeVisible();
    
    for (const sub of expectedNormalized) {
      await expect(preview).toContainText(sub);
    }

    // Intercept and validate exact JSON
    await waitForAndValidateSaveRequest(page, (payload) => {
      const savedSubs = payload.edit_metadata?.substitutions_json;
      expect(savedSubs).toEqual(expectedNormalized);
      expect(JSON.stringify(savedSubs)).toBe(JSON.stringify(expectedNormalized));
    });
  });

  test('should clear all substitutions and persist empty array correctly', async ({ page }) => {
    await openMealEditor(page, TEST_ITEM_ID);
    
    // Add one first to make sure we can clear it
    await addSubstitutions(page, ['To be cleared']);
    
    // Remove all
    const deleteButtons = page.locator('button >> svg.lucide-trash-2').locator('..');
    const count = await deleteButtons.count();
    for (let i = 0; i < count; i++) {
      await deleteButtons.first().click();
    }

    // Intercept and validate empty payload
    await waitForAndValidateSaveRequest(page, (payload) => {
      expect(payload.edit_metadata?.substitutions_json).toEqual([]);
    });

    // Re-open to verify empty state
    await openMealEditor(page, TEST_ITEM_ID);
    await expect(page.getByText(/Nenhuma substituição adicionada/i)).toBeVisible();
  });
});
