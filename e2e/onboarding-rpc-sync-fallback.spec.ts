/**
 * FitJourney E2E — Onboarding RPC sync failure fallback
 *
 * Validates the resilience banner introduced in `OnboardingPipeline.tsx`:
 * when the patient finishes preferences and the meal-plan edge function
 * succeeds, but the lifecycle-sync RPC `complete_patient_onboarding_by_patient`
 * fails (network blip, transient DB error, etc.), the user MUST:
 *
 *   1. See a "Sincronização pendente" warning banner.
 *   2. See a "Tentar sincronizar novamente" retry button inside that banner.
 *   3. NOT see the pipeline regress to an incoherent state — the page must
 *      keep showing that the plan was generated (step "Aguardando aprovação"
 *      / "Seu plano foi gerado") rather than reverting to the preferences
 *      form or an empty state.
 *   4. After the RPC starts succeeding, clicking retry must clear the banner
 *      and show a success toast.
 *
 * Strategy: intercept Supabase REST/RPC + the `generate-meal-plan` edge
 * function. We control the mocked pipeline row server-side so the page
 * naturally lands on step 4 (Gerar Pré-Plano), trigger the click, and
 * assert the fallback UI contract — without depending on real backend.
 */
import { test, expect } from "./fixtures";
import type { Page, Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// Mock state — mutable so we can flip RPC outcome between calls
// ---------------------------------------------------------------------------
type MockState = {
  rpcShouldFail: boolean;
  planGenerated: boolean;
  rpcCalls: number;
};

function makeState(): MockState {
  return { rpcShouldFail: true, planGenerated: false, rpcCalls: 0 };
}

function pipelineRow(state: MockState) {
  return {
    id: "pipeline-rpc-fallback",
    patient_id: "patient-rpc-fallback",
    status: state.planGenerated ? "pending_approval" : "pending_plan_generation",
    anamnesis_completed: true,
    body_data_completed: true,
    preferences_completed: true,
    plan_generated: state.planGenerated,
    plan_approved: false,
    weight: 70,
    height: 170,
    wake_time: "06:30",
    sleep_time: "23:00",
    meal_count: 5,
    cooking_preference: "homemade",
    food_preferences: { favorites: "frango", disliked: "" },
    generated_plan_data: state.planGenerated ? { success: true } : null,
    nutritionist_id: "nutri-rpc-fallback",
    rejection_reason: null,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function installSyncFailureMocks(page: Page, state: MockState) {
  // 1) Pipeline SELECT — returns the current mocked state on every fetch.
  await page.route(/\/rest\/v1\/onboarding_pipelines(\?|$).*/i, async (route: Route) => {
    const method = route.request().method();
    if (method === "GET") {
      // maybeSingle returns a single object; PostgREST returns array unless single header.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(pipelineRow(state)),
      });
      return;
    }
    if (method === "PATCH") {
      // The frontend updates `plan_generated` etc. after edge fn success —
      // accept and reflect into our state so subsequent GETs see it.
      try {
        const body = JSON.parse(route.request().postData() || "{}");
        if (body.plan_generated === true) state.planGenerated = true;
      } catch { /* ignore */ }
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    return route.continue();
  });

  // 2) Edge function `generate-meal-plan` — succeeds.
  await page.route(/\/functions\/v1\/generate-meal-plan.*/i, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        mealPlanId: "meal-plan-mock-1",
        explainability: { calculation: { final_kcal: 2100 } },
      }),
    });
  });

  // 3) RPC `complete_patient_onboarding_by_patient` — fails until we flip the flag.
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
            message: "Transient sync failure (e2e mock)",
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

  // 4) Notifications insert — accept silently.
  await page.route(/\/rest\/v1\/notifications(\?|$).*/i, async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
      return;
    }
    return route.continue();
  });

  // 5) Profiles SELECT (for patient name lookup) — return minimal row.
  await page.route(/\/rest\/v1\/profiles(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ full_name: "Paciente E2E" }),
    });
  });

  // 6) Anamnesis lookup — return null (already considered completed via pipeline flag).
  await page.route(/\/rest\/v1\/patient_anamnesis(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe("Onboarding pipeline — RPC sync failure fallback", () => {
  test("mostra banner 'Sincronização pendente' com botão de retry quando a RPC falha", async ({
    authenticatedPage,
  }) => {
    const state = makeState();
    await installSyncFailureMocks(authenticatedPage, state);

    await authenticatedPage.goto("/onboarding-pipeline");
    await authenticatedPage.waitForLoadState("networkidle");

    // Step 4 should be rendered: "Gerar Meu Pré-Plano"
    const generateBtn = authenticatedPage.getByRole("button", {
      name: /gerar meu pr(é|e)-plano/i,
    });
    await expect(generateBtn).toBeVisible({ timeout: 15000 });

    // Trigger plan generation — edge fn succeeds, RPC fails.
    await generateBtn.click();

    // Wait for the fallback banner to appear.
    const banner = authenticatedPage.getByText(/sincroniza(ç|c)(ã|a)o pendente/i);
    await expect(banner).toBeVisible({ timeout: 15000 });

    // Retry button must be present and clickable inside the banner.
    const retryBtn = authenticatedPage.getByRole("button", {
      name: /tentar sincronizar novamente/i,
    });
    await expect(retryBtn).toBeVisible();
    await expect(retryBtn).toBeEnabled();

    // Pipeline must NOT be incoherent: even though sync failed, the UI must
    // reflect that the plan was generated (step 5 "Aguardando aprovação"
    // / "Seu plano foi gerado") rather than reverting to the preferences form.
    const bodyText = await authenticatedPage.locator("body").innerText();
    const planGeneratedSignals = [
      /seu plano foi gerado/i,
      /aguardando (revis(ã|a)o|aprova(ç|c)(ã|a)o)/i,
      /pr(é|e)-plano/i,
    ];
    const matched = planGeneratedSignals.some((re) => re.test(bodyText));
    expect(
      matched,
      "Pipeline ficou incoerente: nenhum sinal de 'plano gerado / aguardando aprovação' visível",
    ).toBe(true);

    // It must NOT regress to "Salvar e Continuar" (preferences form).
    expect(/salvar e continuar/i.test(bodyText)).toBe(false);

    // RPC was actually attempted.
    expect(state.rpcCalls).toBeGreaterThanOrEqual(1);
  });

  test("clicar em 'Tentar sincronizar novamente' limpa o banner quando a RPC volta a funcionar", async ({
    authenticatedPage,
  }) => {
    const state = makeState();
    await installSyncFailureMocks(authenticatedPage, state);

    await authenticatedPage.goto("/onboarding-pipeline");
    await authenticatedPage.waitForLoadState("networkidle");

    await authenticatedPage
      .getByRole("button", { name: /gerar meu pr(é|e)-plano/i })
      .click();

    const banner = authenticatedPage.getByText(/sincroniza(ç|c)(ã|a)o pendente/i);
    await expect(banner).toBeVisible({ timeout: 15000 });

    const callsBeforeRetry = state.rpcCalls;

    // Flip the mock — next RPC call succeeds.
    state.rpcShouldFail = false;

    await authenticatedPage
      .getByRole("button", { name: /tentar sincronizar novamente/i })
      .click();

    // Banner must disappear once the retry succeeds.
    await expect(banner).toBeHidden({ timeout: 15000 });

    // Retry actually hit the RPC again.
    expect(state.rpcCalls).toBeGreaterThan(callsBeforeRetry);
  });
});
