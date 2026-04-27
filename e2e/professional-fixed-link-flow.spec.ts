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
 * - Convite inválido/expirado redireciona para erro 400 amigável (nunca 404).
 */

test.describe('Fluxo de convite padronizado — todos os links', () => {
  test('?nutri= mostra tela de boas-vindas com foto e CTA padronizado', async ({ page }) => {
    const professionalId = '00000000-0000-0000-0000-000000000001';

    await page.goto(`/cadastro?nutri=${professionalId}`);

    // Tela de boas-vindas padronizada deve aparecer
    await expect(page.getByText(/Você está sendo convidado/i)).toBeVisible({ timeout: 10000 });

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

  test('código inválido redireciona para erro amigável (sem 404)', async ({ page }) => {
    await page.goto('/cadastro?code=CODIGO-INEXISTENTE-XYZ');

    // Não pode aparecer 404
    await expect(page.getByRole('heading', { name: /Página não encontrada/i })).toHaveCount(0);

    // Deve aparecer mensagem amigável de convite inválido/expirado
    await expect(
      page.getByText(/convite inválido|expirado|não encontrado/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
