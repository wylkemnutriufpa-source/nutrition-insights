/**
 * FitJourney E2E — Onboarding Completion → "Plano em Revisão" state
 *
 * Validates the regression scenario discovered with patient "Mayara":
 *  - When a patient finishes anamnesis + body data + preferences (and the
 *    pipeline reaches `completed` / `plan_generated` but `plan_approved=false`)
 *    the system MUST treat them as `plan_pending_production` (a.k.a.
 *    "Plano em Revisão") and NOT as an empty/abandoned dashboard.
 *  - False-positive alerts (abandonment / low adherence) must NOT be shown
 *    to the patient while the first plan has not been approved.
 *
 * Strategy: intercept Supabase RPC / REST calls and inject a synthetic
 * lifecycle payload representing a freshly-completed onboarding. We then
 * navigate the patient surfaces (/client-dashboard, /my-diet, /journey) and
 * assert UI contract:
 *   1. The "Plano em Revisão" banner / state indicator is visible.
 *   2. The dashboard is NOT in an empty/zero state (no "vazio", no
 *      "Comece seu onboarding" calls-to-action).
 *   3. No clinical-alert toxic copy (e.g., "risco de abandono",
 *      "baixa adesão", "abandono") leaks into the rendered page.
 */
import { test, expect, type Page, type Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// Synthetic lifecycle payload — mirrors resolve_patient_lifecycle_state output
// for a patient who completed onboarding and is awaiting professional approval
// ---------------------------------------------------------------------------
const COMPLETED_LIFECYCLE = {
  lifecycle_state: "plan_pending_production",
  has_active_plan: false,
  has_pending_onboarding: true,
  has_clinical_alert: false,
  has_retention_risk: false,
  last_checkin_at: null,
  last_plan_delivery_at: null,
  adherence_score: 0,
  risk_score: 0,
  days_inactive: 0,
  plan_id: null,
  plan_title: null,
  next_recommended_action: "Aguardar aprovação do plano pelo profissional",
  onboarding_status: "completed",
  is_onboarding_blocked: false,
  onboarding_block_reason: null,
};

const COMPLETED_JOURNEY_ROW = [
  {
    journey_status: "draft_ready_for_review",
    status: "active",
    created_at: new Date().toISOString(),
  },
];

const COMPLETED_PIPELINE_ROW = [
  {
    id: "pipeline-e2e",
    patient_id: "patient-e2e",
    status: "completed",
    current_step: "plan_review",
    anamnesis_completed: true,
    body_data_completed: true,
    preferences_completed: true,
    plan_approved: false,
    plan_generated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

// Toxic copy that must NEVER reach the patient while the first plan has not
// been approved. These are the false-positive labels we explicitly fixed.
const TOXIC_PATIENT_COPY = [
  /risco de abandono/i,
  /possível abandono/i,
  /baixa ades(ã|a)o/i,
  /paciente inativo/i,
  /sem check-?in/i,
];

// ---------------------------------------------------------------------------
// Network interception — rewrite responses related to lifecycle / onboarding
// ---------------------------------------------------------------------------
async function installCompletedOnboardingMocks(page: Page) {
  await page.route(/\/rest\/v1\/rpc\/resolve_patient_lifecycle_state.*/i, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(COMPLETED_LIFECYCLE),
    });
  });

  await page.route(/\/rest\/v1\/nutritionist_patients(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(COMPLETED_JOURNEY_ROW),
    });
  });

  await page.route(/\/rest\/v1\/onboarding_pipelines(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(COMPLETED_PIPELINE_ROW),
    });
  });

  // Force clinical_alerts to be empty — false positives must NOT appear.
  await page.route(/\/rest\/v1\/clinical_alerts(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  // engagement_signals also empty — no retention risk while awaiting approval.
  await page.route(/\/rest\/v1\/engagement_signals(\?|$).*/i, async (route: Route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
}

// ---------------------------------------------------------------------------
// Heuristics for asserting the "Plano em Revisão" state in the rendered DOM
// ---------------------------------------------------------------------------
const REVIEW_STATE_PATTERNS = [
  /plano em revis(ã|a)o/i,
  /aguardando aprova(ç|c)(ã|a)o/i,
  /plano sendo revisado/i,
  /em an(á|a)lise pelo/i,
  /revis(ã|a)o do (seu )?plano/i,
];

const EMPTY_DASHBOARD_PATTERNS = [
  /comece seu onboarding/i,
  /nenhum dado dispon(í|i)vel/i,
  /dashboard vazio/i,
  /voc(ê|e) ainda n(ã|a)o iniciou/i,
];

async function expectReviewStateVisible(page: Page) {
  // At least one "in review" signal must be present somewhere in the page.
  const bodyText = await page.locator("body").innerText();
  const matched = REVIEW_STATE_PATTERNS.some((re) => re.test(bodyText));
  expect(
    matched,
    `Expected one of the "Plano em Revisão" indicators to be visible. Page text: ${bodyText.slice(0, 800)}`,
  ).toBe(true);
}

async function expectDashboardNotEmpty(page: Page) {
  const bodyText = await page.locator("body").innerText();
  for (const re of EMPTY_DASHBOARD_PATTERNS) {
    expect(re.test(bodyText), `Empty-dashboard copy "${re}" should NOT appear after onboarding completion`).toBe(false);
  }
  // Sanity: page should have meaningful content (more than a tiny spinner shell)
  expect(bodyText.trim().length).toBeGreaterThan(80);
}

async function expectNoToxicAlerts(page: Page) {
  const bodyText = await page.locator("body").innerText();
  for (const re of TOXIC_PATIENT_COPY) {
    expect(
      re.test(bodyText),
      `False-positive alert copy "${re}" must NOT be shown while plan is pending approval`,
    ).toBe(false);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe("Onboarding completion → Plano em Revisão", () => {
  test.beforeEach(async ({ page }) => {
    await installCompletedOnboardingMocks(page);
  });

  test("/client-dashboard mostra estado 'Plano em Revisão' e não fica vazio", async ({ page }) => {
    await page.goto("/client-dashboard");
    await page.waitForLoadState("networkidle");

    await expectReviewStateVisible(page);
    await expectDashboardNotEmpty(page);
    await expectNoToxicAlerts(page);
  });

  test("/my-diet exibe banner de plano em revisão (sem alertas falsos)", async ({ page }) => {
    await page.goto("/my-diet");
    await page.waitForLoadState("networkidle");

    await expectReviewStateVisible(page);
    await expectNoToxicAlerts(page);
  });

  test("/journey reflete onboarding concluído e aguardando aprovação", async ({ page }) => {
    await page.goto("/journey");
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();
    // Either the explicit review copy, or a journey marker indicating the
    // onboarding step is complete and the next step is plan delivery.
    const reviewOrComplete =
      REVIEW_STATE_PATTERNS.some((re) => re.test(bodyText)) ||
      /(onboarding )?conclu(í|i)do/i.test(bodyText) ||
      /pr(ó|o)ximo passo:.*plano/i.test(bodyText);

    expect(reviewOrComplete, "Expected journey to reflect completed onboarding / pending plan").toBe(true);
    await expectNoToxicAlerts(page);
  });

  test("nenhum alerta clínico de abandono/baixa adesão é renderizado", async ({ page }) => {
    // Visit the most alert-heavy surfaces and verify no toxic copy slips in.
    for (const path of ["/client-dashboard", "/my-diet", "/journey"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoToxicAlerts(page);
    }
  });
});
