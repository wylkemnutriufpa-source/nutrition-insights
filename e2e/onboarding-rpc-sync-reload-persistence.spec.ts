/**
 * FitJourney E2E — RPC sync failure persists across page reloads
 *
 * Validates the resilience contract introduced for the onboarding pipeline:
 * when a patient has finished generating their plan but the lifecycle-sync
 * RPC `complete_patient_onboarding_by_patient` is failing repeatedly, the
 * "Sincronização pendente" warning banner MUST keep showing on every page
 * reload (and the pipeline state must NOT regress) until the RPC finally
 * succeeds. This is achieved by an auto-sync-on-mount effect that re-detects
 * the inconsistent backend state and re-derives `syncError`.
 *
 * Scenario:
 *   1. The mocked pipeline already has `plan_generated=true`,
 *      `plan_approved=false`. This represents a patient that finished
 *      generating their plan in a previous session.
 *   2. The RPC mock returns 500 on every call.
 *   3. After the page mounts, the auto-sync effect re-attempts the RPC,
 *      gets a failure, and re-shows the banner.
 *   4. We reload the page (Ctrl+R / `page.reload()`) and assert the banner
 *      is STILL visible — confirming persistence-via-redetection.
 *   5. The pipeline must continue showing "plan generated / awaiting
 *      approval" — never regressing to the preferences form or empty state.
 */
import { test, expect } from "./fixtures";
import type { Page, Route } from "@playwright/test";

type MockState = {
  rpcShouldFail: boolean;
  rpcCalls: number;
};

function pipelineRow() {
  return {
    id: "pipeline-rpc-reload",
    patient_id: "patient-rpc-reload",
    status: "pending_approval",
    anamnesis_completed: true,
    body_data_completed: true,
    preferences_completed: true,
    plan_generated: true,
    plan_approved: false,
    weight: 70,
    height: 170,
    wake_time: "06:30",
    sleep_time: "23:00",
    meal_count: 5,
    cooking_preference: "homemade",
    food_preferences: { favorites: "frango", disliked: "" },
    generated_plan_data: { success: true, mealPlanId: "mp-reload-1" },
    nutritionist_id: "nutri-rpc-reload",
    rejection_reason: null,
    created_at: new Date(Date.now() - 7200_000).toISOString(),
    updated_at: new Date(Date.now() - 1800_000).toISOString(),
  };
}

async function installFailingSyncMocks(page: Page, state: MockState) {
  // Pipeline SELECT — always returns the "plan generated, awaiting approval"
  // state, mirroring what the DB would return after a previous session.
  await page.route(/\/rest\/v1\/onboarding_pipelines(\?|$).*/i, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pipelineRow()),
      });
      return;
    }
    return route.continue();
  });

  // RPC `complete_patient_onboarding_by_patient` — fails until flag flips.
  await page.route(
    /\/rest\/v1\/rpc\/complete_patient_onboarding_by_patient.*/i,
    async (route: Route) => {
      state.rpcCalls += 1;
      if (state.rpcShouldFail) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "P0001",
            message: "Transient sync failure (e2e mock — reload persistence)",
            details: null,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    },
  );

  // Anamnesis lookup — return null (anamnesis_completed comes from pipeline flag).
  await page.route(/\/rest\/v1\/patient_anamnesis(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
}

const PIPELINE_COHERENT_SIGNALS = [
  /seu plano foi gerado/i,
  /aguardando (revis(ã|a)o|aprova(ç|c)(ã|a)o)/i,
  /pr(é|e)-plano/i,
];

const PIPELINE_REGRESSION_SIGNALS = [
  /salvar e continuar/i, // preferences form
  /gerar meu pr(é|e)-plano/i, // step 4 button
  /nenhum onboarding ativo/i, // empty state
];

async function expectBannerAndCoherentState(page: Page) {
  // Banner is visible
  const banner = page.getByText(/sincroniza(ç|c)(ã|a)o pendente/i);
  await expect(banner).toBeVisible({ timeout: 15000 });

  // Retry button is visible & enabled
  const retryBtn = page.getByRole("button", { name: /tentar sincronizar novamente/i });
  await expect(retryBtn).toBeVisible();
  await expect(retryBtn).toBeEnabled();

  // Pipeline remains coherent: shows "plan generated / awaiting approval"
  const bodyText = await page.locator("body").innerText();
  const coherent = PIPELINE_COHERENT_SIGNALS.some((re) => re.test(bodyText));
  expect(
    coherent,
    `Pipeline incoerente após render. Texto: ${bodyText.slice(0, 600)}`,
  ).toBe(true);

  // And does NOT regress to earlier steps or empty state
  for (const re of PIPELINE_REGRESSION_SIGNALS) {
    expect(
      re.test(bodyText),
      `Pipeline regrediu — encontrou padrão proibido: ${re}`,
    ).toBe(false);
  }
}

test.describe("Onboarding RPC sync — banner persistence across reloads", () => {
  test("banner 'Sincronização pendente' permanece após reload enquanto a RPC continua falhando", async ({
    authenticatedPage,
  }) => {
    const state: MockState = { rpcShouldFail: true, rpcCalls: 0 };
    await installFailingSyncMocks(authenticatedPage, state);

    // First load — auto-sync-on-mount runs, RPC fails, banner appears.
    await authenticatedPage.goto("/onboarding-pipeline");
    await authenticatedPage.waitForLoadState("networkidle");
    await expectBannerAndCoherentState(authenticatedPage);

    const callsAfterFirstLoad = state.rpcCalls;
    expect(callsAfterFirstLoad).toBeGreaterThanOrEqual(1);

    // Reload — auto-sync runs again, RPC fails again, banner re-appears.
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await expectBannerAndCoherentState(authenticatedPage);

    expect(
      state.rpcCalls,
      "Auto-sync-on-mount não foi reexecutado após reload",
    ).toBeGreaterThan(callsAfterFirstLoad);

    // A second reload — same contract: banner persists, pipeline coherent.
    const callsAfterSecondLoad = state.rpcCalls;
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await expectBannerAndCoherentState(authenticatedPage);

    expect(state.rpcCalls).toBeGreaterThan(callsAfterSecondLoad);
  });

  test("após a RPC voltar a funcionar, o reload finalmente NÃO mostra mais o banner", async ({
    authenticatedPage,
  }) => {
    const state: MockState = { rpcShouldFail: true, rpcCalls: 0 };
    await installFailingSyncMocks(authenticatedPage, state);

    // First load: failure → banner visible
    await authenticatedPage.goto("/onboarding-pipeline");
    await authenticatedPage.waitForLoadState("networkidle");
    await expect(
      authenticatedPage.getByText(/sincroniza(ç|c)(ã|a)o pendente/i),
    ).toBeVisible({ timeout: 15000 });

    // Backend recovers
    state.rpcShouldFail = false;

    // Reload — auto-sync now succeeds, banner must NOT appear.
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");

    await expect(
      authenticatedPage.getByText(/sincroniza(ç|c)(ã|a)o pendente/i),
    ).toHaveCount(0, { timeout: 15000 });

    // Pipeline still coherent (plan-generated state visible).
    const bodyText = await authenticatedPage.locator("body").innerText();
    const coherent = PIPELINE_COHERENT_SIGNALS.some((re) => re.test(bodyText));
    expect(coherent).toBe(true);
  });
});
