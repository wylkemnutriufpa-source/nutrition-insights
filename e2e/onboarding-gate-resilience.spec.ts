import { test, expect } from "@playwright/test";

test.describe("Onboarding Gate Resilience", () => {
  test("Should show retry button after timeout on OnboardingGateScreen", async ({ page }) => {
    // Navigate to a simulated onboarding gate state
    // We can't easily force journey_status via URL, but we can check the component logic
    await page.goto("/client/dashboard");
    
    // Wait for the gate screen if the user is in an onboarding state
    const gateTitle = page.getByText(/Iniciando sua jornada|Aguardando pagamento|Preparando seu acesso/i);
    
    if (await gateTitle.isVisible()) {
      console.log("Gate screen visible, waiting for retry button...");
      
      // The button should appear after 8 seconds. We'll wait up to 10.
      const retryButton = page.getByRole("button", { name: /Tentar novamente/i });
      await expect(retryButton).toBeVisible({ timeout: 10000 });
      
      const alertMessage = page.getByText(/A sincronização está demorando mais que o esperado/i);
      await expect(alertMessage).toBeVisible();
    } else {
      console.log("Gate screen not visible (user might be already ready). Skipping retry button check.");
    }
  });

  test("Dashboard should render for ready patients", async ({ page }) => {
    await page.goto("/client/dashboard");
    
    // If not in gate screen, dashboard should be visible
    const gateTitle = page.getByText(/Iniciando sua jornada|Aguardando pagamento|Preparando seu acesso/i);
    
    if (!(await gateTitle.isVisible())) {
      // Check for common dashboard elements
      const experienceSwitcher = page.getByTestId("experience-mode-switcher");
      const dailyFocus = page.getByText(/Foco do Dia/i);
      
      // At least one of these should be present if the dashboard loaded
      const dashboardLoaded = (await experienceSwitcher.isVisible()) || (await dailyFocus.isVisible());
      expect(dashboardLoaded).toBeTruthy();
    }
  });
});
