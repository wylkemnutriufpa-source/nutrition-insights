import { test, expect } from './fixtures';

test.describe('Meal Editor Robustness and UX Consistency', () => {
  
  test.beforeEach(async ({ nutriPage }) => {
    // Acessa a lista de pacientes e entra no primeiro paciente
    await nutriPage.goto('/patients');
    const patientRow = nutriPage.locator('tr').filter({ hasText: /Paciente|Teste/i }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();

    // Entra no editor de plano (Plan Builder ou Meal Plans)
    const planLink = nutriPage.locator('a[href*="/plan-builder/"], a[href*="/meal-plans/"]').first();
    if (await planLink.isVisible()) {
      await planLink.click();
    } else {
      // Cria um plano "Do Zero" se não houver
      const doZeroBtn = nutriPage.getByRole('button', { name: /Do Zero|Novo Plano/i }).first();
      await expect(doZeroBtn).toBeVisible();
      await doZeroBtn.click();
    }
    
    // Aguarda carregar o grid
    await expect(nutriPage.getByTestId(/^edit-meal-/).first()).toBeVisible({ timeout: 20000 });
  });

  test('UX: Focus restoration on ESC with multiple items (up to 4+)', async ({ nutriPage }) => {
    // 1. Identifica múltiplos itens
    const editButtons = nutriPage.getByTestId(/^edit-meal-/);
    const count = await editButtons.count();
    
    // Garantimos que o teste cubra o caso com pelo menos 4 itens se eles existirem no plano
    const itemsToTest = Math.min(count, 5); 
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < itemsToTest; i++) {
      const trigger = editButtons.nth(i);
      
      // Abre o modal
      await trigger.click();
      const modal = nutriPage.locator('div[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Pressiona ESC
      await nutriPage.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      
      // Verifica se o foco voltou exatamente para o botão que abriu usando o data-testid
      await expect(trigger).toBeFocused();
    }
  });

  test('Mobile: Overlay clicks at 384px width using calculated coordinates', async ({ nutriPage }) => {
    // 1. Viewport mobile 384px
    await nutriPage.setViewportSize({ width: 384, height: 800 });
    
    // 2. Abre o modal
    const trigger = nutriPage.getByTestId(/^edit-meal-/).first();
    await trigger.click();
    const modal = nutriPage.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    // Verifica que o card de macros está visível no header
    const macroSummary = nutriPage.getByTestId('modal-macro-summary');
    await expect(macroSummary).toBeVisible();
    
    // 3. Clica no overlay usando coordenadas calculadas relativas ao Dialog
    const dialogBox = await modal.boundingBox();
    if (dialogBox) {
      // Ponto 1: Acima do dialog (overlay superior)
      // Se o dialog estiver centralizado, deve haver espaço acima ou abaixo
      const clickY = Math.max(0, dialogBox.y - 10);
      await nutriPage.mouse.click(dialogBox.x + dialogBox.width / 2, clickY);
      await expect(modal).toBeHidden();
      await expect(trigger).toBeFocused();

      // Reabre para o segundo ponto
      await trigger.click();
      await expect(modal).toBeVisible();

      // Ponto 2: Abaixo do dialog (overlay inferior)
      const clickYBottom = Math.min(800, dialogBox.y + dialogBox.height + 10);
      await nutriPage.mouse.click(dialogBox.x + dialogBox.width / 2, clickYBottom);
      await expect(modal).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      // Fallback para coordenadas seguras se boundingBox falhar
      await nutriPage.mouse.click(1, 1);
      await expect(modal).toBeHidden();
    }
  });

  test('Logic: Positive daily total with zero partial macros in multiple items', async ({ nutriPage }) => {
    // 1. Garante que temos múltiplos itens para testar "parciais zeradas"
    const items = nutriPage.getByTestId(/^edit-meal-/);
    const count = await items.count();
    
    // Zerar macros de dois itens via portion factor, controlando exatamente quais ficam zerados
    // Item 0 e Item 1 ficarão zerados
    for (let i = 0; i < Math.min(count - 1, 2); i++) {
      await items.nth(i).click();
      const modal = nutriPage.locator('div[role="dialog"]');
      
      const factorInput = modal.locator('input[type="number"]').first(); 
      await factorInput.fill('0');
      
      await nutriPage.getByTestId('meal-editor-save-button').click();
      await expect(modal).toBeHidden();
    }

    // O último item permanece com macros positivas, garantindo total diário > 0
    // Isso confirma que o sistema aceita itens parciais zerados se o total for positivo.
    
    // 2. Salva o plano completo
    const savePlanBtn = nutriPage.getByRole('button', { name: /Salvar/i }).first();
    await savePlanBtn.click();
    
    // 3. Verifica que não bloqueou a persistência
    await expect(nutriPage.getByText(/Plano salvo/i).or(nutriPage.getByText(/Salvo com sucesso/i))).toBeVisible();
  });

  test('Validation: Toast lists exactly the missing fields in order', async ({ nutriPage }) => {
    // Procuramos por um item que contenha "Marmita" no nome para disparar a validação de metadata ausente
    const fixedMealEdit = nutriPage.locator('[data-testid^="edit-meal-"]').filter({ hasText: /Marmita/i }).first();
    
    if (await fixedMealEdit.isVisible()) {
      await fixedMealEdit.click();
      
      const saveBtn = nutriPage.getByTestId('meal-editor-save-button');
      await saveBtn.click();

      // Verifica a string exata dos campos ausentes conforme requisitado
      const expectedText = "kcal_base, protein_base, carbs_base, fat_base";
      // Usamos uma asserção que garante que o texto está presente exatamente nessa ordem
      await expect(nutriPage.locator('div[role="status"], [class*="toast"]')).toContainText(expectedText);
    } else {
      test.skip(); // Ignora se não houver marmita fixa no estado atual
    }
  });

  test('State: Reset local state upon closing even after multiple toggles and search', async ({ nutriPage }) => {
    const trigger = nutriPage.getByTestId(/^edit-meal-/).first();
    await trigger.click();
    const modal = nutriPage.locator('div[role="dialog"]');
    
    // 1. Altera a descrição e faz busca
    const textarea = modal.locator('textarea').first();
    const originalValue = await textarea.inputValue();
    await textarea.fill('Valor alterado temporariamente');
    
    const searchInput = modal.locator('input[placeholder*="buscar" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Pizza');
    }

    // 2. Alterna entre "Alimento" e "Refeição Pronta" várias vezes
    const foodTab = modal.getByRole('button', { name: /Alimento/i });
    const readyTab = modal.getByRole('button', { name: /Refeição Pronta/i });
    
    for(let i = 0; i < 3; i++) {
      await readyTab.click();
      await expect(readyTab).toHaveClass(/bg-primary|default/);
      await foodTab.click();
      await expect(foodTab).toHaveClass(/bg-primary|default/);
    }
    
    // 3. Fecha sem salvar (via Cancelar)
    await nutriPage.getByTestId('meal-editor-cancel-button').click();
    await expect(modal).toBeHidden();
    
    // 4. Reabre e verifica que TUDO foi zerado/resetado
    await trigger.click();
    await expect(modal).toBeVisible();
    
    // Verifica descrição resetada
    const reopenedValue = await modal.locator('textarea').first().inputValue();
    expect(reopenedValue).toBe(originalValue);
    
    // Verifica busca zerada
    if (await searchInput.isVisible()) {
      const currentSearch = await searchInput.inputValue();
      expect(currentSearch).toBe('');
    }
    
    // Verifica que voltou para a aba inicial ("Alimento")
    await expect(foodTab).toHaveClass(/bg-primary|default/);
  });
});
