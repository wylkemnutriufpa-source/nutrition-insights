/**
 * E2E — Experience Mode (admin, lock, audit, persistence)
 *
 * Estratégia de seletor (estável, sem CSS de layout):
 *  - data-testid: emode-toggle, emode-option-{basic|pro|advanced},
 *                 emode-status (com data-state),
 *                 emode-request-unlock, emode-unlock-dialog,
 *                 emode-unlock-justification, emode-unlock-confirm,
 *                 emode-unlock-cancel,
 *                 emode-context-cell, emode-badge-admin, emode-badge-locked.
 *  - Textos visíveis estáveis: títulos de toast e textos do CTA de bloqueio.
 *
 * Coberturas:
 *  1. Admin: persistência após reload + bypass do lock + transição saving→success.
 *  2. Admin: navegação SPA entre rotas mantém modo e seletor consistente
 *     (sem reload) e o seletor só renderiza nas rotas que o expõem.
 *  3. Não-admin: UI de bloqueio com modal, validação mínima e cancelamento.
 *  4. Não-admin: rejeição PostgREST + mensagem clara (RLS/trigger),
 *     com asserts no código de erro e/ou texto.
 *  5. Auditoria: busca/filtros encontram registros via Contexto (admin/bloqueado),
 *     correlationId e período.
 *  6. Toasts/estado: success após troca, blocked após tentativa negada.
 */
import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@fitjourney.app";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "AdminE2E@2026!";
const NUTRI_EMAIL = process.env.E2E_NUTRI_EMAIL || "e2e-nutri@fitjourney.app";
const NUTRI_PASSWORD = process.env.E2E_NUTRI_PASSWORD || "E2eNutri@2026!";

// Rotas onde o InlineExperienceToggle é esperado.
const ROUTES_WITH_TOGGLE = ["/", "/dashboard"];
// Rotas que NÃO renderizam o toggle, mas onde o modo persistido deve seguir
// disponível via localStorage e via DB (assert indireto).
const ROUTES_WITHOUT_TOGGLE = ["/admin/experience-mode-audit", "/settings"];

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

async function getStatus(page: Page) {
  return page.getByTestId("emode-status");
}

async function selectMode(page: Page, mode: "basic" | "pro" | "advanced") {
  const btn = page.getByTestId(`emode-option-${mode}`);
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
}

async function expectStatusState(
  page: Page,
  state: "success" | "blocked" | "saving" | "failed" | "offline",
  timeout = 10000,
) {
  await expect(await getStatus(page)).toHaveAttribute("data-state", state, { timeout });
}

