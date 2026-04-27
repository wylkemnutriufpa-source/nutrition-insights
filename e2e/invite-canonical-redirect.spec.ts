import { test, expect } from "@playwright/test";

/**
 * E2E: garantir que TODAS as rotas legadas de convite redirecionem para
 * /cadastro?code=... preservando query string e hash, e nunca caiam em 404
 * nem na home (/).
 *
 * Este é o contrato canônico: o único link válido emitido pelo app é
 * /cadastro?code=CODE. As variantes /convite/CODE, /~oauth/convite/CODE e
 * /convite (sem code) só existem como redirects defensivos e DEVEM funcionar
 * mesmo com Service Worker preso, parâmetros adicionais e hash.
 */

const RUNS = [
  {
    name: "/convite/CODE puro → /cadastro?code=CODE",
    input: "/convite/ABC123",
    expectedPath: "/cadastro",
    expectQuery: ["code=ABC123"],
    expectHash: "",
  },
  {
    name: "/convite/CODE com query extra preserva ambos",
    input: "/convite/KX48RP?ref=whatsapp&utm_source=share",
    expectedPath: "/cadastro",
    expectQuery: ["code=KX48RP", "ref=whatsapp", "utm_source=share"],
    expectHash: "",
  },
  {
    name: "/convite/CODE com hash preserva fragmento",
    input: "/convite/ZZZ999#onboarding",
    expectedPath: "/cadastro",
    expectQuery: ["code=ZZZ999"],
    expectHash: "#onboarding",
  },
  {
    name: "/~oauth/convite/CODE → /cadastro?code=CODE",
    input: "/~oauth/convite/HEALTHCHECK",
    expectedPath: "/cadastro",
    expectQuery: ["code=HEALTHCHECK"],
    expectHash: "",
  },
  {
    name: "/convite (sem code) → /cadastro",
    input: "/convite",
    expectedPath: "/cadastro",
    expectQuery: [],
    expectHash: "",
  },
];

test.describe("Convite canônico: redirect /convite/* → /cadastro?code=", () => {
  for (const run of RUNS) {
    test(run.name, async ({ page }) => {
      const response = await page.goto(run.input);
      expect(response, "navegação deve retornar resposta").not.toBeNull();
      expect(
        response!.status(),
        "SPA fallback deve sempre devolver 200 (sem 404 do hosting)",
      ).toBeLessThan(400);

      await page.waitForLoadState("networkidle");

      // 404 page não deve aparecer
      const notFoundHeading = page.getByRole("heading", {
        name: /Página não encontrada/i,
      });
      await expect(notFoundHeading).toHaveCount(0);

      const finalPath = await page.evaluate(() => window.location.pathname);
      expect(finalPath, "não pode ficar em /convite/* nem em /~oauth/*").toBe(
        run.expectedPath,
      );
      expect(finalPath, "redirect não pode degradar para /").not.toBe("/");

      const finalSearch = await page.evaluate(() => window.location.search);
      for (const q of run.expectQuery) {
        expect(finalSearch, `query deve preservar ${q}`).toContain(q);
      }

      if (run.expectHash) {
        const finalHash = await page.evaluate(() => window.location.hash);
        expect(finalHash).toBe(run.expectHash);
      }
    });
  }
});
