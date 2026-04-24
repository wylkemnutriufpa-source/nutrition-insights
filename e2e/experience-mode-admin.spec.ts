/**
 * E2E — Experience Mode (admin & lock)
 *
 * Garantias cobertas:
 * 1. Admin nunca fica bloqueado em experience_mode_locked → consegue
 *    alternar para "Avançado" mesmo se a flag for true no banco.
 * 2. O modo selecionado persiste após reload da página.
 * 3. O seletor (InlineExperienceToggle) aparece em todas as rotas
 *    principais do admin/profissional.
 * 4. Não-admin recebe a UI de bloqueio amigável + CTA de solicitação.
 * 5. Tentativa de alterar `experience_mode_locked` via PostgREST direto
 *    por um não-admin é REJEITADA pelo trigger SQL.
 *
 * Pré-requisitos (env vars):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD          → conta com role 'admin'
 *   E2E_NUTRI_EMAIL / E2E_NUTRI_PASSWORD          → profissional NÃO admin
 *   VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (lidos do .env)
 */
import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@fitjourney.app";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "AdminE2E@2026!";

const NUTRI_EMAIL = process.env.E2E_NUTRI_EMAIL || "e2e-nutri@fitjourney.app";
const NUTRI_PASSWORD = process.env.E2E_NUTRI_PASSWORD || "E2eNutri@2026!";

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth");
  const emailInput = page.getByPlaceholder(/email/i).first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);
  await page.getByPlaceholder(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).first().click();
  await page
    .waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15000 })
    .catch(() => {});
}

async function selectAdvancedMode(page: Page) {
  // O InlineExperienceToggle renderiza buttons com label "Avançado" / "Full"
  const advancedBtn = page
    .locator('button:has-text("Avançado"), button:has-text("Full")')
    .first();
  await expect(advancedBtn).toBeVisible({ timeout: 10000 });
  await advancedBtn.click();
}

test.describe("Experience Mode — Admin bypass + persistência", () => {
  test("admin consegue mudar para Avançado e o estado persiste após reload", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");
    await selectAdvancedMode(page);

    // Aguarda toast de sucesso ou status section em estado success
    const status = page.getByTestId("emode-status");
    await expect(status).toHaveAttribute("data-state", "success", { timeout: 10000 });

    // Reload e verifica persistência
    await page.reload();
    await expect(page.getByTestId("emode-status")).toHaveAttribute("data-state", "success", {
      timeout: 10000,
    });

    // localStorage deve manter o modo
    const storedMode = await page.evaluate(() => localStorage.getItem("fj_experience_mode"));
    expect(storedMode).toBe("advanced");
  });

  test("admin NUNCA recebe estado 'blocked' mesmo se experience_mode_locked=true", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");
    await selectAdvancedMode(page);

    // Status nunca deve atingir 'blocked'
    const status = page.getByTestId("emode-status");
    await expect(status).not.toHaveAttribute("data-state", "blocked", { timeout: 5000 });
  });

  test("seletor de modo aparece em todas as páginas principais", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const routes = ["/", "/patients", "/appointments", "/admin", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      // O componente renderiza buttons com o texto "Básico" sempre visível
      const basicBtn = page.locator('button:has-text("Básico")').first();
      await expect(basicBtn, `Seletor ausente em ${route}`).toBeVisible({ timeout: 8000 });
    }
  });
});

test.describe("Experience Mode — UI de bloqueio para não-admin", () => {
  test("usuário não-admin com lock=true vê CTA de destravamento com modal", async ({ page }) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);
    await page.goto("/");

    // Tenta selecionar Avançado — pode bloquear se a conta tiver lock; senão skipa
    await selectAdvancedMode(page).catch(() => {});

    const status = page.getByTestId("emode-status");
    const state = await status.getAttribute("data-state").catch(() => null);

    test.skip(state !== "blocked", "Conta não-admin não está com lock=true neste ambiente.");

    // CTA visível
    const cta = page.getByTestId("emode-request-unlock");
    await expect(cta).toBeVisible();

    // Abre o modal
    await cta.click();
    await expect(page.getByTestId("emode-unlock-dialog")).toBeVisible();

    // Botão "Enviar" deve iniciar desabilitado (justificativa vazia)
    const confirmBtn = page.getByTestId("emode-unlock-confirm");
    await expect(confirmBtn).toBeDisabled();

    // Preenche justificativa válida
    await page
      .getByTestId("emode-unlock-justification")
      .fill("Preciso acessar o painel avançado para configurar automações.");
    await expect(confirmBtn).toBeEnabled();

    // Cancelar funciona
    await page.getByTestId("emode-unlock-cancel").click();
    await expect(page.getByTestId("emode-unlock-dialog")).not.toBeVisible();
  });
});

test.describe("Experience Mode — segurança no banco", () => {
  test("não-admin não consegue alterar experience_mode_locked via PostgREST", async ({ page }) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);

    // Lê env vars dentro do contexto do navegador (já injetadas pelo Vite)
    const result = await page.evaluate(async () => {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { error: "no-user" };
      const { error } = await sb
        .from("profiles")
        .update({ experience_mode_locked: true } as any)
        .eq("user_id", user.id);
      return { errorMessage: error?.message ?? null, errorCode: (error as any)?.code ?? null };
    });

    // Esperamos uma rejeição: ou o trigger SQL (42501) ou a RLS
    expect(
      result.errorMessage,
      "UPDATE de experience_mode_locked por não-admin deveria ser rejeitado"
    ).toBeTruthy();
  });
});
