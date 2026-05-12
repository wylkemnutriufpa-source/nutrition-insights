
import { test, expect } from './fixtures';

test.describe('Editor V3 Runtime Blindagem', () => {
  // Milton Santos (Paciente de Teste do V3)
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';

  test('deve executar fluxo completo: edição, realtime, persistência e rehidratação', async ({ nutriPage }) => {
    const page = nutriPage;
    
    // 1. Abrir Editor V3
    await page.goto(`/v3/${patientId}`);
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible({ timeout: 20000 });
    
    // 2. Localizar um item de alimento (ex: Arroz)
    const foodItem = page.locator('.group\\/item').first();
    await expect(foodItem).toBeVisible();
    
    // 3. Abrir Modal de Ajuste
    await foodItem.click();
    await expect(page.locator('text=Ajuste de Porção').first()).toBeVisible();

    // 4. Alterar Quantidade (Simular 175g -> 130g)
    const qtyInput = page.locator('input[type="number"]');
    await qtyInput.fill('130');
    
    // 5. Validar Realtime (Substituições não explodem)
    // Verificamos se o primeiro item de substituição tem um peso razoável (ex: < 500g)
    const subItem = page.locator('button:has-text("g)")').first();
    const subText = await subItem.innerText();
    const gramsMatch = subText.match(/\((\d+)g\)/);
    if (gramsMatch) {
      const grams = parseInt(gramsMatch[1]);
      expect(grams).toBeLessThan(800);
    }

    // 6. Fechar Modal
    await page.keyboard.press('Escape');

    // 7. Salvar Plano
    const saveButton = page.locator('button:has-text("Salvar Plano")');
    await saveButton.click();
    await expect(page.locator('text=Sucesso')).toBeVisible();

    // 8. Refresh e Rehidratação
    await page.reload();
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible();
    
    // 9. Validar Persistência
    await page.locator('.group\\/item').first().click();
    const persistedQty = await page.locator('input[type="number"]').inputValue();
    expect(persistedQty).toBe('130');
  });
});
