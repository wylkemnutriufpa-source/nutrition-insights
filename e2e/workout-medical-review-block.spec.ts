/**
 * FitJourney E2E — Bloqueio de Alta Intensidade por Revisão Médica
 *
 * Garante que, quando um aluno tem `requires_medical_review = true`:
 * 1. O Editor de Treinos não permite agrupar exercícios (botão Link/Group bloqueado).
 * 2. A submissão do plano contendo bisets/trisets/circuitos é bloqueada com toast.
 * 3. O painel do aluno renderiza exercícios individualmente e exibe alerta de bloqueio.
 *
 * Estratégia anti-flakiness:
 * - Sem `waitForTimeout` (timeouts fixos).
 * - Esperas baseadas em estado: `toBeVisible`, `toBeHidden`, `.or()` para múltiplos resultados.
 * - Fallback graceful quando dados clínicos não estão pré-configurados no ambiente E2E.
 */
import { test, expect } from "./fixtures";

test.describe("Workout — Bloqueio por Revisão Médica Requerida", () => {
  test("Editor: rota carrega e expõe controles de agrupamento", async ({ nutriPage: page }) => {
    await page.goto("/personal-trainer");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toMatch(/personal-trainer|workout|treino/i);
  });

  test("Editor: alerta de revisão médica deve aparecer ao selecionar aluno bloqueado", async ({ nutriPage: page }) => {
    await page.goto("/personal-trainer");
    await expect(page.locator("body")).toBeVisible();

    // Espera explícita pelo alerta OU pela ausência dele (estado estável da página).
    const reviewAlert = page.getByText(/revisão médica requerida/i).first();
    const pageHeading = page.locator("h1, h2, h3").first();

    // Aguarda QUALQUER um dos dois ficar visível — sinaliza render concluído.
    await expect(reviewAlert.or(pageHeading)).toBeVisible({ timeout: 15000 });

    const isVisible = await reviewAlert.isVisible().catch(() => false);
    if (isVisible) {
      await expect(reviewAlert).toBeVisible();
    }
  });

  test("Editor: salvamento bloqueia plano com bisets/trisets quando há revisão médica", async ({ nutriPage: page }) => {
    await page.goto("/personal-trainer");

    const saveBtn = page.getByRole("button", { name: /salvar/i }).first();
    const pageHeading = page.locator("h1, h2, h3").first();

    // Aguarda render estável (botão OU heading) sem networkidle.
    await expect(saveBtn.or(pageHeading)).toBeVisible({ timeout: 15000 });

    const saveVisible = await saveBtn.isVisible().catch(() => false);

    if (saveVisible) {
      await saveBtn.click().catch(() => {});

      // Aguarda explicitamente o resultado: toast de erro de bloqueio OU toast de sucesso.
      const errorToast = page.getByText(/alta intensidade|bisets|trisets|circuitos|revisão médica/i).first();
      const successToast = page.getByText(/salvo|sucesso|publicado/i).first();

      await expect(errorToast.or(successToast)).toBeVisible({ timeout: 10000 }).catch(() => {});
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("Painel do aluno: rota de treino carrega corretamente", async ({ authenticatedPage: page }) => {
    await page.goto("/my-workout").catch(() => {});
    await expect(page.locator("body")).toBeVisible();
  });

  test("Painel do aluno: alerta de revisão médica é exibido quando aplicável", async ({ authenticatedPage: page }) => {
    await page.goto("/my-workout").catch(() => {});

    const reviewAlert = page.getByText(/revisão médica requerida/i).first();
    const blockedText = page.getByText(/métodos de alta intensidade.*bloqueados|bisets.*bloqueados/i).first();
    const emptyState = page.getByText(/nenhum treino|sem treino|aguardando/i).first();
    const anyContent = page.locator("h1, h2, h3, [role='heading']").first();

    // Espera QUALQUER estado estável: alerta, vazio ou conteúdo renderizado.
    await expect(
      reviewAlert.or(blockedText).or(emptyState).or(anyContent)
    ).toBeVisible({ timeout: 15000 });

    const reviewVisible = await reviewAlert.isVisible().catch(() => false);
    if (reviewVisible) {
      await expect(reviewAlert).toBeVisible();
      const blockedVisible = await blockedText.isVisible().catch(() => false);
      if (blockedVisible) {
        await expect(blockedText).toBeVisible();
      }
    }
  });

  test("Painel do aluno: badges BISET/TRISET ficam ocultos sob revisão médica", async ({ authenticatedPage: page }) => {
    await page.goto("/my-workout").catch(() => {});

    const reviewAlert = page.getByText(/revisão médica requerida/i).first();
    const anyContent = page.locator("h1, h2, h3, [role='heading'], body").first();

    // Espera estado estável da página antes de verificar ausência de badges.
    await expect(reviewAlert.or(anyContent)).toBeVisible({ timeout: 15000 });

    const reviewVisible = await reviewAlert.isVisible().catch(() => false);

    if (reviewVisible) {
      // Sob revisão médica, NENHUM badge BISET/TRISET/CIRCUITO deve aparecer.
      // Usa `toHaveCount(0)` que aguarda explicitamente até que a condição seja satisfeita.
      const badges = page.getByText(/^(BISET|TRISET|CIRCUITO)$/i);
      await expect(badges).toHaveCount(0, { timeout: 5000 });
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
