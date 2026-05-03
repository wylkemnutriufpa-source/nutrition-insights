import { describe, it, expect } from "vitest";
import { resolveRoute, type PatientFlowState } from "../governance";

describe("resolveRoute — canonical state→route mapping", () => {
  const cases: Array<[PatientFlowState, string]> = [
    ["awaiting_consent", "/consent"],
    ["onboarding_slides", "/onboarding/paciente"],
    ["anamnesis", "/anamnesis"],
    ["collecting_profile", "/body-analysis"],
    ["ready_for_plan", "/client/dashboard"],
    ["plan_generated", "/client/dashboard"],
    ["active_plan", "/client/dashboard"],
  ];

  it.each(cases)("maps %s -> %s", (state, expected) => {
    expect(resolveRoute(state)).toBe(expected);
  });

  it("returns deterministic fallback for null/undefined/unknown state", () => {
    expect(resolveRoute(null)).toBe("/onboarding/paciente");
    expect(resolveRoute(undefined)).toBe("/onboarding/paciente");
    expect(resolveRoute("garbage_state")).toBe("/onboarding/paciente");
  });

  it("is pure: same input always produces same output", () => {
    for (const [state, expected] of cases) {
      expect(resolveRoute(state)).toBe(expected);
      expect(resolveRoute(state)).toBe(expected);
    }
  });

  it("every PatientFlowState maps to exactly one route (no duplicates per state)", () => {
    const map = new Map<string, string>();
    for (const [state, expected] of cases) {
      expect(map.has(state)).toBe(false);
      map.set(state, expected);
      expect(resolveRoute(state)).toBe(expected);
    }
  });
});
