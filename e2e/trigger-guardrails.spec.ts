import { test, expect } from '@playwright/test';

test.describe('Meal Plan Trigger Guardrails E2E', () => {
  test('should reflect calculated totals without changing protected data after save', async ({ page }) => {
    // 1. Navegar para a página de planos (assumindo uma rota padrão)
    await page.goto('/dashboard/meal-plans');
    
    // 2. Selecionar o primeiro plano ou um plano de teste
    const firstPlan = page.locator('a[href*="/meal-plans/"]').first();
    await firstPlan.click();
    
    // 3. Capturar valores iniciais
    const initialTitle = await page.getByTestId('plan-title').innerText();
    const initialTotals = await page.getByTestId('plan-totals-summary').innerText();
    
    // 4. Abrir editor de um item
    const firstItemEdit = page.getByTestId(/edit-meal-/).first();
    await firstItemEdit.click();
    
    // 5. Alterar um valor numérico (que afeta o total)
    const caloriesInput = page.getByLabel(/Calorias/i).first();
    await caloriesInput.fill('999');
    
    // 6. Salvar
    const saveButton = page.getByTestId('meal-editor-save-button');
    await saveButton.click();
    
    // 7. Aguardar refetch (verificando se o modal fechou e toast de sucesso apareceu)
    await expect(page.locator('role=dialog')).toBeHidden();
    await expect(page.getByText(/Salvo com sucesso/i)).toBeVisible();
    
    // 8. Validar que o Título permanece o mesmo (Guardrail funcionou)
    const finalTitle = await page.getByTestId('plan-title').innerText();
    expect(finalTitle).toBe(initialTitle);
    
    // 9. Validar que os Totais foram atualizados
    const finalTotals = await page.getByTestId('plan-totals-summary').innerText();
    expect(finalTotals).not.toBe(initialTotals);
    expect(finalTotals).toContain('999'); // Assumindo que o total reflete o input
    
    // 10. Validar via logs de auditoria (opcional - via API se disponível)
    // Aqui poderíamos fazer uma chamada de API para verificar trigger_audit_logs se houvesse endpoint
  });
});
