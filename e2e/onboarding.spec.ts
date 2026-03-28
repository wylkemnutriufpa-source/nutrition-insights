/**
 * FitJourney E2E — Onboarding & Payment Flow
 */
import { test, expect } from "./fixtures";

test.describe("Onboarding Flow", () => {
  test("página de pagamento requerido deve carregar", async ({ authenticatedPage: page }) => {
    await page.goto("/payment-required");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("página de consentimento deve carregar", async ({ authenticatedPage: page }) => {
    await page.goto("/consent-required");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("onboarding paciente deve carregar", async ({ authenticatedPage: page }) => {
    await page.goto("/onboarding-paciente");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Landing Pages", () => {
  test("landing principal deve carregar", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();

    // Should have CTA
    const cta = page.getByRole("link", { name: /começar|iniciar|grátis|teste/i });
    await expect(cta.first()).toBeVisible();
  });

  test("landing nutricionista deve carregar", async ({ page }) => {
    await page.goto("/nutri");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("landing personal deve carregar", async ({ page }) => {
    await page.goto("/personal");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("landing paciente deve carregar", async ({ page }) => {
    await page.goto("/patient");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
