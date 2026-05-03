import { test, expect } from "@playwright/test";

/**
 * E2E — Governance is the sole orchestrator (Débora scenario).
 *
 * Validates:
 *   1. Patient without consent landing on /anamnesis is redirected to /consent.
 *   2. After accepting consent, they reach /anamnesis (or the next canonical route).
 *   3. No redirect loop (we count navigations within 3s).
 */
test.describe("Governance — onboarding flow has no loop", () => {
  test("consentless patient → /consent → /anamnesis without looping", async ({ page }) => {
    const navigations: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    // Test fixture: a patient without consent. Adapt baseURL/login as needed.
    // Skipped softly when fixtures aren't provisioned in this env.
    const email = process.env.E2E_PATIENT_NO_CONSENT_EMAIL;
    const password = process.env.E2E_PATIENT_NO_CONSENT_PASSWORD;
    test.skip(!email || !password, "E2E patient fixture not provisioned");

    await page.goto("/auth");
    await page.getByLabel(/e-?mail/i).fill(email!);
    await page.getByLabel(/senha|password/i).fill(password!);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();

    // Try going to /anamnesis directly
    await page.goto("/anamnesis");
    await page.waitForURL(/\/consent/, { timeout: 5000 });
    expect(page.url()).toContain("/consent");

    // Accept consent
    await page.getByRole("button", { name: /aceitar|continuar|concordo/i }).click();

    // Should now move out of /consent (governance recomputes after state update)
    await page.waitForURL((url) => !url.pathname.includes("/consent"), { timeout: 8000 });

    // Loop detector: more than 6 navigations during this flow indicates loop
    expect(navigations.length).toBeLessThan(7);
  });
});
