/**
 * FitJourney E2E — Shared Fixtures & Helpers
 * 
 * Provides authenticated page contexts, test users, and utilities.
 */
import { test as base, expect, type Page } from "@playwright/test";

// Test credentials — set via env or use defaults
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@fitjourney.app";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "E2eTest@2026!";

const NUTRI_EMAIL = process.env.E2E_NUTRI_EMAIL || "e2e-nutri@fitjourney.app";
const NUTRI_PASSWORD = process.env.E2E_NUTRI_PASSWORD || "E2eNutri@2026!";

export interface TestFixtures {
  authenticatedPage: Page;
  nutriPage: Page;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/senha/i).fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).click();

  // Wait for redirect away from auth page
  await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 });
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    await use(page);
  },
  nutriPage: async ({ page }, use) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);
    await use(page);
  },
});

export { expect };
export { TEST_EMAIL, TEST_PASSWORD, NUTRI_EMAIL, NUTRI_PASSWORD };
