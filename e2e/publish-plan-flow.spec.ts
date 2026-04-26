
import { test, expect } from "./fixtures";

test.describe("Publish Plan Flow - In-Office Wizard", () => {
  test.setTimeout(60000);

  test("verify overlay progress, retry on failure, and success redirection", async ({ nutriPage }) => {
    const page = nutriPage;

    // 1. Setup: Navigate to a patient and start a session
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Click on the first patient card or row
    const patientRow = page.locator('[data-testid="patient-card"], .patient-row, tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);

    // Click "Consultório FitJourney" or "Iniciar Consulta"
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();
    
    // Wait for the wizard to load
    await page.waitForURL(/\/in-office\/[a-zA-Z0-9-]+/);
    await page.waitForLoadState("networkidle");

    // Skip to step 5 (Finalizar)
    // The code shows STEPS = [{id:1, label: "Cadastro"...}, ..., {id:5, label: "Finalizar"}]
    // We'll click the "Finalizar" step indicator or button
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();
    
    // Ensure we are on the final step
    await expect(page.getByText("Salvar e Enviar ao Paciente")).toBeVisible({ timeout: 10000 });

    // 2. Simulate Backend Failure for the PATCH request
    // We look for the PATCH request to meal_plans
    await page.route("**/rest/v1/meal_plans*", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Simulated backend error" }),
        });
      } else {
        await route.continue();
      }
    });

    const publishBtn = page.getByRole("button", { name: /Salvar e Enviar ao Paciente/i });
    
    // 3. Click Publish and check initial state
    await publishBtn.click();

    // Verify "Publicando..." text and button is disabled
    await expect(page.getByRole("button", { name: /Publicando.../i })).toBeDisabled();

    // Verify Overlay and Progress
    const overlay = page.getByText("Enviando plano...");
    await expect(overlay).toBeVisible();
    
    // Progress should be visible (check for progress bar or percentage text)
    const progressText = page.getByText(/% concluído/);
    await expect(progressText).toBeVisible();

    // 4. Verify Failure State
    await expect(page.getByText("Falha no envio")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Simulated backend error")).toBeVisible();
    
    const retryBtn = page.getByRole("button", { name: /Tentar novamente/i });
    await expect(retryBtn).toBeVisible();

    // 5. Simulate Success for the second attempt
    await page.unroute("**/rest/v1/meal_plans*");
    await page.route("**/rest/v1/meal_plans*", async (route, request) => {
      if (request.method() === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // Click Retry
    await retryBtn.click();

    // Verify success indication
    await expect(page.getByText("Plano Ativo e Enviado!")).toBeVisible({ timeout: 15000 });
    
    // Overlay should be gone
    await expect(overlay).not.toBeVisible();

    // 6. Redirect to Patient Profile
    const viewProfileBtn = page.getByRole("button", { name: /Ver perfil do paciente/i });
    await viewProfileBtn.click();

    // Check redirection URL
    await page.waitForURL(/\/patients\/[a-zA-Z0-9-]+/);
    
    // Verify plan is active on profile (badge check)
    await expect(page.locator("text=/publicado|ativo/i").first()).toBeVisible();
  });

  test("mobile coverage: publish flow touch targets", async ({ nutriPage }) => {
    const page = nutriPage;
    await page.setViewportSize({ width: 375, height: 812 });

    // Navigate to a patient (we can skip the full flow setup here for speed if we just want to check layout)
    await page.goto("/patients");
    const patientRow = page.locator('tr').filter({ hasText: /./ }).first();
    await patientRow.click();
    
    const startBtn = page.getByRole("button", { name: /Consultório|Iniciar Consulta/i }).first();
    await startBtn.click();
    
    // Go to step 5
    const step5 = page.getByRole("button", { name: /5|Finalizar/i }).first();
    await step5.click();

    const publishBtn = page.getByRole("button", { name: /Salvar e Enviar ao Paciente/i });
    
    // Validate Touch Target Size (Min 44px according to HIG/Material)
    const box = await publishBtn.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    // Run flow and check overlay doesn't have weird overlaps
    // (In mobile, it should be full screen)
    await publishBtn.click();
    const overlayCard = page.locator('.fixed.inset-0 .rounded-xl, .fixed.inset-0 .border-primary\\/20');
    await expect(overlayCard).toBeVisible();
    
    // Ensure it's centered
    const cardBox = await overlayCard.boundingBox();
    const viewport = page.viewportSize();
    if (cardBox && viewport) {
      expect(cardBox.x + cardBox.width / 2).toBeCloseTo(viewport.width / 2, 1);
    }
  });
});
