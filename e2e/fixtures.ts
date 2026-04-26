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
  /** Page with mocked meal plan data for stable testing. */
  stableMealPlanPage: Page;
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

  stableMealPlanPage: async ({ page }, use) => {
    // Setup standard mock data
    const MOCK_PLAN_ID = "00000000-0000-0000-0000-000000000000";
    const MOCK_USER_ID = "11111111-1111-1111-1111-111111111111";

    await page.route("**/rest/v1/meal_plans?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{
          id: MOCK_PLAN_ID,
          patient_id: MOCK_USER_ID,
          plan_status: "published",
          is_active: true,
          edit_metadata: { substitution_count: 4 },
          created_at: new Date().toISOString(),
        }]),
      });
    });

    await page.route("**/rest/v1/meal_plan_items?**", async (route) => {
      const items = [
        // Monday (0) - Breakfast
        {
          id: "m-b-1",
          meal_plan_id: MOCK_PLAN_ID,
          title: "Ovo Cozido",
          description: "100g",
          day_of_week: 0,
          meal_type: "breakfast",
          is_primary: true,
          calories_target: 150,
          protein_target: 12,
          created_at: "2024-01-01T10:00:00Z"
        },
        {
          id: "m-b-s1",
          meal_plan_id: MOCK_PLAN_ID,
          title: "Omelete",
          description: "100g",
          day_of_week: 0,
          meal_type: "breakfast",
          is_primary: false,
          calories_target: 160,
          item_origin: "auto_generated_sub",
          created_at: "2024-01-01T10:01:00Z"
        },
        // Monday (0) - Lunch
        {
          id: "m-l-1",
          meal_plan_id: MOCK_PLAN_ID,
          title: "Frango Grelhado",
          description: "150g",
          day_of_week: 0,
          meal_type: "lunch",
          is_primary: true,
          calories_target: 250,
          protein_target: 45,
          created_at: "2024-01-01T12:00:00Z"
        },
        // Tuesday (1) - Breakfast (for tab switching test)
        {
          id: "t-b-1",
          meal_plan_id: MOCK_PLAN_ID,
          title: "Iogurte",
          description: "200ml",
          day_of_week: 1,
          meal_type: "breakfast",
          is_primary: true,
          calories_target: 120,
          protein_target: 10,
          created_at: "2024-01-01T10:00:00Z"
        }
      ];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(items) });
    });

    await page.route("**/rest/v1/profiles?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ full_name: "Stable Test Patient" }]),
      });
    });

    // Actually we don't need a real login if we mock the auth check too, 
    // but the app might check it. For now let's just use it after login.
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    await page.goto(`/meal-plan-editor-v2/${MOCK_PLAN_ID}`);
    await use(page);
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
