import { test, expect } from '@playwright/test';

test.describe('Invitation Flow Regression', () => {
  const TEST_CODE = 'TEST-REGRESSION-CODE';
  const PROFESSIONAL_ID = '00000000-0000-0000-0000-000000000000';

  test('should redirect /convite/:code to /cadastro without 404', async ({ page }) => {
    // Navigate to a legacy-style invite link
    await page.goto(`/convite/${TEST_CODE}`);
    
    // Check if redirected to /cadastro and contains the code
    await expect(page).toHaveURL(new RegExp(`/cadastro\\?.*code=${TEST_CODE}`));
    
    // Check if 404 is NOT displayed
    const notFound = page.getByText(/404|Página não encontrada/i);
    await expect(notFound).not.toBeVisible();
  });

  test('should show professional identity on /cadastro?code=', async ({ page }) => {
    // Navigate with a pre-selected professional
    await page.goto(`/cadastro?nutri=${PROFESSIONAL_ID}&code=${TEST_CODE}`);
    
    // Wait for the validation loader to finish
    await expect(page.getByText('Validando convite...')).not.toBeVisible({ timeout: 10000 });
    
    // Check for "Iniciando cadastro com" or similar professional identity UI
    // Note: This relies on the professional being found in the database.
    // For a generic test, we check if the professional section or a placeholder exists.
    const profHeader = page.getByText(/Iniciando cadastro com|vínculo automático/i);
    await expect(profHeader).toBeVisible();
  });

  test('should block registration without professional vínculo', async ({ page }) => {
    // Go to registration without any params
    await page.goto('/cadastro');
    
    // Try to register (fields empty)
    await page.click('button:has-text("Concluir Cadastro")');
    
    // Should show the "Acesso por convite" block or error
    const blockMessage = page.getByText(/Acesso por convite|link oficial/i);
    await expect(blockMessage).toBeVisible();
  });
});