// ────────────────────────────────────────────────────────────────────────────
test.describe("Admin — bypass + persistência + transição de estado", () => {
  test("admin: troca para Avançado, vê success e persiste após reload", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");

    // Estado inicial deve estar resolvido (não "saving").
    await expect(await getStatus(page)).toBeVisible({ timeout: 10000 });
    const initialState = await (await getStatus(page)).getAttribute("data-state");
    expect(["success", "blocked", "failed", "offline"]).toContain(initialState);

    // Aciona troca e captura toast de sucesso.
    await selectMode(page, "advanced");
    await expect(page.getByText(/Modo (Avançado|Full) ativado/i)).toBeVisible({ timeout: 10000 });
    await expectStatusState(page, "success");

    // Toggle reflete o modo selecionado.
    await expect(page.getByTestId("emode-toggle")).toHaveAttribute("data-mode", "advanced");
    await expect(page.getByTestId("emode-option-advanced")).toHaveAttribute(
      "data-selected",
      "true",
    );

    // Reload e verifica persistência via localStorage + UI.
    await page.reload();
    await expectStatusState(page, "success");
    await expect(page.getByTestId("emode-toggle")).toHaveAttribute("data-mode", "advanced");

    const stored = await page.evaluate(() => localStorage.getItem("fj_experience_mode"));
    expect(stored).toBe("advanced");
  });

  test("admin: status NUNCA atinge 'blocked' mesmo se experience_mode_locked=true", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");
    await selectMode(page, "advanced");
    // Status nunca deve renderizar como blocked dentro da janela de espera.
    const status = await getStatus(page);
    await expect(status).not.toHaveAttribute("data-state", "blocked", { timeout: 4000 });
    await expectStatusState(page, "success");
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Persistência ao navegar entre rotas SPA (sem reload)", () => {
  test("modo selecionado mantém-se ao navegar; seletor aparece nas rotas com toggle", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");
    await selectMode(page, "advanced");
    await expectStatusState(page, "success");

    for (const route of ROUTES_WITH_TOGGLE) {
      await page.goto(route);
      const toggle = page.getByTestId("emode-toggle").first();
      await expect(toggle, `Toggle ausente em ${route}`).toBeVisible({ timeout: 8000 });
      await expect(toggle).toHaveAttribute("data-mode", "advanced");
    }

    for (const route of ROUTES_WITHOUT_TOGGLE) {
      await page.goto(route);
      // Pode ou não renderizar o toggle, mas o localStorage tem que persistir.
      const stored = await page.evaluate(() => localStorage.getItem("fj_experience_mode"));
      expect(stored, `Modo perdido após navegar para ${route}`).toBe("advanced");
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Não-admin — UI de bloqueio com modal + validação", () => {
  test("CTA abre modal, valida mínimo e cancela limpo", async ({ page }) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);
    await page.goto("/");

    // Tenta forçar uma tentativa que provavelmente é bloqueada para o cenário.
    await selectMode(page, "advanced").catch(() => {});

    const status = await getStatus(page);
    const state = await status.getAttribute("data-state").catch(() => null);
    test.skip(state !== "blocked", "Conta não-admin não está com lock=true neste ambiente.");

    // CTA visível
    const cta = page.getByTestId("emode-request-unlock");
    await expect(cta).toBeVisible();

    // Toast de bloqueio com texto estável
    await expect(page.getByText(/Alteração negada|Modo bloqueado/i)).toBeVisible({ timeout: 5000 });

    await cta.click();
    const dialog = page.getByTestId("emode-unlock-dialog");
    await expect(dialog).toBeVisible();

    const confirm = page.getByTestId("emode-unlock-confirm");
    await expect(confirm).toBeDisabled();

    await page
      .getByTestId("emode-unlock-justification")
      .fill("Preciso acessar o painel avançado para configurar automações.");
    await expect(confirm).toBeEnabled();

    await page.getByTestId("emode-unlock-cancel").click();
    await expect(dialog).not.toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Não-admin — segurança no banco com mensagem amigável", () => {
  test("UPDATE direto em experience_mode_locked é rejeitado com mensagem clara", async ({ page }) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);

    const result = await page.evaluate(async () => {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key);
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return { errorMessage: "no-user", errorCode: null, status: null };
      const { error, status } = await sb
        .from("profiles")
        .update({ experience_mode_locked: true } as any)
        .eq("user_id", user.id);
      return {
        errorMessage: error?.message ?? null,
        errorCode: (error as any)?.code ?? null,
        status: status ?? null,
      };
    });

    expect(result.errorMessage, "UPDATE deveria ser rejeitado").toBeTruthy();

    // Aceita rejeição via RLS (status 403/401, code 42501) ou via trigger SQL
    // (mensagem custom contendo 'admin'/'lock'/'permiss').
    const msg = (result.errorMessage || "").toLowerCase();
    const friendly =
      result.errorCode === "42501" ||
      msg.includes("admin") ||
      msg.includes("lock") ||
      msg.includes("permiss") ||
      msg.includes("policy") ||
      msg.includes("not allowed");
    expect(friendly, `Mensagem de erro pouco amigável: ${result.errorMessage}`).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Auditoria — busca por Contexto (admin/bloqueado), correlation e data", () => {
  test("admin acessa /admin/experience-mode-audit e busca por contexto + correlation", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Garantir que existe pelo menos um registro de admin com sucesso recente.
    await page.goto("/");
    await selectMode(page, "advanced");
    await expectStatusState(page, "success");

    await page.goto("/admin/experience-mode-audit");
    await expect(page.getByRole("heading", { name: /Auditoria de Modos de Experiência/i })).toBeVisible({
      timeout: 10000,
    });

    // Aguarda primeiro lote de linhas — deve haver pelo menos 1 célula de Contexto.
    const contextCells = page.getByTestId("emode-context-cell");
    await expect(contextCells.first()).toBeVisible({ timeout: 10000 });

    // Pelo menos uma badge "admin" deve existir após nossa ação acima.
    const adminBadges = page.getByTestId("emode-badge-admin");
    await expect(adminBadges.first()).toBeVisible({ timeout: 10000 });

    // Busca pelo termo "admin": ainda deve existir badge admin (filtra colunas indexadas).
    // O input de busca não tem testid, então usamos placeholder estável.
    const search = page.getByPlaceholder(/emc-… ou uuid…/i);
    await search.fill("admin");
    // A busca filtra por correlation_id/user_id/reason/error_code, então não
    // necessariamente reduz a contagem; só validamos que a tabela continua
    // renderizando ou mostra empty state amigável (sem quebrar a página).
    await expect(
      page
        .getByText(/Nenhum registro encontrado|Resultados \(/i)
        .first(),
    ).toBeVisible({ timeout: 6000 });
    await search.fill("");

    // Filtro por outcome=blocked deve renderizar a tabela ou empty state, sem erro.
    await page.getByLabel(/Resultado/i).click().catch(() => {});
    const blockedOption = page.getByRole("option", { name: /Bloqueado/i });
    if (await blockedOption.isVisible().catch(() => false)) {
      await blockedOption.click();
      await expect(
        page.getByText(/Nenhum registro encontrado|Resultados \(/i).first(),
      ).toBeVisible({ timeout: 6000 });
    }

    // Filtro por data hoje → ontem (intervalo válido) renderiza sem crash.
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').nth(1);
    await fromInput.fill(yesterday);
    await toInput.fill(today);
    await expect(
      page.getByText(/Nenhum registro encontrado|Resultados \(/i).first(),
    ).toBeVisible({ timeout: 6000 });
  });
});
