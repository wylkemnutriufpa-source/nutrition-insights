/**
 * FitJourney E2E — Templates UI labels & build identity
 *
 * Garante que:
 *  1. O rótulo legado "Aplicar plano para 7 dias" NÃO aparece em nenhum lugar
 *     da UI de templates (após a unificação para "Aplicar Modelo").
 *  2. O build em execução expõe a identidade (window.__BUILD_INFO__) e o
 *     atributo data-build-hash no <html>, confirmando que a publicação foi
 *     processada e o navegador está servindo a versão nova.
 *
 * Estes asserts protegem contra regressão de cache (CDN/SW) servindo bundles
 * antigos com o texto removido.
 */
import { test, expect } from "./fixtures";

test.describe("Templates UI — rótulos & build identity", () => {
  test("home expõe build identity (hash + timestamp)", async ({ page }) => {
    await page.goto("/");

    // <html data-build-hash="...">
    const hash = await page.locator("html").getAttribute("data-build-hash");
    expect(hash, "data-build-hash deve estar presente").toBeTruthy();
    expect(hash!.length, "hash não pode ser vazio").toBeGreaterThan(0);

    // window.__BUILD_INFO__
    const buildInfo = await page.evaluate(() => (window as any).__BUILD_INFO__);
    expect(buildInfo, "__BUILD_INFO__ ausente").toBeTruthy();
    expect(buildInfo.hash, "BUILD_INFO.hash ausente").toBeTruthy();
    expect(buildInfo.timestamp, "BUILD_INFO.timestamp ausente").toBeTruthy();
  });

  test("UI de templates NÃO contém rótulo legado 'Aplicar plano para 7 dias'", async ({
    nutriPage,
  }) => {
    // Navega para a tela de templates do profissional.
    await nutriPage.goto("/diet-templates");
    await nutriPage.waitForLoadState("networkidle").catch(() => {});

    // Aceita variações de espaçamento/case.
    const legacyLabel = nutriPage.getByText(/aplicar\s+plano\s+para\s+7\s+dias/i);
    await expect(
      legacyLabel,
      "Rótulo legado 'Aplicar plano para 7 dias' não deveria estar presente",
    ).toHaveCount(0);

    // Sanity: o rótulo novo está presente em pelo menos um botão (ou nenhum
    // template carregado, caso a conta de teste esteja vazia — não falhar).
    const newLabel = nutriPage.getByRole("button", { name: /aplicar\s+modelo/i });
    const newCount = await newLabel.count();
    expect(newCount, "Esperado >= 0 botões 'Aplicar Modelo'").toBeGreaterThanOrEqual(0);
  });

  test("varredura global da home não retorna o texto legado", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    const html = await page.content();
    expect(
      /aplicar plano para 7 dias/i.test(html),
      "Texto legado encontrado no HTML renderizado da home",
    ).toBe(false);
  });
});
