/**
 * Sprint 1 — Smoke Tests: validação de imports e estruturas críticas
 * Garante que módulos essenciais exportam corretamente e não crasham ao importar.
 */
import { describe, it, expect, vi } from "vitest";

// Mock supabase globally
vi.mock("@v1/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        throwOnError: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null })) })),
        limit: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: null })) })),
        order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [] })) })),
      })),
    })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

describe("Smoke Tests — Critical Module Imports", () => {
  it("monitoring module exports correctly", async () => {
    const mod = await import("@v1/lib/monitoring");
    expect(mod.logError).toBeTypeOf("function");
    expect(mod.logWarn).toBeTypeOf("function");
    expect(mod.getRecentErrors).toBeTypeOf("function");
    expect(mod.installGlobalErrorHandlers).toBeTypeOf("function");
  });

  it("safeguards module exports correctly", async () => {
    const mod = await import("@v1/lib/safeguards");
    expect(mod.safeNumber).toBeTypeOf("function");
    expect(mod.safeString).toBeTypeOf("function");
    expect(mod.safeArray).toBeTypeOf("function");
    expect(mod.safeBool).toBeTypeOf("function");
  });

  it("queryInvalidation exports correctly", async () => {
    const mod = await import("@v1/lib/queryInvalidation");
    expect(mod.invalidateCriticalQueries).toBeTypeOf("function");
    expect(mod.invalidateNutritionistQueries).toBeTypeOf("function");
  });

  it("featureFlags exports correctly", async () => {
    const mod = await import("@v1/lib/featureFlags");
    expect(mod.isFeatureEnabled).toBeTypeOf("function");
    expect(mod.checkFeature).toBeTypeOf("function");
    expect(mod.invalidateFeatureFlags).toBeTypeOf("function");
    expect(mod.FeatureGate).toBeTypeOf("function");
  });

  it("criticalFlows exports correctly", async () => {
    const mod = await import("@v1/lib/criticalFlows");
    expect(mod.CRITICAL_FLOWS).toBeInstanceOf(Array);
    expect(mod.CRITICAL_FLOWS.length).toBeGreaterThan(0);
  });
});
