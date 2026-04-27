import { test, expect } from '@playwright/test';

test.describe('Professional Fixed Link Flow', () => {
  test('should pre-link professional and show registration form directly when using ?nutri=', async ({ page }) => {
    // Simulamos um nutricionista real (precisa existir no banco ou ser mockado)
    // Para o teste, usamos um UUID que sabemos que o PatientRegister tentará buscar
    const professionalId = '00000000-0000-0000-0000-000000000001';
    
    // Navega diretamente para o link fixo
    await page.goto(`/cadastro?nutri=${professionalId}`);
    
    // Verifica se mostra o estado de validação
    const validatingText = page.getByText('Validando convite...');
    // Dependendo da velocidade, pode ser difícil capturar, mas verificamos se o formulário aparece
    
    // O formulário de registro deve aparecer eventualmente
    await expect(page.getByLabel('Nome completo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('WhatsApp')).toBeVisible();
    
    // Verifica se o badge do profissional vinculado está visível (indicando que o vínculo foi travado)
    // O nome pode ser "Profissional" se o fetch falhar ou o mock não estiver completo, mas o elemento deve estar lá
    await expect(page.getByText('Profissional Vinculado')).toBeVisible();
    
    // Garante que NÃO está na tela de "Você foi convidado!" (que exige clique em Aceitar)
    await expect(page.getByText('Aceitar Convite e Continuar')).not.toBeVisible();
  });

  test('should show welcome screen for individual codes but block form until acceptance', async ({ page }) => {
    const inviteCode = 'TESTCODE123';
    await page.goto(`/cadastro?code=${inviteCode}`);
    
    // Para códigos individuais, ainda queremos a tela de boas-vindas (para confirmação de dados)
    // Mas o formulário de cadastro deve estar OCULTO até aceitar
    await expect(page.getByText('Você foi convidado!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Nome completo')).not.toBeVisible();
    
    // Ao clicar em aceitar, o formulário deve aparecer
    await page.getByText('Aceitar Convite e Continuar').click();
    await expect(page.getByLabel('Nome completo')).toBeVisible();
  });
});
