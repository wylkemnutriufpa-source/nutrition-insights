import { test, expect } from "./fixtures";

/**
 * FitJourney E2E — Link Security & Signature Validation
 */

test.describe("Security: Registration Link Validation", () => {
  
  test("deve bloquear cadastro se o parâmetro 'sig' for alterado", async ({ page }) => {
    // A valid link would look like /cadastro?nutri=UUID&sig=VALID_HASH
    const nutriId = "67f47696-a778-4ada-9ff9-9615fb7a7c48"; // Fixture nutri
    const invalidSig = "tampered_signature_123";
    
    await page.goto(`/cadastro?nutri=${nutriId}&sig=${invalidSig}`);
    
    // The page should show an error toast or message
    await expect(page.getByText(/Link de registro inválido ou alterado/i)).toBeVisible();
    
    // The "Criar Conta" button should be disabled or the submission should fail
    const submitBtn = page.getByRole("button", { name: /Criar Conta/i });
    
    // Attempt to fill and submit anyway
    await page.getByLabel(/Nome completo/i).fill("Test Security User");
    await page.getByLabel(/E-mail/i).fill("security-test@example.com");
    await page.getByLabel(/Senha/i).fill("Password123!");
    
    // If button is not disabled, clicking it should still trigger a validation error
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await expect(page.getByText(/Vínculo de profissional inválido/i)).toBeVisible();
    } else {
      // Button is disabled, which is also a success for the security test
      expect(await submitBtn.isDisabled()).toBeTruthy();
    }
  });
});
