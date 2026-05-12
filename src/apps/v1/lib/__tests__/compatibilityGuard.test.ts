import { describe, it, expect, vi } from "vitest";
import { validateContract, normalizeLifecycleStatus } from "../compatibilityGuard";

describe("compatibilityGuard", () => {
  describe("normalizeLifecycleStatus", () => {
    it("should map legacy status to new one", () => {
      expect(normalizeLifecycleStatus("new")).toBe("lead_created");
      expect(normalizeLifecycleStatus("followup")).toBe("clinical_followup_active");
    });

    it("should keep current status as is", () => {
      expect(normalizeLifecycleStatus("onboarding_active")).toBe("onboarding_active");
    });

    it("should fallback to lead_created for unknown status", () => {
      expect(normalizeLifecycleStatus("alien_status")).toBe("lead_created");
    });

    it("should handle null/undefined/mixed case", () => {
      expect(normalizeLifecycleStatus(null)).toBe("lead_created");
      expect(normalizeLifecycleStatus("  ACTIVE  ")).toBe("clinical_followup_active");
    });
  });

  describe("validateContract", () => {
    const validProfile = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      full_name: "John Doe",
      email: "john@example.com"
    };

    it("should map legacy aliases (name -> full_name)", () => {
      const legacy = { id: validProfile.id, name: "John Doe", email: "john@example.com" };
      const { data, warnings } = validateContract("profiles", legacy);
      expect(data).toMatchObject(validProfile);
      expect(warnings.some(w => w.includes("name"))).toBe(true);
    });

    it("should use fallback for missing required fields", () => {
      const incomplete = { id: validProfile.id, email: "john@example.com" };
      const { data, warnings } = validateContract("profiles", incomplete);
      expect((data as any).full_name).toBe("Sem nome");
      expect(warnings).toHaveLength(1);
    });

    it("should coerce types correctly", () => {
      const raw = { 
        id: validProfile.id, 
        full_name: "John", 
        email: "john@example.com",
        phone: 12345 // number instead of string
      };
      const { data } = validateContract("profiles", raw);
      expect((data as any).phone).toBe("12345");
    });

    it("should handle non-contract tables by returning as is", () => {
      const random = { foo: "bar" };
      const { data } = validateContract("unknown_table", random);
      expect(data).toEqual(random);
    });

    it("should handle malicious data (script in name)", () => {
       const xss = { id: validProfile.id, full_name: "<script>alert(1)</script>", email: "a@b.com" };
       const { data } = validateContract("profiles", xss);
       expect((data as any).full_name).toBe("<script>alert(1)</script>"); // Coercion doesn't sanitize HTML, just types
    });
  });
});
