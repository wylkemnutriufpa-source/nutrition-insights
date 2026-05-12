/**
 * Sprint 1 — Testes de invalidação de queries críticas
 */
import { describe, it, expect, vi } from "vitest";
import { invalidateCriticalQueries, invalidateNutritionistQueries } from "@/lib/queryInvalidation";

function createMockQueryClient() {
  return {
    invalidateQueries: vi.fn(),
  } as any;
}

describe("Query Invalidation", () => {
  it("invalidateCriticalQueries invalida queries obrigatórias", () => {
    const qc = createMockQueryClient();
    invalidateCriticalQueries(qc);
    const calls = qc.invalidateQueries.mock.calls.map((c: any) => c[0].queryKey[0]);
    expect(calls).toContain("patients");
    expect(calls).toContain("dashboard");
    expect(calls).toContain("payment-guard");
    expect(calls).toContain("notifications");
    expect(calls).toContain("meal-plans");
  });

  it("invalidateCriticalQueries com patientId invalida queries específicas", () => {
    const qc = createMockQueryClient();
    invalidateCriticalQueries(qc, "patient-123");
    const calls = qc.invalidateQueries.mock.calls;
    const keys = calls.map((c: any) => c[0].queryKey);
    expect(keys).toContainEqual(["lifecycle", "patient-123"]);
    expect(keys).toContainEqual(["patient-detail", "patient-123"]);
    expect(keys).toContainEqual(["checklist", "patient-123"]);
  });

  it("invalidateNutritionistQueries invalida queries de profissional", () => {
    const qc = createMockQueryClient();
    invalidateNutritionistQueries(qc);
    const calls = qc.invalidateQueries.mock.calls.map((c: any) => c[0].queryKey[0]);
    expect(calls).toContain("patients");
    expect(calls).toContain("dashboard");
    expect(calls).toContain("protocols");
  });

  it("todas as chamadas usam refetchType: all", () => {
    const qc = createMockQueryClient();
    invalidateCriticalQueries(qc, "p1");
    const allCalls = qc.invalidateQueries.mock.calls;
    allCalls.forEach((call: any) => {
      expect(call[0].refetchType).toBe("all");
    });
  });
});
