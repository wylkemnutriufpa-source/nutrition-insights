/**
 * FitJourney E2E — Auth Flow
 */
import { test, expect } from "@playwright/test";

test.describe("Autenticação", () => {
  test("deve exibir página de login", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: /entrar|login|acessar/i })).toBeVisible();
  });

  test("deve rejeitar credenciais inválidas", async ({ page }) => {
    await page.goto("/auth");
    await page.getByPlaceholder(/email/i).fill("invalid@test.com");
    await page.getByPlaceholder(/senha/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();
    
    // Should show error or stay on auth page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/auth/);
  });

  test("deve fazer login com credenciais válidas", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL || "e2e-test@fitjourney.app";
    const password = process.env.E2E_TEST_PASSWORD || "E2eTest@2026!";

    await page.goto("/auth");
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/senha/i).fill(password);
    await page.getByRole("button", { name: /entrar|login|acessar/i }).click();

    await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 });
    expect(page.url()).not.toContain("/auth");
  });
});
