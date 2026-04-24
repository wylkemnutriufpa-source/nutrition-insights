import { describe, it, expect } from "vitest";
import {
  validateLifecycleEnvelope,
  assertLifecycleEnvelope,
} from "../lifecycleStateValidator";

describe("validateLifecycleEnvelope", () => {
  it("flags null/undefined envelope", () => {
    expect(validateLifecycleEnvelope(null).ok).toBe(false);
    expect(validateLifecycleEnvelope(undefined).ok).toBe(false);
  });

  it("passes when has_active_plan=false (no plan required)", () => {
    const res = validateLifecycleEnvelope({
      has_active_plan: false,
      plan_id: null,
      plan_title: null,
      plan: null,
    });
    expect(res.ok).toBe(true);
    expect(res.issues).toHaveLength(0);
  });

  it("passes when has_active_plan=true and all plan fields are coherent", () => {
    const res = validateLifecycleEnvelope({
      has_active_plan: true,
      plan_id: "00000000-0000-0000-0000-000000000001",
      plan_title: "Plano Teste",
      plan: { id: "00000000-0000-0000-0000-000000000001", title: "Plano Teste" },
    });
    expect(res.ok).toBe(true);
  });

  it("fails when has_active_plan=true but plan_id is null", () => {
    const res = validateLifecycleEnvelope({
      has_active_plan: true,
      plan_id: null,
      plan_title: "Plano Teste",
      plan: { id: "x", title: "y" },
    });
    expect(res.ok).toBe(false);
    expect(res.issues.map((i) => i.field)).toContain("plan_id");
    expect(res.message).toMatch(/plan_id/);
  });

  it("fails when has_active_plan=true but plan_title and plan are missing", () => {
    const res = validateLifecycleEnvelope({
      has_active_plan: true,
      plan_id: "abc",
      plan_title: null,
      plan: null,
    });
    expect(res.ok).toBe(false);
    const fields = res.issues.map((i) => i.field);
    expect(fields).toContain("plan_title");
    expect(fields).toContain("plan");
  });

  it("assertLifecycleEnvelope throws with issues attached", () => {
    expect(() =>
      assertLifecycleEnvelope({
        has_active_plan: true,
        plan_id: null,
        plan_title: null,
        plan: null,
      }),
    ).toThrow(/Inconsist[eê]ncia/);
  });

  it("assertLifecycleEnvelope is silent on coherent envelope", () => {
    expect(() =>
      assertLifecycleEnvelope({
        has_active_plan: true,
        plan_id: "p",
        plan_title: "t",
        plan: { id: "p", title: "t" },
      }),
    ).not.toThrow();
  });
});
