import { test, expect } from "./fixtures";

/**
 * FitJourney E2E — Complete Patient Onboarding Flow
 * 
 * Validates the full sequence: 
 * 1. Access via link
 * 2. Accept Consent (LGPD)
 * 3. Complete Anamnesis
 * 4. Verify status change in Onboarding Tracker (Professional view)
 */

test.describe("Comprehensive Patient Onboarding", () => {
  
  test("deve completar onboarding e atualizar status no rastreador", async ({ browser, nutriPage }) => {
    // 1. Setup: Create a unique patient ID (simulated or use fixture)
    // For this test, we'll use a test user and ensure they start at the consent page.
    
    const patientContext = await browser.newContext();
    const patientPage = await patientContext.newPage();
    
    // Login as a patient
    await patientPage.goto("/auth");
    await patientPage.getByPlaceholder(/email/i).fill("e2e-test@fitjourney.app");
    await patientPage.getByPlaceholder(/senha/i).fill("E2eTest@2026!");
    await patientPage.getByRole("button", { name: /entrar/i }).click();
    
    // Should be redirected to consent if not yet accepted
    // (If already accepted, we navigate there manually for the test)
    await patientPage.goto("/consent-required");
    
    // 2. Accept Consent
    await expect(patientPage.getByText(/Proteção dos Seus Dados Clínicos/i)).toBeVisible();
    await patientPage.locator("button[role='checkbox']").click(); // Accept checkbox
    await patientPage.getByRole("button", { name: /Aceitar e Continuar/i }).click();
    
    // 3. Complete Anamnesis
    await expect(patientPage).toHaveURL(/\/anamnesis/);
    
    // Step 1: Goal
    await patientPage.getByText(/Emagrecer/i).click();
    await patientPage.getByRole("button", { name: /Avançar/i }).click();
    
    // Step 2: Sex
    await patientPage.getByText(/Masculino/i).click();
    await patientPage.getByRole("button", { name: /Avançar/i }).click();
    
    // Skip some steps for speed if the UI allows, or fill them
    // Step 3: Age
    await patientPage.getByRole("button", { name: /Avançar/i }).click();
    
    // Step 4: Weight
    await patientPage.getByPlaceholder(/Ex: 72/i).fill("80");
    await patientPage.getByRole("button", { name: /Avançar/i }).click();
    
    // Step 5: Height
    await patientPage.getByPlaceholder(/Ex: 170/i).fill("180");
    await patientPage.getByRole("button", { name: /Avançar/i }).click();
    
    // ... Continue until final step
    // For the sake of this test, we'll assume the last step has a "Finalizar" button
    // Let's look for a button that says "Finalizar" or "Concluir"
    
    // We can use a loop or just target the final button if we know it
    const finishBtn = patientPage.getByRole("button", { name: /Finalizar|Concluir|Salvar/i });
    while (!(await finishBtn.isVisible())) {
      const nextBtn = patientPage.getByRole("button", { name: /Avançar/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      } else {
        break;
      }
    }
    
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
    }
    
    // 4. Verify Professional View (Onboarding Tracker)
    await nutriPage.goto("/onboarding-tracker");
    
    // Check if the patient status has changed (should be "anamnese_concluida" or similar)
    // We look for the patient name in the list and check its status column
    const patientRow = nutriPage.getByRole("row").filter({ hasText: "E2E Test User" });
    await expect(patientRow.getByText(/Concluída|Finalizada/i)).toBeVisible();
    
    await patientContext.close();
  });
});
