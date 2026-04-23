
import { test, expect } from "./fixtures";

/**
 * E2E: Manual Meal Plan Creation & Publication
 * 
 * Garante que:
 * 1. O profissional pode criar um plano "Do Zero" (Modo Manual).
 * 2. Pode selecionar o modo de validação Manual.
 * 3. O plano salva e publica corretamente mesmo sem validação automática.
 */
test.describe("Manual Meal Plan Flow", () => {
  
  test("nutricionista cria plano do zero, valida manual e publica", async ({ nutriPage }) => {
    // 1. Acessar lista de pacientes
    await nutriPage.goto("/patients");
    
    // 2. Selecionar o primeiro paciente de teste
    // Usamos um filtro para garantir que estamos clicando em uma linha de paciente
    const patientRow = nutriPage.locator("tr").filter({ hasText: /Paciente|Teste/i }).first();
    await expect(patientRow).toBeVisible({ timeout: 15000 });
    await patientRow.click();
    
    // 3. Criar plano "Do Zero"
    // Pode estar dentro de um dropdown de "Novo Plano" ou visível se não houver planos
    const doZeroBtn = nutriPage.getByRole("button", { name: /Do Zero|Criar Primeiro Plano/i }).first();
    await expect(doZeroBtn).toBeVisible({ timeout: 15000 });
    await doZeroBtn.click();
    
    // 4. Aguardar redirecionamento para o Builder
    await nutriPage.waitForURL(/\/plan-builder\//, { timeout: 15000 });
    
    // 5. Acionar Validação e escolher modo MANUAL
    await nutriPage.getByRole("button", { name: /Validar/i }).first().click();
    
    const manualOption = nutriPage.getByText(/Validar manualmente/i);
    await expect(manualOption).toBeVisible();
    await manualOption.click();
    
    // 6. Verificar se o badge de "MODO MANUAL" aparece
    await expect(nutriPage.getByText(/MODO MANUAL/i)).toBeVisible();
    
    // 7. Salvar o plano
    await nutriPage.getByRole("button", { name: /Salvar/i }).first().click();
    // Esperar toast ou feedback de salvamento
    await expect(nutriPage.getByText(/Plano salvo/i).or(nutriPage.getByText(/Salvo com sucesso/i))).toBeVisible();
    
    // 8. Publicar o plano
    await nutriPage.getByRole("button", { name: /Publicar/i }).first().click();
    
    // 9. Lidar com o aviso de "Publicar sem validação" (comum no modo manual)
    const warningAction = nutriPage.getByRole("button", { name: /Publicar mesmo assim/i });
    if (await warningAction.isVisible({ timeout: 5000 })) {
      await warningAction.click();
    }
    
    // 10. Confirmar sucesso da publicação
    await expect(nutriPage.getByText(/Plano publicado/i).or(nutriPage.getByText(/Publicado com sucesso/i))).toBeVisible();
    
    // 11. Validar que aparece como publicado na URL de visualização (MealPlanEditorV2)
    const currentUrl = nutriPage.url();
    const editorUrl = currentUrl.replace("/plan-builder/", "/meal-plans/");
    await nutriPage.goto(editorUrl);
    
    // Deve exibir o badge de Publicado
    await expect(nutriPage.getByText(/Publicado/i).first()).toBeVisible();
  });
});
