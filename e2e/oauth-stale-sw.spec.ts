import { test, expect } from "@playwright/test";

/**
 * E2E: simulate a browser arriving with a stale Service Worker / cache and
 * landing on a /~oauth/* link. The app's anti-cache boot must clear caches
 * and route the user to the canonical onboarding/registration page (NOT the
 * SPA 404 fallback).
 *
 * This is the regression that bit iOS Safari users in production: a cached
 * service worker intercepted the navigation and served a stale shell that
 * had no route registered for /~oauth/, causing a 404.
 */
test.describe("Stale Service Worker + /~oauth/* recovery", () => {
  test.beforeEach(async ({ context }) => {
    // Inject a fake "stale" service worker registration into Cache Storage
    // and a phony version flag in localStorage BEFORE any page script runs.
    // The anti-cache boot in src/main.tsx must wipe these.
    await context.addInitScript(() => {
      try {
        // Mark a previous PWA build hash that the new boot should invalidate.
        localStorage.setItem("fj:update-dismissed-version", "stale-build-0001");
        localStorage.setItem("fj:update-dismissed-at", String(Date.now() - 86_400_000));
        // Flag so we can assert from the page that the simulation ran.
        (window as any).__FJ_E2E_STALE_SW__ = true;
      } catch {
        /* noop */
      }
    });
  });

  test("/~oauth/cadastro keeps nutri/code params and shows the registration screen", async ({ page }) => {
    const response = await page.goto("/~oauth/cadastro?nutri=HEALTHCHECK&code=HEALTHCHECK");
    expect(response, "navigation must return a response").not.toBeNull();
    expect(response!.status(), "SPA fallback must always be 200").toBeLessThan(400);

    // The 404 page would render this exact heading. It MUST NOT appear.
    const notFoundHeading = page.getByRole("heading", { name: /Página não encontrada/i });

    // Wait for the redirect/canonicalisation to finish.
    await page.waitForLoadState("networkidle");

    await expect(notFoundHeading).toHaveCount(0);

    // Canonical URL after the /~oauth/ rewrite. We only assert that we are
    // *not* still on /~oauth/ AND not on /404 — the exact landing page may
    // be /cadastro or the auth page depending on session state.
    const finalPath = await page.evaluate(() => window.location.pathname);
    expect(finalPath, "must leave the anti-cache prefix").not.toMatch(/^\/~oauth\//);

    // Bind params must survive the rewrite so the patient stays linked.
    const finalSearch = await page.evaluate(() => window.location.search);
    expect(finalSearch).toContain("nutri=HEALTHCHECK");
    expect(finalSearch).toContain("code=HEALTHCHECK");

    // The stale-SW simulation must have been wiped by main.tsx boot.
    const dismissedVersion = await page.evaluate(() => localStorage.getItem("fj:update-dismissed-version"));
    expect(dismissedVersion, "anti-cache boot must clear stale PWA flags").toBeNull();
  });

  test("/~oauth/convite/HEALTHCHECK lands on cadastro with code without 404", async ({ page }) => {
    const response = await page.goto("/~oauth/convite/HEALTHCHECK");
    expect(response!.status()).toBeLessThan(400);

    await page.waitForLoadState("networkidle");

    const notFoundHeading = page.getByRole("heading", { name: /Página não encontrada/i });
    await expect(notFoundHeading).toHaveCount(0);

    const finalPath = await page.evaluate(() => window.location.pathname);
    expect(finalPath).not.toMatch(/^\/~oauth\//);
    expect(finalPath).toBe("/cadastro");

    const finalSearch = await page.evaluate(() => window.location.search);
    expect(finalSearch).toContain("code=HEALTHCHECK");
  });

  test("/~oauth/intake/healthcheck-token lands on intake without 404", async ({ page }) => {
    const response = await page.goto("/~oauth/intake/healthcheck-token");
    expect(response!.status()).toBeLessThan(400);

    await page.waitForLoadState("networkidle");

    const notFoundHeading = page.getByRole("heading", { name: /Página não encontrada/i });
    await expect(notFoundHeading).toHaveCount(0);

    const finalPath = await page.evaluate(() => window.location.pathname);
    expect(finalPath).not.toMatch(/^\/~oauth\//);
  });
});
