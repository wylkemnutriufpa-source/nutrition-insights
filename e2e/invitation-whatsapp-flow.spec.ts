import { test, expect } from '@playwright/test';

test.describe('Fluxo de Convite e Notificação WhatsApp', () => {
  const TEST_PROF_ID = '00000000-0000-0000-0000-000000000000'; // Mock ou ID real de teste
  
  test('Deve exibir tela de boas-vindas consistente para link ?nutri=', async ({ page }) => {
    await page.goto(`/cadastro?nutri=${TEST_PROF_ID}`);
    
    // Validar rótulos padronizados
    await expect(page.getByText('Você está sendo convidado!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cadastrar com este Profissional' })).toBeVisible();
    
    // Verificar se a foto do profissional (ou placeholder) está lá
    const profImage = page.locator('img[alt*="Profissional"]');
    const placeholder = page.locator('svg.text-primary'); // Fallback icon
    await expect(profImage.or(placeholder).first()).toBeVisible();
  });

  test('Deve exibir tela de boas-vindas consistente para link ?code=', async ({ page }) => {
    // Usando um código que provavelmente falha mas aciona a lógica de carregamento/validação
    await page.goto(`/cadastro?code=INVALID_TEST_CODE`);
    
    // Mesmo com código inválido, se houver nutri no banco ele deve tentar mostrar ou erro 400 amigável
    // Se o código for inválido e não tiver nutri, deve mostrar erro amigável (não 404)
    const errorMsg = page.getByText(/Vínculo de profissional não identificado|Este código não foi encontrado/i);
    await expect(errorMsg).toBeVisible();
    await expect(page.getByText('404')).not.toBeVisible();
  });

  test('Deve redirecionar amigavelmente para convites expirados/inválidos', async ({ page }) => {
    await page.goto('/cadastro?code=expirado123');
    
    // Deve mostrar mensagem clara em vez de 404
    await expect(page.getByText(/código não foi encontrado|inválido|expirado/i)).toBeVisible();
    await expect(page.locator('h1')).not.toContainText('404');
  });

  test('Deve mostrar pop-up de notificação WhatsApp após ações críticas', async ({ page }) => {
    // Simular preenchimento de cadastro para disparar a notificação
    await page.goto(`/cadastro?nutri=${TEST_PROF_ID}`);
    await page.getByRole('button', { name: 'Cadastrar com este Profissional' }).click();
    
    await page.fill('input[id="name"]', 'Paciente Teste WhatsApp');
    await page.fill('input[id="email"]', `test_wa_${Date.now()}@example.com`);
    await page.fill('input[id="whatsapp"]', '11999999999');
    await page.fill('input[id="password"]', 'password123');
    
    // Interceptar chamada do supabase para evitar erro real de auth
    await page.route('**/auth/v1/signup**', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ user: { id: 'test-user-id' } }) });
    });
    
    await page.getByRole('button', { name: 'Concluir Cadastro' }).click();
    
    // Verificar se o toast de notificação WhatsApp aparece
    await expect(page.getByText('Notificar paciente via WhatsApp?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
  });
});
