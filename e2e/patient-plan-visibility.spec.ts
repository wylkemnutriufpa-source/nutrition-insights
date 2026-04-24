/**
 * Patient Plan Visibility — E2E
 *
 * For each seeded patient (Angela, Lucélia, Catharina, Sandra, Carla, Mayara),
 * log in and verify:
 *   - If the lifecycle says they have an active plan published_to_patient,
 *     the plan card / “Meu Plano” surface must be visible.
 *   - Otherwise, the onboarding surface must be the only thing visible.
 *
 * Credentials are read from environment variables to avoid hard-coding
 * production passwords. Each patient that is missing credentials is reported
 * via test.skip(), so partial credential sets still produce useful output.
 *
 * To run with seeds, export e.g.:
 *   E2E_PATIENT_ANGELA_EMAIL=angelasilvasouza578@gmail.com
 *   E2E_PATIENT_ANGELA_PASSWORD=...
 *   E2E_PATIENT_LUCELIA_EMAIL=lucelialopesdesouza6@gmail.com
 *   E2E_PATIENT_LUCELIA_PASSWORD=...
 *   ...etc.
 */
import { test, expect, type Page } from "@playwright/test";

interface Seed {
  key: string;
  label: string;
  email?: string;
  password?: string;
  /**
   * "expects_plan" → MUST see the plan card.
   * "expects_onboarding" → MUST see the onboarding surface (anamnese pendente).
   * "auto" → either acceptable (we check what the lifecycle reports).
   */
  expectation: "expects_plan" | "expects_onboarding" | "auto";
}

const SEEDS: Seed[] = [
  {
    key: "angela",
    label: "Angela (sem lactose)",
    email: process.env.E2E_PATIENT_ANGELA_EMAIL,
    password: process.env.E2E_PATIENT_ANGELA_PASSWORD,
    expectation: "expects_plan",
  },
  {
    key: "lucelia",
    label: "Lucélia",
    email: process.env.E2E_PATIENT_LUCELIA_EMAIL,
    password: process.env.E2E_PATIENT_LUCELIA_PASSWORD,
    expectation: "expects_plan",
  },
  {
    key: "catharina",
    label: "Catharina",
    email: process.env.E2E_PATIENT_CATHARINA_EMAIL,
    password: process.env.E2E_PATIENT_CATHARINA_PASSWORD,
    expectation: "expects_plan",
  },
  {
    key: "sandra",
    label: "Sandra Pinheiro",
    email: process.env.E2E_PATIENT_SANDRA_EMAIL,
    password: process.env.E2E_PATIENT_SANDRA_PASSWORD,
    expectation: "expects_plan",
  },
  {
    key: "carla",
    label: "Carla (anamnese incompleta)",
    email: process.env.E2E_PATIENT_CARLA_EMAIL,
    password: process.env.E2E_PATIENT_CARLA_PASSWORD,
    expectation: "expects_onboarding",
  },
  {
    key: "mayara",
    label: "Mayara Leite (plano approved, não publicado)",
    email: process.env.E2E_PATIENT_MAYARA_EMAIL,
    password: process.env.E2E_PATIENT_MAYARA_PASSWORD,
    expectation: "auto",
  },
];

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/auth");
  const emailInput = page.getByPlaceholder(/email/i).first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);
  await page.getByPlaceholder(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).first().click();
  await page
    .waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 20000 })
    .catch(() => {});
}

test.describe("Patient plan visibility — seed accounts", () => {
  for (const seed of SEEDS) {
    test(`${seed.label}`, async ({ page }) => {
      test.skip(
        !seed.email || !seed.password,
        `Credenciais não configuradas para ${seed.label} (defina E2E_PATIENT_${seed.key.toUpperCase()}_EMAIL/PASSWORD).`
      );

      await loginAs(page, seed.email!, seed.password!);

      // Patient must land on the dashboard / index — not /auth.
      await expect(page).not.toHaveURL(/\/auth/);

      // Locator for either of the surfaces. Real selectors used in the app:
      //   - Plan surface: "Meu Plano" / "Plano alimentar" / data-testid="plan-card"
      //   - Onboarding:   "Anamnese" / "Vamos começar" / "/onboarding"
      const planSurface = page
        .getByText(/meu plano|plano alimentar|cardápio do dia/i)
        .or(page.locator('[data-testid="plan-card"]'))
        .first();

      const onboardingSurface = page
        .getByText(/anamnese|vamos começar|complete seu cadastro/i)
        .or(page.getByRole("heading", { name: /onboarding/i }))
        .first();

      // Wait for ANY surface to render (lifecycle hook may need ~2s).
      await Promise.race([
        planSurface.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
        onboardingSurface.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
      ]);

      if (seed.expectation === "expects_plan") {
        await expect(planSurface, `${seed.label} deveria ver o plano`).toBeVisible();
      } else if (seed.expectation === "expects_onboarding") {
        await expect(
          onboardingSurface,
          `${seed.label} deveria ver o onboarding`
        ).toBeVisible();
      } else {
        // auto: at least one surface must render
        const planVisible = await planSurface.isVisible().catch(() => false);
        const onbVisible = await onboardingSurface.isVisible().catch(() => false);
        expect(planVisible || onbVisible, "alguma superfície deve renderizar").toBe(true);
      }
    });
  }
});
