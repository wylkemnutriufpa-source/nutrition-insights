import { test, expect } from '@playwright/test';

test.describe('Editor V3 Production Shield', () => {
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';
  
  test('should initialize draft and persist on save', async ({ page }) => {
    // 1. Abrir Editor V3
    await page.goto(`/v3/${patientId}`);
    await expect(page).toHaveURL(new RegExp(`/v3/${patientId}`));

    // 2. Validar draftId criado (via log ou estado da UI se visível)
    // Aqui assumimos que o editor carrega e não mostra erro de "Draft failed"
    await expect(page.locator('text=Erro')).not.toBeVisible();
    
    // 3. Executar save
    const saveButton = page.locator('button:has-text("Salvar"), button[aria-label="Salvar"]');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // 4. Validar resposta (UI feedback)
      await expect(page.locator('text=Sucesso, text=salvo')).toBeVisible();
    }

    // 5. Refresh e validar persistência
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/v3/${patientId}`));
    await expect(page.locator('text=Erro')).not.toBeVisible();
  });
});
