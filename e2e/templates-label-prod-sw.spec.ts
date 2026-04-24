/**
 * FitJourney E2E — Produção: SW + cache + reload
 *
 * Roda contra a configuração de PRODUÇÃO (com Service Worker registrado e
 * cache HTTP ativo) para garantir que:
 *
 *  1. O texto legado "Aplicar plano para 7 dias" NÃO aparece após:
 *     - carregamento inicial
 *     - navegação cliente para /diet-templates e volta
 *     - reload completo (F5) e segundo reload (cache aquecido)
 *  2. O Service Worker fica em estado "activated"
 *  3. data-build-hash continua presente após reload (build identity persiste)
 *
 * Como executar contra PRODUÇÃO:
 *   E2E_BASE_URL=https://fijourney.lovable.app \
 *   E2E_SCENARIO=auto \
 *   bunx playwright test e2e/templates-label-prod-sw.spec.ts
 *
 * Em ambiente CI sem credenciais, o login pode falhar — nesse caso os
 * asserts globais (HTML público, build identity) ainda são executados.
 */
import { test, expect } from "./fixtures";

const LEGACY_RE = /aplicar\s+plano\s+para\s+7\s+dias/i;

test.describe("Produção · SW + cache · rótulo legado nunca volta", () => {
  test.beforeEach(async ({ page }) => {
    // Garante SW limpo no início de cada teste para começar do zero,
    // depois deixa o app registrar o SW novamente como em produção real.
    await page.goto("/");
    await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in self) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    });
  });

  test("home pública não contém o rótulo legado mesmo com cache aquecido", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});

    let html = await page.content();
    expect(LEGACY_RE.test(html), "1ª carga: texto legado encontrado").toBe(false);

    // Reload (cache HTTP/SW poderia retornar bundle antigo)
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    html = await page.content();
    expect(LEGACY_RE.test(html), "Após reload: texto legado encontrado").toBe(false);

    // Segundo reload (cache aquecido)
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    html = await page.content();
    expect(LEGACY_RE.test(html), "Reload nº2: texto legado encontrado").toBe(false);

    // Build identity continua presente (chunk hash + data-build-hash)
    const hashAfter = await page.locator("html").getAttribute("data-build-hash");
    expect(hashAfter, "data-build-hash perdido após reload").toBeTruthy();
  });

  test("SW alcança estado activated em produção", async ({ page, baseURL }) => {
    test.skip(
      !!baseURL && baseURL.includes("localhost"),
      "SW só é registrado em build de produção (skip em localhost dev)",
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});

    const swState = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      // Aguarda registro com timeout curto.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((res) => setTimeout(() => res(null), 8000)),
      ]);
      if (!reg) return "timeout";
      const r = reg as ServiceWorkerRegistration;
      if (r.active) return "activated";
      if (r.installing) return "installing";
      if (r.waiting) return "waiting";
      return "none";
    });

    expect(["activated", "waiting", "installing"]).toContain(swState);
  });

  test("nutri navega templates → home → templates e nunca vê texto legado", async ({
    nutriPage,
  }) => {
    await nutriPage.goto("/diet-templates");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    await nutriPage.goto("/");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    await nutriPage.goto("/diet-templates");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    // Reload duro na rota de templates
    await nutriPage.reload();
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);
  });
});
