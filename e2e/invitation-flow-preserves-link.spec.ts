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
const TEST_NUTRI_ID = "67f47696-a778-4ada-9ff9-9615fb7a7c48";

const mockInvitationLogs = async (page: import("@playwright/test").Page) => {
  await page.route("**/rest/v1/invitation_logs**", async (route) => {
    await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  });
};

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

  test("/cadastro?code=CODE mostra 'Você foi convidado!' com profissional já vinculado", async ({
    page,
  }) => {
    await mockInvitationLogs(page);
    await page.route("**/functions/v1/validate-invitation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          invitation: {
            id: "invite-e2e",
            code: TEST_CODE,
            status: "pending",
            professional_id: TEST_NUTRI_ID,
            patient_email: "paciente-e2e@fitjourney.app",
            patient_name: "Paciente E2E",
            metadata: { clinic_name: "Clínica E2E" },
            professional: { full_name: "Nutri E2E", avatar_url: null, phone: "11999999999" },
          },
        }),
      });
    });

    await page.goto(`/cadastro?code=${TEST_CODE}&utm_source=whatsapp#onboarding`);
    await expect(page.getByRole("heading", { name: /Você foi convidado!/i })).toBeVisible();
    await expect(page.getByText(/Nutri E2E/i)).toBeVisible();
    await expect(page.getByText(/Clínica E2E/i)).toBeVisible();

    await page.getByRole("button", { name: /Aceitar Convite e Continuar/i }).click();
    await expect(page.getByText(/Profissional Vinculado/i)).toBeVisible();
    await expect(page.getByText(/Nutri E2E/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Concluir Cadastro/i })).toBeEnabled();

    const codeFromUrl = await page.evaluate(() => new URLSearchParams(window.location.search).get("code"));
    expect(codeFromUrl).toBe(TEST_CODE);
  });

  test("/cadastro?code inválido ou expirado não trava e orienta cadastro sem vínculo automático", async ({
    page,
  }) => {
    await mockInvitationLogs(page);
    await page.route("**/functions/v1/validate-invitation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error_code: "EXPIRED",
          message: "Este convite expirou. Solicite um novo link ao seu profissional.",
        }),
      });
    });
    await page.route("**/rest/v1/rpc/validate_onboarding_token", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ valid: false }) });
    });

    await page.goto("/cadastro?code=EXPIRADO123");
    await expect(page.getByText(/Link sem vínculo automático/i)).toBeVisible();
    await expect(page.getByText(/Solicite um novo link/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Concluir Cadastro/i })).toBeEnabled();
    await expect(page.getByText(/Página não encontrada/i)).toHaveCount(0);
  });
});
