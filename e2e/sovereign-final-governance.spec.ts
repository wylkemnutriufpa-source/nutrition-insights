import { test, expect } from './fixtures';

/**
 * FitJourney — Sovereign Governance E2E Suite
 * 
 * Valida o runtime soberano V3 e a blindagem contra legado.
 */

test.describe('Sovereign Governance V3', () => {
  test('should maintain macro integrity from generation to patient view', async ({ page }) => {
    // 1. Onboarding/Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'nutri@soberano.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Generation Flow
    await page.goto('/dashboard');
    await page.click('text=Novo Plano');
    await page.click('text=Gerar Automaticamente');
    
    // Esperar motor V3 concluir
    await expect(page.locator('text=Plano Gerado com Sucesso')).toBeVisible({ timeout: 30000 });

    // Capturar macros no editor
    const editorKcal = await page.locator('[data-testid="total-kcal"]').innerText();
    expect(Number(editorKcal)).toBeGreaterThan(0);

    // 3. Publish & Snapshot
    await page.click('text=Publicar para Paciente');
    await expect(page.locator('text=Publicado')).toBeVisible();

    // 4. Patient View (Passive Consumer)
    // Simulamos a troca de contexto ou navegamos para a view do paciente
    const planId = page.url().split('/').pop();
    await page.goto(`/patient/plan/${planId}`);

    // Validar macros 1:1 (Passive Consumer Rule)
    const patientKcal = await page.locator('[data-testid="patient-total-kcal"]').innerText();
    expect(patientKcal).toBe(editorKcal);

    // 5. Anti-Regression Check
    // O sistema não deve ter logado nenhum erro CRITICAL na telemetria durante este fluxo
    await page.goto('/sovereign');
    const criticalIncidents = await page.locator('text=CRITICAL').count();
    expect(criticalIncidents).toBe(0);
  });

  test('should block legacy recalculations via Fatal Guards', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Injetar uma chamada a uma função proibida via console para testar o guard
    // Usamos o window para acessar as funções se estiverem expostas ou testamos via fluxo de UI que as usaria
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // Simular uma ação que dispararia o recalculateMacros legado (se ainda existisse um atalho na UI)
    // Como bloqueamos no código, qualquer tentativa deve resultar em throw capturado pelo console
    await page.evaluate(() => {
      try {
        // @ts-ignore - Tentativa de acessar função que deve estar protegida
        window.recalculateMacros?.({ name: 'Teste' }, 100);
      } catch (e) {
        console.error('Sovereign Guard Blocked Execution:', e.message);
      }
    });

    expect(logs.some(l => l.includes('Sovereign Guard Blocked Execution') || l.includes('BLOQUEIO SOBERANO'))).toBeTruthy();
  });
});
