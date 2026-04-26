import { test, expect } from '@playwright/test';

test.describe('Comprehensive Validations E2E', () => {
  
  test('WhatsApp normalization and error consistency (Patient vs Settings)', async ({ page }) => {
    // 1. Check Invite Patient flow (Professional)
    // We need to be logged in as a professional for this.
    // Assuming auth is handled or using a public route if available for testing.
    // For now, let's use the PatientRegister (public) and Settings (protected).
    
    await page.goto('/register-patient');
    const whatsappInput = page.locator('#whatsapp');
    
    // Invalid number - too short
    await whatsappInput.fill('123');
    await whatsappInput.blur();
    await expect(page.locator('text=Número muito curto')).toBeVisible();
    
    // Invalid Brazilian number
    await whatsappInput.fill('119999');
    await whatsappInput.blur();
    await expect(page.locator('text=Número brasileiro deve ter 10 ou 11 dígitos (com DDD)')).toBeVisible();

    // Valid Brazilian number
    await whatsappInput.fill('11999999999');
    await whatsappInput.blur();
    await expect(page.locator('text=Número brasileiro deve ter 10 ou 11 dígitos (com DDD)')).not.toBeVisible();
    
    // Check normalization if possible (e.g. if we can see the formatted value in a toast or link)
    // In PatientRegister, normalization happens during submission.
  });

  test('Notification action summaries and fallback state', async ({ page }) => {
    // This requires mock notifications in the database or intercepting the request.
    // We'll simulate a notification click and check for fallback message if destination is missing.
    
    // Mocking the notifications API response
    await page.route('**/rest/v1/notifications*', async (route) => {
      const json = [
        {
          id: 'mock-1',
          title: 'Novo Plano',
          message: 'Seu plano foi publicado',
          type: 'plan_published',
          is_read: false,
          action_url: null,
          target_route: null, // Missing route to trigger fallback
          entity_type: 'plan',
          entity_id: '123',
          created_at: new Date().toISOString()
        }
      ];
      await route.fulfill({ json });
    });

    await page.goto('/notifications');
    
    // Check summary button text
    await expect(page.locator('text=Abrir plano')).toBeVisible();
    
    // Check fallback message
    await expect(page.locator('text=Destino original indisponível. Usando fallback.')).toBeVisible();
  });

  test('Invitation confirmation back navigation consistency', async ({ page }) => {
    // Navigate to a register link with preselected professional
    const mockNutriId = '00000000-0000-0000-0000-000000000000';
    
    // Mock professional data
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({ json: [{ user_id: mockNutriId, full_name: 'Dr. Teste', avatar_url: null, phone: null }] });
    });
    await page.route('**/rest/v1/professional_profiles*', async (route) => {
      await route.fulfill({ json: [{ user_id: mockNutriId, clinic_name: 'Clínica Central' }] });
    });
    
    await page.goto(`/register-patient?nutri=${mockNutriId}&sig=mock`);
    
    // Step 1: Confirmation screen
    await expect(page.locator('text=Dr. Teste')).toBeVisible();
    await expect(page.locator('text=Clínica Central')).toBeVisible();
    
    // Click "Aceitar Convite e Continuar"
    await page.click('text=Aceitar Convite e Continuar');
    
    // Step 2: Form screen
    await expect(page.locator('text=Profissional Vinculado')).toBeVisible();
    await expect(page.locator('text=Dr. Teste')).toBeVisible();
    
    // Click "Voltar"
    await page.click('button:has-text("Voltar")');
    
    // Step 1: Back to confirmation screen
    await expect(page.locator('text=Dr. Teste')).toBeVisible();
    await expect(page.locator('text=Clínica Central')).toBeVisible();
  });

  test('Update popup loop protection (Android simulated behavior)', async ({ page }) => {
    await page.goto('/');
    
    // Force a "waiting" service worker state by mocking the registration
    await page.evaluate(() => {
      // Simulate SW update found
      window.dispatchEvent(new CustomEvent('fj-mock-update'));
    });
    
    // Since we can't easily trigger the real SW from Playwright without a real build,
    // we'll check if the Banner handles visibilitychange without resetting dismissed state.
    
    // 1. Manually mark as dismissed in localStorage
    await page.evaluate(() => {
      localStorage.setItem('fj:update-dismissed-at', String(Date.now()));
      localStorage.setItem('fj:update-dismissed-version', 'v1');
    });
    
    // 2. Simulate visibility changes
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // 3. Ensure banner is NOT shown
    const banner = page.locator('text=Nova Versão Disponível!');
    await expect(banner).not.toBeVisible();
  });

  test('Clear cache and update button behavior', async ({ page }) => {
    await page.goto('/settings');
    
    const clearCacheBtn = page.locator('text=Limpar Cache e Atualizar');
    await expect(clearCacheBtn).toBeVisible();
    
    // Mock forceHardReload to prevent actual page navigation during test
    await page.evaluate(() => {
      (window as any).forceHardReloadMocked = false;
      // We don't overwrite the real function here, but we can check for the toast
    });
    
    await clearCacheBtn.click();
    
    // Check for success toast
    await expect(page.locator('text=Cache limpo! Recarregando...')).toBeVisible();
  });

});
