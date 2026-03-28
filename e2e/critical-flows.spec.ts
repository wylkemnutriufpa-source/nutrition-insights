/**
 * FitJourney E2E — Critical Flows
 * 
 * Tests the critical user journeys end-to-end.
 */
import { test, expect } from "./fixtures";

test.describe("Fluxos Críticos — Nutricionista", () => {
  test("deve acessar dashboard após login", async ({ nutriPage: page }) => {
    // After login, should be on dashboard or similar
    await expect(page.locator("body")).toBeVisible();
    const url = page.url();
    expect(url).not.toContain("/auth");
  });

  test("deve acessar lista de pacientes", async ({ nutriPage: page }) => {
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/patients");
  });

  test("deve abrir convite de paciente", async ({ nutriPage: page }) => {
    await page.goto("/invite-patient");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar planos alimentares", async ({ nutriPage: page }) => {
    await page.goto("/meal-plans");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar chat", async ({ nutriPage: page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar check-in panel", async ({ nutriPage: page }) => {
    await page.goto("/checkin-panel");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar relatórios", async ({ nutriPage: page }) => {
    await page.goto("/reports");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Fluxos Críticos — Paciente", () => {
  test("deve acessar dashboard do paciente", async ({ authenticatedPage: page }) => {
    await page.goto("/client-dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar plano alimentar do paciente", async ({ authenticatedPage: page }) => {
    await page.goto("/patient-meal-plan");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar checklist", async ({ authenticatedPage: page }) => {
    await page.goto("/checklist");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar check-in", async ({ authenticatedPage: page }) => {
    await page.goto("/checkin");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("deve acessar chat do paciente", async ({ authenticatedPage: page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
