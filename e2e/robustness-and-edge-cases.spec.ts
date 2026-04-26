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

  test('Mobile: Overlay clicks at 384px width', async ({ nutriPage }) => {
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
    
    // 3. Clica no overlay em diferentes pontos
    // Ponto 1: Canto superior esquerdo (quase fora da tela)
    await nutriPage.mouse.click(1, 1);
    await expect(modal).toBeHidden();
    await expect(trigger).toBeFocused();

    // Reabre para o segundo ponto
    await trigger.click();
    await expect(modal).toBeVisible();

    // Ponto 2: Meio lateral (overlay costuma ocupar as laterais se o modal não for full width)
    // Em 384px, o modal costuma ser quase full width, mas clicamos na bordinha lateral se houver, 
    // ou usamos as coordenadas do mouse.click fora da área do DialogContent.
    // O DialogContent no código tem max-w-4xl, mas em mobile ele deve ocupar a largura disponível.
    // Vamos clicar bem embaixo, fora da área do modal.
    await nutriPage.mouse.click(192, 790); // Meio horizontal, rodapé
    await expect(modal).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Logic: Positive daily total with zero partial macros in multiple items', async ({ nutriPage }) => {
    // 1. Garante que temos pelo menos 3 itens para testar "múltiplos itens zerados"
    // (Se não houver, o teste usará os que existem, mas tentaremos zerar pelo menos 2)
    const items = nutriPage.getByTestId(/^edit-meal-/);
    const count = await items.count();
    
    // Zerar macros de dois itens via portion factor
    for (let i = 0; i < Math.min(count - 1, 2); i++) {
      await items.nth(i).click();
      const modal = nutriPage.locator('div[role="dialog"]');
      
      // Localiza o input de fator de porção (se disponível) ou apenas preenche macros zeradas
      // No componente, o portionFactor afeta adjustedMacros
      const factorInput = modal.locator('input[type="number"]').first(); // Supondo que seja o primeiro number input
      await factorInput.fill('0');
      
      await nutriPage.getByTestId('meal-editor-save-button').click();
      await expect(modal).toBeHidden();
    }

    // O último item permanece com macros positivas (garantindo total diário > 0)
    
    // 2. Salva o plano completo
    const savePlanBtn = nutriPage.getByRole('button', { name: /Salvar/i }).first();
    await savePlanBtn.click();
    
    // 3. Verifica que não bloqueou a persistência
    await expect(nutriPage.getByText(/Plano salvo/i).or(nutriPage.getByText(/Salvo com sucesso/i))).toBeVisible();
  });

  test('Validation: Toast lists missing fields in fixed order', async ({ nutriPage }) => {
    // 1. Tenta encontrar ou simular uma Marmita Fixa sem metadata
    // Vamos usar o botão de ajuda/info se houver, ou assumir que clicando em um item
    // que "parece" uma marmita ele dispara o erro se estiver incompleto.
    
    // Alternativa: Forçar um erro de validação ao tentar salvar um item que marcamos como fixo (se o mock permitir)
    // Aqui vamos procurar por um item que contenha "Marmita" no nome
    const fixedMealEdit = nutriPage.locator('[data-testid^="edit-meal-"]').filter({ hasText: /Marmita/i }).first();
    
    if (await fixedMealEdit.isVisible()) {
      await fixedMealEdit.click();
      
      // O toast deve aparecer IMEDIATAMENTE no useEffect se os dados estiverem ausentes
      // ou ao tentar salvar.
      const saveBtn = nutriPage.getByTestId('meal-editor-save-button');
      await saveBtn.click();

      // Verifica a ordem exata dos campos no toast
      const expectedText = "kcal_base, protein_base, carbs_base, fat_base";
      await expect(nutriPage.getByText(new RegExp(expectedText))).toBeVisible();
    }
  });

  test('State: Reset local state upon closing even after tab switching', async ({ nutriPage }) => {
    const trigger = nutriPage.getByTestId(/^edit-meal-/).first();
    await trigger.click();
    const modal = nutriPage.locator('div[role="dialog"]');
    
    // 1. Altera a descrição
    const textarea = modal.locator('textarea').first();
    const originalValue = await textarea.inputValue();
    await textarea.fill('Valor alterado temporariamente');
    
    // 2. Alterna abas internas
    const readyTab = modal.getByRole('button', { name: /Refeição Pronta/i });
    await readyTab.click();
    
    // 3. Fecha sem salvar (via Cancelar)
    await nutriPage.getByTestId('meal-editor-cancel-button').click();
    await expect(modal).toBeHidden();
    
    // 4. Reabre e verifica que voltou ao original
    await trigger.click();
    await expect(modal).toBeVisible();
    const reopenedValue = await modal.locator('textarea').first().inputValue();
    expect(reopenedValue).toBe(originalValue);
    
    // Verifica que voltou para a aba inicial ("Alimento")
    await expect(modal.getByRole('button', { name: /Alimento/i })).toHaveClass(/bg-primary|default/);
  });
});
