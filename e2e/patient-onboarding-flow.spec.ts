import { test, expect } from '@playwright/test';

test.describe('Patient Invitation and Onboarding Flow', () => {
  test('should create patient via invite link and redirect to onboarding consent', async ({ page }) => {
    // 1. Arrange: Use a known professional ID or mock
    // For this test, we'll assume a professional with ID '00000000-0000-0000-0000-000000000000' exists or use a real one if available
    const professionalId = 'd32c56a4-a484-472c-827a-90ed0cdd05b8'; // Example ID from logs
    const inviteUrl = `/cadastro?nutri=${professionalId}`;
    
    await page.goto(inviteUrl);
    
    // 2. Act: Complete the registration form
    const randomEmail = `test_patient_${Date.now()}@example.com`;
    
    // Wait for the "Você está sendo convidado" screen
    await expect(page.locator('text=Você está sendo convidado')).toBeVisible();
    await page.click('button:has-text("Cadastrar com este Profissional")');
    
    await page.fill('input[name="name"]', 'Test Patient E2E');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[name="whatsapp"]', '11999999999');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // 3. Assert: Verify no infinite loading and redirection to consent
    // We expect the "Sucesso" screen or direct redirect
    await expect(page.locator('text=Cadastro realizado com sucesso')).toBeVisible({ timeout: 15000 });
    
    // Wait for auto-redirect or click "Ir para o meu painel"
    await page.click('button:has-text("Ir para o meu painel")');
    
    // Check if we land on the onboarding/consent page
    // Based on src/pages/OnboardingPipeline.tsx, the first step is 'consent'
    await expect(page).toHaveURL(/\/onboarding-pipeline/);
    await expect(page.locator('text=Consentimento')).toBeVisible();
    await expect(page.locator('text=Aceito os termos e condições')).toBeVisible();
    
    // Verify loading is gone
    await expect(page.locator('.animate-spin')).not.toBeVisible();
  });
});
