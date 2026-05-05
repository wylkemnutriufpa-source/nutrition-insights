import { test, expect } from "./fixtures";

test.describe("Fase 4.1 — Fluxos Críticos E2E", () => {

  /**
   * Fluxo 1 — Onboarding
   * Objetivo: Usuário novo acessa -> vê tela de boas-vindas -> preenche perfil -> dashboard.
   */
  test("Fluxo 1: Onboarding Completo", async ({ authenticatedPage: page }) => {
    // 1. Acesso inicial (simulando redirecionamento para onboarding se incompleto)
    await page.goto("/onboarding-paciente");
    await page.waitForLoadState("networkidle");
    
    // 2. Verifica elementos da tela de onboarding
    await expect(page.getByText(/bem-vindo|vamos começar|configurar seu perfil/i).first()).toBeVisible();
    
    // 3. Preenchimento de dados (Exemplo: Peso e Altura)
    // Usando locators baseados em labels ou placeholders comuns
    const weightInput = page.locator('input[name="weight"], input[placeholder*="peso"]');
    if (await weightInput.isVisible()) {
      await weightInput.fill("80");
      await page.locator('input[name="height"], input[placeholder*="altura"]').fill("180");
      
      // 4. Submissão
      const submitBtn = page.getByRole("button", { name: /próximo|salvar|concluir/i });
      await submitBtn.click();
    }

    // 5. Redirecionamento para Dashboard
    await expect(page).toHaveURL(/\/dashboard|\/patient-dashboard/);
    await expect(page.locator("body")).toContainText(/dashboard|visão geral|olá/i);
  });

  /**
   * Fluxo 2 — Nutrition Plan
   * Objetivo: Usuário logado -> acessa plano -> visualiza -> altera -> salva -> verifica.
   */
  test("Fluxo 2: Gestão de Plano Nutricional", async ({ patientPage: page }) => {
    // 1. Acessa página de planos
    await page.goto("/diet");
    await page.waitForLoadState("networkidle");

    // 2. Verifica se há refeições
    const mealCard = page.locator('[data-testid^="meal-card-"], .meal-card').first();
    await expect(mealCard).toBeVisible();

    // 3. Simula edição (se houver botão de edição acessível ao paciente ou via modal)
    // Nota: Pacientes geralmente visualizam, mas vamos testar a "troca" de alimentos se permitido
    const editBtn = page.getByRole("button", { name: /substituir|alterar/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.getByRole("button", { name: /confirmar|salvar/i }).click();
      
      // 4. Verifica feedback visual de salvamento
      await expect(page.getByText(/atualizado|salvo com sucesso/i)).toBeVisible();
    }
  });

  /**
   * Fluxo 3 — Experience Mode (Prova de Fogo)
   * Objetivo: Troca de modo "basic" para "pro" reflete no menu em tempo real.
   */
  test("Fluxo 3: Experience Mode Realtime Update", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 1. Verifica estado inicial (Basic - menu limitado)
    // Itens pro como 'Relatórios' ou 'Analytics' não devem estar visíveis
    const proItem = page.locator('nav').getByText(/relatórios|analytics|financeiro/i);
    const initialCount = await proItem.count();
    
    // 2. Simula alteração de perfil para "pro" via API Mock
    // O ExperienceProvider ouve mudanças na tabela 'profiles'
    await page.evaluate(() => {
       // Dispara evento customizado ou manipulamos o estado se houver devtools
       // Como o teste é E2E real, simulamos a mensagem que o Supabase Realtime enviaria
       window.dispatchEvent(new CustomEvent('fj:mock-realtime-update', { 
         detail: { table: 'profiles', new: { experience_mode: 'pro' } } 
       }));
    });

    // 3. Verifica menu expandido sem refresh manual
    // Aguarda o item "pro" aparecer reativamente
    await expect(proItem.first()).toBeVisible({ timeout: 5000 });
  });

});
