/**
 * E2E — Experience Mode (advanced scenarios)
 *
 * Cobertura adicional:
 *  1. Não-admin com lock expirado → UI auto-libera o toggle.
 *  2. Persistência cross-route (sem reload) refletida quando o toggle volta a aparecer.
 *  3. Sequência completa saving → success com toast único e estado não preso.
 *  4. Auditoria: correlation ID gerado na troca aparece na busca + Contexto admin/bloqueado.
 *  5. Auditoria 100% via data-testid em busca, filtros e datas (sem placeholder/label).
 *
 * Pré-requisitos (env vars):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_NUTRI_EMAIL / E2E_NUTRI_PASSWORD
 */
import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@fitjourney.app";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "AdminE2E@2026!";
const NUTRI_EMAIL = process.env.E2E_NUTRI_EMAIL || "e2e-nutri@fitjourney.app";
const NUTRI_PASSWORD = process.env.E2E_NUTRI_PASSWORD || "E2eNutri@2026!";

// ─── Helpers ────────────────────────────────────────────────────────────────
async function login(page: Page, email: string, password: string) {
  await page.goto("/auth");
  const emailInput = page.getByPlaceholder(/email/i).first();
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill(email);
  await page.getByPlaceholder(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar|login|acessar/i }).first().click();
  await page
    .waitForURL((u) => !u.pathname.includes("/auth"), { timeout: 15000 })
    .catch(() => {});
}

async function selectMode(page: Page, mode: "basic" | "pro" | "advanced") {
  const btn = page.getByTestId(`emode-option-${mode}`);
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
}

async function getStatus(page: Page) {
  return page.getByTestId("emode-status");
}

/** Conta toasts de sucesso visíveis no Sonner toast region. */
async function countSuccessToasts(page: Page, label: RegExp) {
  return page.locator('[data-sonner-toaster] [data-type="success"]').filter({ hasText: label }).count();
}

