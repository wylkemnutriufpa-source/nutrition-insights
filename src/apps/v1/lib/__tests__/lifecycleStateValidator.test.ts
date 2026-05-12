import { describe, it, expect } from "vitest";
import { validateLifecycleEnvelope } from "../lifecycleStateValidator";

describe("lifecycleStateValidator", () => {
  it("should validate a valid active plan envelope", () => {
    const data = {
      has_active_plan: true,
      plan_id: "uuid-123",
      plan_title: "Plano Hipertrofia",
      plan: { meals: [] }
    };
    const result = validateLifecycleEnvelope(data);
    expect(result.ok).toBe(true);
  });

  it("should validate when no active plan exists", () => {
    const data = { has_active_plan: false };
    const result = validateLifecycleEnvelope(data);
    expect(result.ok).toBe(true);
  });

  it("should reject empty or null data", () => {
    expect(validateLifecycleEnvelope(null).ok).toBe(false);
    expect(validateLifecycleEnvelope(undefined).ok).toBe(false);
    // @ts-ignore
    expect(validateLifecycleEnvelope("not an object").ok).toBe(false);
  });

  it("should reject active plan without plan_id", () => {
    const data = { has_active_plan: true, plan_title: "Title", plan: {} };
    const result = validateLifecycleEnvelope(data);
    expect(result.ok).toBe(false);
    expect(result.issues[0].field).toBe("plan_id");
  });

  it("should reject active plan without plan_title", () => {
    const data = { has_active_plan: true, plan_id: "id", plan: {} };
    const result = validateLifecycleEnvelope(data);
    expect(result.ok).toBe(false);
    expect(result.issues[0].field).toBe("plan_title");
  });

  it("should reject active plan without plan object", () => {
    const data = { has_active_plan: true, plan_id: "id", plan_title: "Title", plan: null };
    const result = validateLifecycleEnvelope(data);
    expect(result.ok).toBe(false);
    expect(result.issues[0].field).toBe("plan");
  });

  it("should handle malicious types for required fields", () => {
    const data = {
      has_active_plan: true,
      plan_id: 123, // Should be string
      plan_title: true, // Should be string
      plan: "string" // Should be object
    };
    const result = validateLifecycleEnvelope(data as any);
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(3);
  });
});
