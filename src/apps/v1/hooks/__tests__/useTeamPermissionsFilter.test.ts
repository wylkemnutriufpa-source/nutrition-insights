import { describe, it, expect } from "vitest";

// Unit test for the route-permission mapping logic (pure function)
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/patients": "can_view_patients",
  "/patient/": "can_view_patient_details",
  "/plano-alimentar": "can_view_meal_plans",
  "/editor-v2": "can_edit_meal_plans",
  "/onboarding-pipeline": "can_view_pending_plans",
  "/checkin": "can_view_checkins",
  "/chat": "can_respond_feedback",
  "/timeline": "can_view_timeline",
  "/projecao-corporal": "can_view_projection",
  "/alertas-clinicos": "can_view_clinical_risk",
  "/ranking": "can_access_ranking",
  "/relatorios": "can_access_reports",
  "/financeiro": "can_access_financial",
  "/automacoes": "can_manage_automation",
  "/team": "can_manage_team",
};

function isRouteAllowed(route: string, permissions: Record<string, boolean>): boolean {
  for (const [routePattern, permKey] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (route === routePattern || route.startsWith(routePattern)) {
      return permissions[permKey] === true;
    }
  }
  return true;
}

describe("Route Permission Filtering", () => {
  const defaultPerms: Record<string, boolean> = {
    can_view_patients: true,
    can_view_patient_details: true,
    can_view_meal_plans: true,
    can_edit_meal_plans: false,
    can_view_pending_plans: true,
    can_approve_plans: false,
    can_view_checkins: true,
    can_respond_feedback: true,
    can_view_timeline: true,
    can_view_projection: true,
    can_view_clinical_risk: false,
    can_access_ranking: false,
    can_access_reports: false,
    can_access_financial: false,
    can_manage_automation: false,
    can_manage_team: false,
  };

  it("allows routes with permission set to true", () => {
    expect(isRouteAllowed("/patients", defaultPerms)).toBe(true);
    expect(isRouteAllowed("/checkin", defaultPerms)).toBe(true);
    expect(isRouteAllowed("/plano-alimentar", defaultPerms)).toBe(true);
  });

  it("blocks routes with permission set to false", () => {
    expect(isRouteAllowed("/editor-v2", defaultPerms)).toBe(false);
    expect(isRouteAllowed("/financeiro", defaultPerms)).toBe(false);
    expect(isRouteAllowed("/team", defaultPerms)).toBe(false);
    expect(isRouteAllowed("/alertas-clinicos", defaultPerms)).toBe(false);
  });

  it("allows unknown routes by default", () => {
    expect(isRouteAllowed("/", defaultPerms)).toBe(true);
    expect(isRouteAllowed("/settings", defaultPerms)).toBe(true);
    expect(isRouteAllowed("/some-random-page", defaultPerms)).toBe(true);
  });

  it("matches route prefixes (e.g. /patient/:id)", () => {
    expect(isRouteAllowed("/patient/abc-123", defaultPerms)).toBe(true);
  });

  it("blocks all routes when all perms are false", () => {
    const noPerms = Object.fromEntries(
      Object.entries(defaultPerms).map(([k]) => [k, false])
    );
    expect(isRouteAllowed("/patients", noPerms)).toBe(false);
    expect(isRouteAllowed("/checkin", noPerms)).toBe(false);
    // Dashboard still accessible
    expect(isRouteAllowed("/", noPerms)).toBe(true);
  });
});
