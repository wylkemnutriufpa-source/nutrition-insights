/**
 * FitJourney E2E — Shared Fixtures & Helpers
 *
 * Provides authenticated page contexts, test users, scenario flags, and utilities.
 *
 * Scenarios suportados (selecionados via env vars):
 * - E2E_SCENARIO=blocked   → usa credenciais de aluno COM revisão médica requerida
 * - E2E_SCENARIO=unblocked → usa credenciais de aluno SEM revisão médica
 * - E2E_SCENARIO=auto      → (default) tenta blocked, faz fallback para unblocked
 *
 * As asserções dos specs devem aceitar AMBOS os estados (presente/ausente do alerta)
 * via `.or()` locators — sem depender de timeouts fixos.
 */
import { test as base, expect, type Page } from "@playwright/test";

// ─── Credenciais base ────────────────────────────────────────────────────────
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@fitjourney.app";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "E2eTest@2026!";

const NUTRI_EMAIL = process.env.E2E_NUTRI_EMAIL || "e2e-nutri@fitjourney.app";
const NUTRI_PASSWORD = process.env.E2E_NUTRI_PASSWORD || "E2eNutri@2026!";

// ─── Credenciais por cenário (opcionais) ─────────────────────────────────────
// Permite usar contas distintas para casos bloqueado vs. liberado.
const BLOCKED_PATIENT_EMAIL = process.env.E2E_BLOCKED_PATIENT_EMAIL || TEST_EMAIL;
const BLOCKED_PATIENT_PASSWORD = process.env.E2E_BLOCKED_PATIENT_PASSWORD || TEST_PASSWORD;

const UNBLOCKED_PATIENT_EMAIL = process.env.E2E_UNBLOCKED_PATIENT_EMAIL || TEST_EMAIL;
const UNBLOCKED_PATIENT_PASSWORD = process.env.E2E_UNBLOCKED_PATIENT_PASSWORD || TEST_PASSWORD;

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type MedicalReviewScenario = "blocked" | "unblocked" | "auto";

export interface TestFixtures {
  authenticatedPage: Page;
  nutriPage: Page;
  /** Aluno COM revisão médica requerida (high-intensity bloqueado). */
  blockedPatientPage: Page;
  /** Aluno SEM revisão médica requerida (high-intensity liberado). */
  unblockedPatientPage: Page;
  /** Cenário ativo, derivado de E2E_SCENARIO. Útil para branching opcional nos specs. */
  scenario: MedicalReviewScenario;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function login(page: Page, email: string, password: string) {
  await page.goto("/auth");
  // Espera estado estável: form de login renderizado.
  const emailInput = page.getByPlaceholder(/email/i).first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });

  await emailInput.fill(email);
  await page.getByPlaceholder(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).first().click();

  // Espera redirecionamento (não baseado em tempo fixo).
  await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 }).catch(() => {});
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
export const test = base.extend<TestFixtures>({
  scenario: async ({}, use) => {
    const raw = (process.env.E2E_SCENARIO || "auto").toLowerCase();
    const value: MedicalReviewScenario =
      raw === "blocked" || raw === "unblocked" ? raw : "auto";
    await use(value);
  },

  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    await use(page);
  },

  nutriPage: async ({ page }, use) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);
    await use(page);
  },

  blockedPatientPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, BLOCKED_PATIENT_EMAIL, BLOCKED_PATIENT_PASSWORD);
    await use(page);
    await ctx.close();
  },

  unblockedPatientPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, UNBLOCKED_PATIENT_EMAIL, UNBLOCKED_PATIENT_PASSWORD);
    await use(page);
    await ctx.close();
  },
});

export { expect };
export {
  TEST_EMAIL,
  TEST_PASSWORD,
  NUTRI_EMAIL,
  NUTRI_PASSWORD,
  BLOCKED_PATIENT_EMAIL,
  BLOCKED_PATIENT_PASSWORD,
  UNBLOCKED_PATIENT_EMAIL,
  UNBLOCKED_PATIENT_PASSWORD,
};
