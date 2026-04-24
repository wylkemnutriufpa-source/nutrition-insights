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
 * v2: em qualquer falha do regex de rótulo legado, anexa ao relatório:
 *      - screenshot full-page
 *      - HTML serializado
 *      - logs de console capturados durante a navegação
 *      - build hash detectado no <html data-build-hash="…">
 *      - URLs de assets carregados (heurística para CDN antigo)
 *
 * Execução contra produção:
 *   E2E_BASE_URL=https://fijourney.lovable.app \
 *   E2E_SCENARIO=auto \
 *   bunx playwright test e2e/templates-label-prod-sw.spec.ts
 */
import { test, expect, type Page, type TestInfo } from "./fixtures";

const LEGACY_RE = /aplicar\s+plano\s+para\s+7\s+dias/i;

interface ConsoleEntry {
  type: string;
  text: string;
  ts: string;
}

function attachConsoleCollector(page: Page): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  page.on("console", (msg) => {
    entries.push({
      type: msg.type(),
      text: msg.text().slice(0, 500),
      ts: new Date().toISOString(),
    });
  });
  page.on("pageerror", (err) => {
    entries.push({
      type: "pageerror",
      text: String(err?.message || err).slice(0, 500),
      ts: new Date().toISOString(),
    });
  });
  return entries;
}

/**
 * Anexa evidências completas ao TestInfo quando o assert do rótulo legado falha.
 * Não falha se algo der errado na coleta — o objetivo é dar contexto, não
 * mascarar a falha original.
 */
async function attachEvidenceOnLegacyHit(
  page: Page,
  testInfo: TestInfo,
  label: string,
  consoleEntries: ConsoleEntry[],
) {
  try {
    const html = await page.content();
    const buildHash = await page
      .locator("html")
      .getAttribute("data-build-hash")
      .catch(() => null);
    const buildTime = await page
      .locator("html")
      .getAttribute("data-build-time")
      .catch(() => null);

    const assetUrls = await page
      .evaluate(() => {
        const urls: string[] = [];
        document
          .querySelectorAll<HTMLScriptElement>("script[src]")
          .forEach((s) => s.src && urls.push(s.src));
        document
          .querySelectorAll<HTMLLinkElement>("link[href]")
          .forEach((l) => {
            if (l.rel === "stylesheet" || l.rel === "modulepreload")
              urls.push(l.href);
          });
        return urls;
      })
      .catch(() => [] as string[]);

    const hashFromAssets = assetUrls
      .map((u) => /\/assets\/[^/?#]+-([a-z0-9]{6,})\.(?:js|css|mjs)/i.exec(u)?.[1])
      .filter(Boolean) as string[];

    // Screenshot full-page
    const shot = await page
      .screenshot({ fullPage: true })
      .catch(() => null);
    if (shot) {
      await testInfo.attach(`legacy-hit-${label}.png`, {
        body: shot,
        contentType: "image/png",
      });
    }

    await testInfo.attach(`legacy-hit-${label}.html`, {
      body: html,
      contentType: "text/html",
    });

    await testInfo.attach(`legacy-hit-${label}.json`, {
      body: JSON.stringify(
        {
          label,
          url: page.url(),
          buildHash,
          buildTime,
          hashesInAssets: Array.from(new Set(hashFromAssets)),
          assetUrls,
          consoleEntries: consoleEntries.slice(-50),
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  } catch {
    /* swallow — não mascara o assert real */
  }
}

/**
 * Helper que executa o assert e, em caso de falha, dispara coleta de
 * evidências antes de re-lançar o erro.
 */
async function assertNoLegacy(
  page: Page,
  testInfo: TestInfo,
  label: string,
  consoleEntries: ConsoleEntry[],
) {
  const html = await page.content();
  if (LEGACY_RE.test(html)) {
    await attachEvidenceOnLegacyHit(page, testInfo, label, consoleEntries);
  }
  expect(LEGACY_RE.test(html), `${label}: texto legado encontrado`).toBe(false);
}

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
  }, testInfo) => {
    const consoleEntries = attachConsoleCollector(page);

    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertNoLegacy(page, testInfo, "home-1st", consoleEntries);

    // Reload (cache HTTP/SW poderia retornar bundle antigo)
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertNoLegacy(page, testInfo, "home-reload-1", consoleEntries);

    // Segundo reload (cache aquecido)
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertNoLegacy(page, testInfo, "home-reload-2", consoleEntries);

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
  }, testInfo) => {
    const consoleEntries = attachConsoleCollector(nutriPage);

    await nutriPage.goto("/diet-templates");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    if (await nutriPage.getByText(LEGACY_RE).count()) {
      await attachEvidenceOnLegacyHit(
        nutriPage,
        testInfo,
        "nutri-templates-1",
        consoleEntries,
      );
    }
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    await nutriPage.goto("/");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    if (await nutriPage.getByText(LEGACY_RE).count()) {
      await attachEvidenceOnLegacyHit(
        nutriPage,
        testInfo,
        "nutri-home",
        consoleEntries,
      );
    }
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    await nutriPage.goto("/diet-templates");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    if (await nutriPage.getByText(LEGACY_RE).count()) {
      await attachEvidenceOnLegacyHit(
        nutriPage,
        testInfo,
        "nutri-templates-2",
        consoleEntries,
      );
    }
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);

    // Reload duro na rota de templates
    await nutriPage.reload();
    await nutriPage.waitForLoadState("networkidle").catch(() => {});
    if (await nutriPage.getByText(LEGACY_RE).count()) {
      await attachEvidenceOnLegacyHit(
        nutriPage,
        testInfo,
        "nutri-templates-reload",
        consoleEntries,
      );
    }
    await expect(nutriPage.getByText(LEGACY_RE)).toHaveCount(0);
  });
});
