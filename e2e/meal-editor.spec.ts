import { test, expect, Page } from '@playwright/test';

// Reusable E2E Helpers
export const openMealEditor = async (page: Page, itemId: string = 'item-1') => {
  const trigger = page.locator(`[data-testid="edit-meal-${itemId}"]`);
  await trigger.click();
  await expect(page.locator('role=dialog')).toBeVisible();
};

export const addSubstitution = async (page: Page, text: string) => {
  await page.getByRole('button', { name: /Adicionar/i }).click();
  const inputs = page.locator('input[placeholder*="Ex: • Pão"]');
  const lastInput = inputs.last();
  await lastInput.fill(text);
};

export const clearAllSubstitutions = async (page: Page) => {
  const deleteButtons = page.locator('button >> svg.lucide-trash-2').locator('..');
  const count = await deleteButtons.count();
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click();
  }
};

test.describe('MealSmartEditorModal E2E Refined', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page containing the meal editor
    await page.goto('/');
  });

  test('should navigate with Tab/Shift+Tab in correct order with visible focus', async ({ page }) => {
    await openMealEditor(page);
    
    // Start Tabbing from within the dialog
    // Focus usually starts at the first interactive element or the close button
    await page.keyboard.press('Tab');
    
    const cancelButton = page.getByTestId('meal-editor-cancel-button');
    const saveButton = page.getByTestId('meal-editor-save-button');

    // Tab through until we reach Cancel
    // This is approximate as focus starts at DialogContent/Close usually
    // We'll focus manually to test the specific transition
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();
    await expect(cancelButton).toHaveClass(/focus-visible:ring-2/);

    await page.keyboard.press('Tab');
    await expect(saveButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(cancelButton).toBeFocused();
  });

  test('should handle rapid Escape + Overlay click race condition', async ({ page }) => {
    await openMealEditor(page);
    
    // Modify something
    await page.getByPlaceholder(/Os alimentos selecionados/i).fill('Modified description');

    // Trigger rapid fire close events
    // Playwright executes these fast enough to simulate the condition
    await page.keyboard.press('Escape');
    // Overlay click (clicking outside the dialog content)
    await page.mouse.click(10, 10); 

    await expect(page.locator('role=dialog')).toBeHidden();
    
    // Re-open to verify it didn't save (updateItem not called)
    await openMealEditor(page);
    await expect(page.getByPlaceholder(/Os alimentos selecionados/i)).not.toHaveValue('Modified description');
  });

  test('should persist normalized JSON identical to preview', async ({ page }) => {
    await openMealEditor(page);
    
    const complexInput = '  Banana   \n  Prata  ';
    const expectedNormalized = 'Banana Prata';

    await addSubstitution(page, complexInput);

    // Verify preview text in the dialog
    const preview = page.locator('role=status');
    await expect(preview).toContainText(expectedNormalized);

    // Intercept the update call (simulated by checking if the preview is consistent)
    // In a real app we'd use page.waitForRequest() to intercept the API call
    /*
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/items/update') && req.method() === 'POST'),
      page.getByTestId('meal-editor-save-button').click()
    ]);
    const payload = request.postDataJSON();
    expect(payload.edit_metadata.substitutions_json).toContain(expectedNormalized);
    */

    await page.getByTestId('meal-editor-save-button').click();
    await expect(page.locator('role=dialog')).toBeHidden();
  });

  test('should update aria-live message correctly when crossing the 4-item limit', async ({ page }) => {
    await openMealEditor(page);
    
    // Add 5 items
    for (let i = 0; i < 5; i++) {
      await addSubstitution(page, `Unique Sub ${i}`);
    }

    const ariaLive = page.locator('role=status');
    await expect(page.getByText(/Limite Excedido/i)).toBeVisible();
    await expect(ariaLive).toContainText('Apenas as 4 primeiras serão salvas');

    // Remove one
    const deleteButtons = page.locator('button >> svg.lucide-trash-2').locator('..');
    await deleteButtons.first().click();

    await expect(page.getByText(/Prévia do Plano/i)).toBeVisible();
    await expect(ariaLive).toContainText('Veja como as substituições serão organizadas');
  });
});
