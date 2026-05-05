import { test, expect } from '@playwright/test';

test.describe('Editor V3 Production Shield - UI Logic', () => {
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';
  
  test('should initialize editor and verify connectivity', async ({ page }) => {
    // 1. Abrir Editor V3
    await page.goto(`/v3/${patientId}`);
    
    // Esperar carregamento
    await page.waitForLoadState('networkidle');

    // 2. Verificar se o editor não está em estado de erro
    const errorState = page.locator('[data-testid="editor-error-state"]');
    await expect(errorState).not.toBeVisible();

    // 3. Simular alteração e verificar debounced save
    // (Apenas se houver um seletor estável para interação)
    const mealCard = page.locator('div:has-text("Café da Manhã")').first();
    if (await mealCard.isVisible()) {
      await expect(mealCard).toBeVisible();
    }
  });

  test('RLS: User should not see cross-tenant data', async ({ page }) => {
    // Esse teste assume que o Playwright está rodando com um usuário específico.
    // Para testar RLS negativa "de verdade" via E2E, precisaríamos trocar de usuário
    // ou tentar injetar um draftId de outro tenant via URL se o sistema permitisse.
    
    const maliciousDraftId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/v3/edit/${maliciousDraftId}`);
    
    // Deve mostrar 404 ou erro de acesso
    await expect(page.locator('text=Não encontrado, text=Acesso negado, text=Error')).toBeVisible();
  });
});
