import { test, expect } from '@playwright/test';

test.describe('Fluid Onboarding Flow for Link Invitations', () => {
  test('should register via link and reach consent immediately without blocks', async ({ page }) => {
    // 1. Visit registration with nutri param
    const professionalId = 'd32c56a4-a484-472c-827a-90ed0cdd05b8'; 
    await page.goto(`/cadastro?nutri=${professionalId}`);
    
    // 2. Accept welcome screen
    await expect(page.locator('text=Você está sendo convidado')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Cadastrar com este Profissional")');
    
    // 3. Fill form
    const email = `fluid_test_${Date.now()}@example.com`;
    await page.fill('input[name="name"]', 'Fluid Test Patient');
    await page.fill('input[type="email"]', email);
    await page.fill('input[name="whatsapp"]', '11988887777');
    await page.fill('input[type="password"]', 'password123');
    
    // 4. Submit and verify session creation
    await page.click('button[type="submit"]');
    
    // 5. Verify direct entry to onboarding/consent
    // The system should detect lead_created/awaiting_consent and NOT show OnboardingGateScreen blocking content
    await expect(page.locator('text=Proteção dos Seus Dados Clínicos')).toBeVisible({ timeout: 20000 });
    
    // 6. Accept consent
    await page.click('button:has-text("Aceitar e Continuar")');
    
    // 7. Verify entry to Anamnesis
    await expect(page).toHaveURL(/\/anamnesis/);
    await expect(page.locator('text=Qual é o seu objetivo principal?')).toBeVisible();
    
    // Telemetry check: Ensure no infinite loading or block messages appeared
    await expect(page.locator('text=Aguarde a confirmação do seu profissional')).not.toBeVisible();
  });
});
