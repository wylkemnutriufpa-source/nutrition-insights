
import { test, expect } from "./fixtures";

/**
 * E2E: Meal Plan Fluidity & Macro Placeholder Render
 * 
 * Garante que:
 * 1. O nutricionista pode salvar/publicar planos mesmo se os totais estiverem zerados (não bloqueia).
 * 2. O paciente vê fallbacks "..." e alertas de sincronização em vez de 0 ou NaN.
 */
test.describe("Meal Plan Fluidity & Consistency", () => {
  
  test("nutricionista pode publicar plano com macros zerados e paciente vê fallbacks", async ({ nutriPage, unblockedPatientPage }) => {
    // 1. Nutricionista abre o editor de plano do paciente
    // Assumimos que existe um link para o editor ou vamos direto para a rota se soubermos o ID.
    // Para o teste, vamos navegar até a lista de pacientes e abrir o primeiro.
    await nutriPage.goto("/patients");
    const firstPatient = nutriPage.locator("tr").filter({ hasText: "Paciente" }).first();
    await firstPatient.click();
    
    // Abrir editor de plano
    await nutriPage.getByRole("button", { name: /plano alimentar/i }).click();
    
    // 2. Limpar o plano para garantir que total_calories seja 0 (ou quase 0)
    // Clicar em Ferramentas -> Apagar Plano
    await nutriPage.getByRole("button", { name: /ferramentas/i }).click();
    await nutriPage.getByText(/apagar plano/i).click();
    
    // Confirmar dialog (mocking window.confirm if necessary, but playwright handles it if configured or we can use dialog listener)
    nutriPage.once('dialog', dialog => dialog.accept());
    
    // 3. Adicionar uma refeição "vazia" ou com 0 macros se possível, ou apenas salvar vazio.
    // O sistema agora permite salvar planos vazios conforme a refatoração.
    await nutriPage.getByRole("button", { name: /salvar e publicar/i }).click();
    
    // Esperar toast de sucesso
    await expect(nutriPage.getByText(/publicado com sucesso/i)).toBeVisible();
    
    // 4. Verificar no Dashboard do Paciente
    await unblockedPatientPage.goto("/client/dashboard");
    
    // Deve ver o alerta de sincronização pendente
    const alert = unblockedPatientPage.getByText(/Sincronização do plano pendente/i);
    await expect(alert).toBeVisible();
    
    // Deve ver fallbacks no NextMealWidget se houver algo, ou apenas no resumo global
    // Se o plano está vazio, o NextMealWidget pode não aparecer, então vamos para /my-diet
    await unblockedPatientPage.goto("/my-diet");
    
    // No /my-diet, o MacroSummary deve mostrar "..."
    const macroKcal = unblockedPatientPage.locator('[data-macro="kcal"]').first();
    await expect(macroKcal).toContainText("...");
    
    const syncAlert = unblockedPatientPage.locator('[data-testid="macros-sync-alert"]').first();
    await expect(syncAlert).toBeVisible();
    await expect(syncAlert).toContainText(/Valores nutricionais em cálculo/i);
  });
});
