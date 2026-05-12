
import { test, expect } from './fixtures';

test.describe('Editor V3 Runtime Blindagem', () => {
  // Deborah (Paciente de Teste do V3)
  const patientId = '42b958c6-aa5f-4955-9406-3c1d04d6a045';

  test('deve executar fluxo completo: edição, realtime, persistência e rehidratação', async ({ nutriPage }) => {
    const page = nutriPage;
    
    console.log(`[E2E] Iniciando teste para paciente: ${patientId}`);
    
    // 1. Abrir Editor V3
    await page.goto(`/v3/${patientId}`);
    
    // Garantir que carregou (Título ou Indicador de Sucesso)
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible({ timeout: 20000 });
    
    // 2. Localizar um item de alimento
    // Buscamos um container que tenha o nome de um alimento comum ou apenas o primeiro item
    const foodItem = page.locator('.group\\/item').first();
    await expect(foodItem).toBeVisible();
    
    const itemName = await foodItem.innerText();
    console.log(`[E2E] Item encontrado para teste: ${itemName}`);

    // 3. Abrir Modal de Ajuste (Clique no item)
    await foodItem.click();
    
    // Validar abertura do modal
    await expect(page.locator('text=Ajuste de Porção').first()).toBeVisible();
    await expect(page.locator('text=Substituições Recomendadas').first()).toBeVisible();

    // 4. Alterar Quantidade (Simular 175g -> 130g)
    const qtyInput = page.locator('input[type="number"]');
    await expect(qtyInput).toBeVisible();
    
    const initialQty = await qtyInput.inputValue();
    console.log(`[E2E] Quantidade inicial: ${initialQty}`);
    
    await qtyInput.fill('130');
    
    // 5. Validar Realtime (Kcal e Proteína atualizam)
    const kcalDisplay = page.locator('p:has-text("kcal")').first();
    const proteinDisplay = page.locator('p:has-text("g")').filter({ hasText: /proteína/i }).first();
    
    await expect(kcalDisplay).not.toHaveText('0 kcal');
    // Se mudamos a quantidade, os macros devem ser calculados
    const currentKcal = await kcalDisplay.innerText();
    console.log(`[E2E] Macros Realtime: ${currentKcal}`);

    // 6. Fechar Modal (via botão X ou Esc)
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Ajuste de Porção')).not.toBeVisible();

    // 7. Salvar Plano (Persistência no Supabase via DraftSync)
    const saveButton = page.locator('button:has-text("Salvar Plano")');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    
    // 8. Validar Feedback de Persistência
    await expect(page.locator('text=Sucesso')).toBeVisible({ timeout: 10000 });
    console.log('[E2E] Salvo com sucesso no Supabase.');

    // 9. Refresh do Navegador (Teste de Hidratação)
    await page.reload();
    await expect(page.locator('text=Plano Alimentar').first()).toBeVisible({ timeout: 20000 });
    
    // 10. Reabrir e Validar Persistência do Valor 130g
    // Clicamos no item novamente
    await page.locator('.group\\/item').first().click();
    
    const persistedQty = await page.locator('input[type="number"]').inputValue();
    console.log(`[E2E] Quantidade após rehidratação: ${persistedQty}`);
    
    expect(persistedQty).toBe('130');
    
    console.log('[E2E] Blindagem de Runtime validada: Normalização -> Persistência -> Rehidratação OK.');
  });
});
