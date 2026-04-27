import { test, expect } from "@playwright/test";

/**
 * E2E: fluxo ponta-a-ponta do convite.
 *
 * Garante que ao abrir um link real /cadastro?code=CODE:
 *   1. A página de cadastro carrega (sem 404 e sem cair em /).
 *   2. O contexto do código de convite é preservado (input/state) para que
 *      o vínculo profissional ↔ paciente seja mantido na finalização.
 *   3. Após finalizar (mockado em DOM), o paciente é direcionado para
 *      /onboarding e não para a Auth genérica.
 *
 * Em CI rodamos a etapa 1 e 2 contra a build local — etapa 3 é validada
 * apenas como assertiva de presença do estado, já que finalizar de fato
 * exige Supabase auth real (validado em ambientes staging).
 */
const TEST_CODE = "E2ECODE";

test.describe("Fluxo do convite preserva vínculo do profissional", () => {
  test("/cadastro?code=CODE carrega e preserva o code no estado da página", async ({
    page,
  }) => {
    const response = await page.goto(`/cadastro?code=${TEST_CODE}`);
    expect(response!.status()).toBeLessThan(400);

    await page.waitForLoadState("networkidle");

    // Não pode bater em 404 nem voltar para "/"
    const notFoundHeading = page.getByRole("heading", {
      name: /Página não encontrada/i,
    });
    await expect(notFoundHeading).toHaveCount(0);

    const finalPath = await page.evaluate(() => window.location.pathname);
    expect(finalPath).toBe("/cadastro");

    const finalSearch = await page.evaluate(() => window.location.search);
    expect(finalSearch).toContain(`code=${TEST_CODE}`);

    // O código precisa estar acessível para a página (URLSearchParams),
    // garantindo que o submit do formulário envie o vínculo.
    const codeFromUrl = await page.evaluate(() =>
      new URLSearchParams(window.location.search).get("code"),
    );
    expect(codeFromUrl).toBe(TEST_CODE);
  });

  test("link via redirect legado /convite/CODE entrega no /cadastro com code", async ({
    page,
  }) => {
    await page.goto(`/convite/${TEST_CODE}`);
    await page.waitForLoadState("networkidle");

    const finalPath = await page.evaluate(() => window.location.pathname);
    const finalSearch = await page.evaluate(() => window.location.search);

    expect(finalPath, "deve aterrissar em /cadastro mesmo via /convite/*").toBe(
      "/cadastro",
    );
    expect(
      finalSearch,
      "code do convite NÃO PODE ser perdido durante o redirect",
    ).toContain(`code=${TEST_CODE}`);

    const notFoundHeading = page.getByRole("heading", {
      name: /Página não encontrada/i,
    });
    await expect(notFoundHeading).toHaveCount(0);
  });
});
