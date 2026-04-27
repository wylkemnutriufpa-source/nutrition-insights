import { test, expect } from '@playwright/test';

/**
 * E2E: padronização do fluxo de convite/cadastro
 *
 * Regra unificada (abril/2026):
 * - TODOS os links suportados (?nutri=ID, ?code=CODE, ?token=TOKEN, e legados
 *   /convite/CODE) devem exibir a tela "Você está sendo convidado!" com a
 *   foto do profissional ANTES do formulário.
 * - O CTA padronizado é "Cadastrar com este Profissional".
 * - O formulário de cadastro só aparece após o clique no CTA.
 * - Convite inválido/expirado redireciona para tela de erro dedicada (nunca 404).
 * - Notificação via WhatsApp deve ser oferecida após o cadastro.
 */

test.describe('Fluxo de convite padronizado — todos os links', () => {
  test('?nutri= mostra tela de boas-vindas com foto real ou fallback e CTA padronizado', async ({ page }) => {
    const professionalId = '00000000-0000-0000-0000-000000000001';

    await page.goto(`/cadastro?nutri=${professionalId}`);

    // Tela de boas-vindas padronizada deve aparecer
    await expect(page.getByText(/Você está sendo convidado/i)).toBeVisible({ timeout: 10000 });

    // Validar presença de foto ou fallback
    const avatar = page.locator('[data-testid="professional-avatar-img"], [data-testid="professional-avatar-fallback"]');
    await expect(avatar).toBeVisible();

    // CTA padronizado
    await expect(page.getByRole('button', { name: /Cadastrar com este Profissional/i })).toBeVisible();

    // Formulário fica oculto até o aceite
    await expect(page.getByLabel('Nome completo')).not.toBeVisible();

    // Clicar no CTA libera o formulário
    await page.getByRole('button', { name: /Cadastrar com este Profissional/i }).click();
    await expect(page.getByLabel('Nome completo')).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('WhatsApp')).toBeVisible();
  });

  test('?code= mostra a mesma tela padronizada com foto e CTA', async ({ page }) => {
    const inviteCode = 'TESTCODE123';
    await page.goto(`/cadastro?code=${inviteCode}`);

    await expect(page.getByText(/Você está sendo convidado/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Cadastrar com este Profissional/i })).toBeVisible();
    await expect(page.getByLabel('Nome completo')).not.toBeVisible();

    await page.getByRole('button', { name: /Cadastrar com este Profissional/i }).click();
    await expect(page.getByLabel('Nome completo')).toBeVisible();
  });

  test('código inválido redireciona para tela de erro dedicada (sem 404)', async ({ page }) => {
    await page.goto('/cadastro?code=CODIGO-INEXISTENTE-XYZ');

    // Não pode aparecer 404
    await expect(page.getByRole('heading', { name: /Página não encontrada/i })).toHaveCount(0);

    // Deve aparecer a tela de erro dedicada
    await expect(page.getByText(/Convite Inválido ou Expirado/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Como pegar o link\?/i)).toBeVisible();
    
    // Deve ter botão para voltar ao login
    await expect(page.getByRole('link', { name: /Já tenho uma conta/i })).toBeVisible();
  });

  test('Fluxo completo de cadastro oferece notificação via WhatsApp', async ({ page }) => {
    const professionalId = '00000000-0000-0000-0000-000000000001';
    const testEmail = `test-${Date.now()}@example.com`;

    await page.goto(`/cadastro?nutri=${professionalId}`);
    await page.getByRole('button', { name: /Cadastrar com este Profissional/i }).click();

    // Preencher formulário
    await page.getByLabel('Nome completo').fill('Teste WhatsApp');
    await page.getByLabel('E-mail').fill(testEmail);
    await page.getByLabel('WhatsApp').fill('11999999999');
    await page.getByLabel('Criar Senha').fill('password123');

    // Mock do sign-up para evitar criar usuários reais no E2E se possível, 
    // mas aqui estamos testando o fluxo real do frontend.
    // O backend pode retornar erro se o email já existir, por isso usamos timestamp.

    await page.getByRole('button', { name: /Finalizar Cadastro/i }).click();

    // Deve mostrar toast de sucesso
    await expect(page.getByText(/Conta criada/i)).toBeVisible({ timeout: 15000 });

    // Deve mostrar o pop-up de notificação WhatsApp
    await expect(page.getByText(/Notificar paciente via WhatsApp\?/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Enviar/i })).toBeVisible();
  });
});