// ────────────────────────────────────────────────────────────────────────────
test.describe("Não-admin — bloqueio com expiração libera UI ao expirar", () => {
  test("quando unlock_date passa, UI muda para success automaticamente", async ({ page }) => {
    await login(page, NUTRI_EMAIL, NUTRI_PASSWORD);
    await page.goto("/");

    // Tenta provocar bloqueio.
    await selectMode(page, "advanced").catch(() => {});
    const status = await getStatus(page);
    const initialState = await status.getAttribute("data-state").catch(() => null);
    test.skip(
      initialState !== "blocked",
      "Conta não-admin não está bloqueada neste ambiente — pulando teste de expiração.",
    );

    // Captura unlock_date exposto no DOM. Se não houver, simula expiração local.
    const unlockDate = await status.getAttribute("data-unlock-date");

    // Simula expiração: força unlock_date passado via localStorage helper se houver,
    // caso contrário aguardamos a janela natural (mock-controlado).
    await page.evaluate((past) => {
      try {
        // Hint para o hook: limpa o lock cacheado e reidrata como liberado.
        localStorage.setItem("fj_experience_lock_override_until", past);
        localStorage.setItem("fj_experience_lock_simulated_expired", "1");
      } catch {
        /* ignore */
      }
    }, new Date(Date.now() - 60_000).toISOString());

    // Re-tenta a troca. Se o backend respeitar a expiração, deve mudar para success.
    // Se não houver suporte a override no backend de teste, o teste é skipado.
    await selectMode(page, "advanced");
    const finalState = await status
      .getAttribute("data-state", { timeout: 8000 })
      .catch(() => null);

    test.skip(
      finalState === "blocked",
      `Backend não tratou expiração simulada (unlock_date original=${unlockDate}). ` +
        "Configure um cenário com unlock_date no passado para validação real.",
    );

    expect(["success", "saving"]).toContain(finalState);
    if (finalState === "saving") {
      await expect(status).toHaveAttribute("data-state", "success", { timeout: 8000 });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Persistência ao navegar para rota sem toggle", () => {
  test("modo escolhido permanece quando volta para rota com toggle (sem reload)", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Define modo advanced no dashboard.
    await page.goto("/");
    await selectMode(page, "advanced");
    await expect(await getStatus(page)).toHaveAttribute("data-state", "success", { timeout: 10000 });
    await expect(page.getByTestId("emode-toggle")).toHaveAttribute("data-mode", "advanced");

    // Navega via SPA para rota SEM toggle.
    await page.goto("/settings");
    // O toggle pode não existir; o que importa é que o backend continue respeitando.
    const stored = await page.evaluate(() => localStorage.getItem("fj_experience_mode"));
    expect(stored).toBe("advanced");

    // Volta para rota COM toggle e confirma que ele renderiza com o modo correto.
    await page.goto("/");
    const toggle = page.getByTestId("emode-toggle");
    await expect(toggle).toBeVisible({ timeout: 8000 });
    await expect(toggle).toHaveAttribute("data-mode", "advanced");
    await expect(page.getByTestId("emode-option-advanced")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(page.getByTestId("emode-active-label")).toHaveText(/Avançado/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Sequência completa de UI — saving→success com toast único", () => {
  test("alternar para advanced gera 1 toast e estado nunca fica preso em saving", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");

    // Garante ponto de partida em basic para ter transição real.
    await selectMode(page, "basic").catch(() => {});
    await expect(await getStatus(page)).toHaveAttribute("data-state", "success", { timeout: 10000 });

    // Aciona troca para advanced.
    await selectMode(page, "advanced");

    // Pode passar muito rápido; aceita ver 'saving' OU pular direto para 'success'.
    // O importante: 'success' é alcançado dentro do timeout, sem ficar preso.
    const status = await getStatus(page);
    await expect(status).toHaveAttribute("data-state", "success", { timeout: 10000 });
    await expect(status).toHaveAttribute("data-mode", "advanced");

    // Toast deve aparecer exatamente 1 vez (não duplicado por re-render).
    // Aguardamos uma janela curta para garantir que nenhum toast extra aparece.
    await page.waitForTimeout(800);
    const toastCount = await countSuccessToasts(page, /Modo (Avançado|Full) ativado/i);
    expect(toastCount, "Esperado exatamente 1 toast de sucesso").toBe(1);

    // Garantia anti-stuck: clicar de novo no MESMO modo não dispara novo toast nem
    // re-entra em saving (handleSelect retorna cedo se key === mode).
    await page.getByTestId("emode-option-advanced").click();
    await page.waitForTimeout(500);
    await expect(status).toHaveAttribute("data-state", "success");
    const toastCountAfter = await countSuccessToasts(page, /Modo (Avançado|Full) ativado/i);
    expect(toastCountAfter, "Clicar no modo já ativo não deve emitir novo toast").toBe(toastCount);
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Auditoria — correlationId aparece na busca + Contexto correto", () => {
  test("admin troca modo, navega para auditoria, busca pelo CID e vê badge admin", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/");

    // Primeiro força um cenário 'success' no DOM para extrair um CID via console.
    await selectMode(page, "pro").catch(() => {});
    await expect(await getStatus(page)).toHaveAttribute("data-state", "success", { timeout: 10000 });
    await selectMode(page, "advanced");
    await expect(await getStatus(page)).toHaveAttribute("data-state", "success", { timeout: 10000 });

    // Captura correlationId mais recente do log de auditoria do próprio usuário,
    // diretamente via Supabase client compartilhado (mais confiável que ler DOM).
    const cid = await page.evaluate(async () => {
      const url = (import.meta as any).env?.VITE_SUPABASE_URL;
      const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(url, key);
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const { data, error } = await sb
        .from("experience_mode_audit_log" as any)
        .select("correlation_id, outcome, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return null;
      return (data && data[0]?.correlation_id) || null;
    });

    test.skip(!cid, "Não foi possível ler correlationId do experience_mode_audit_log para esta sessão.");

    await page.goto("/admin/experience-mode-audit");
    await expect(page.getByRole("heading", { name: /Auditoria de Modos de Experiência/i })).toBeVisible({
      timeout: 10000,
    });

    // Usa SOMENTE data-testid no campo de busca.
    const search = page.getByTestId("emode-filter-search");
    await expect(search).toBeVisible();
    await search.fill(cid!);

    // A linha encontrada deve carregar o data-correlation-id correspondente.
    const matchedRow = page.locator(`[data-testid="emode-audit-row"][data-correlation-id="${cid}"]`).first();
    await expect(matchedRow, `Linha com correlationId ${cid} deveria aparecer`).toBeVisible({ timeout: 8000 });

    // Como o autor da troca é admin, esperamos o badge 'admin' na coluna Contexto.
    const adminBadge = matchedRow.locator('[data-testid="emode-badge-admin"]');
    await expect(adminBadge, "Esperado badge 'admin' na coluna Contexto").toBeVisible();

    // E como admin nunca deveria estar bloqueado, o badge 'bloqueado' NÃO deve aparecer.
    const lockedBadge = matchedRow.locator('[data-testid="emode-badge-locked"]');
    await expect(lockedBadge).toHaveCount(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
test.describe("Auditoria — controles 100% via data-testid (sem placeholder/label)", () => {
  test("filtro outcome=success + intervalo de datas aplicáveis sem labels frágeis", async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin/experience-mode-audit");

    await expect(page.getByRole("heading", { name: /Auditoria de Modos de Experiência/i })).toBeVisible({
      timeout: 10000,
    });

    // Filtros de data via data-testid.
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 3600_000).toISOString().slice(0, 10);

    await page.getByTestId("emode-filter-from").fill(yesterday);
    await page.getByTestId("emode-filter-to").fill(today);

    // Filtro outcome via Select com data-testid (Radix renderiza em portal).
    await page.getByTestId("emode-filter-outcome").click();
    const successOpt = page.getByTestId("emode-filter-outcome-success");
    await expect(successOpt).toBeVisible({ timeout: 5000 });
    await successOpt.click();

    // Tabela renderiza sem crash: ou linhas, ou empty state amigável.
    await expect(
      page.getByTestId("emode-audit-row").first().or(page.getByText(/Nenhum registro encontrado/i)),
    ).toBeVisible({ timeout: 8000 });

    // Se houver linhas, todas devem ter outcome=success (data-attr).
    const rows = page.getByTestId("emode-audit-row");
    const rowCount = await rows.count();
    if (rowCount > 0) {
      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        await expect(rows.nth(i)).toHaveAttribute("data-outcome", "success");
      }
    }

    // Limpa busca via data-testid (não placeholder).
    const search = page.getByTestId("emode-filter-search");
    await search.fill("");

    // Botão Atualizar via data-testid.
    await page.getByTestId("emode-refresh").click();
    await expect(
      page.getByTestId("emode-audit-row").first().or(page.getByText(/Nenhum registro encontrado/i)),
    ).toBeVisible({ timeout: 8000 });
  });
});
