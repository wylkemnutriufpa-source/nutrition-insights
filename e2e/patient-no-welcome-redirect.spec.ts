/**
 * Valida que um paciente autenticado, ao acessar rotas protegidas,
 * permanece na rota de destino (ou em outra rota /client/*) e NUNCA
 * é redirecionado de volta para /welcome ou /.
 *
 * Captura todos os logs `[NAV]` do console e, se um redirecionamento
 * indevido for detectado, falha o teste reportando o último `reason`.
 */
import { test, expect } from "./fixtures";

const PATIENT_ROUTES = [
  "/client/dashboard",
  "/my-diet",
  "/checkin",
  "/meals",
  "/journey",
];

type NavLog = {
  from?: string;
  to?: string;
  roles?: unknown;
  reason?: string;
  raw: string;
};

function attachNavCapture(page: import("@playwright/test").Page, sink: NavLog[]) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (!text.includes("[NAV]")) return;
    let parsed: NavLog = { raw: text };
    try {
      const args = msg.args();
      // Tenta extrair o segundo argumento (objeto) — best-effort.
      const match = text.match(/\{[\s\S]*\}$/);
      if (match) {
        const obj = JSON.parse(match[0].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
        parsed = { ...obj, raw: text };
      }
      void args;
    } catch {
      /* ignora parsing best-effort */
    }
    sink.push(parsed);
  });
}

test.describe("Paciente — sem redirect indevido para /welcome", () => {
  for (const route of PATIENT_ROUTES) {
    test(`permanece em ${route} sem voltar para /welcome`, async ({ unblockedPatientPage: page }) => {
      const navLogs: NavLog[] = [];
      attachNavCapture(page, navLogs);

      await page.goto(route, { waitUntil: "domcontentloaded" });

      // Aguarda eventual redirect interno se assentar.
      await page.waitForTimeout(2500);

      const finalUrl = new URL(page.url());
      const finalPath = finalUrl.pathname;

      const lastNav = navLogs[navLogs.length - 1];
      const lastReason = lastNav?.reason || lastNav?.raw || "(sem [NAV] capturado)";

      // Não pode ter caído em /welcome ou raiz.
      expect(
        finalPath,
        `Redirect indevido ao acessar ${route}. Último [NAV] reason: ${lastReason}`
      ).not.toMatch(/^\/welcome\b/);
      expect(
        finalPath,
        `Redirect indevido para raiz ao acessar ${route}. Último [NAV] reason: ${lastReason}`
      ).not.toBe("/");

      // Deve permanecer na rota original OU em outra rota válida do paciente.
      const stayedOrPatient =
        finalPath.startsWith(route) || finalPath.startsWith("/client/");
      expect(
        stayedOrPatient,
        `Esperava permanecer em ${route} ou em /client/*, mas foi para ${finalPath}. ` +
          `Último [NAV] reason: ${lastReason}`
      ).toBe(true);
    });
  }
});
