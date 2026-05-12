/**
 * Sprint 1 — Testes do sistema de feature flags
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing
vi.mock("@v1/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        throwOnError: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock("@v1/lib/monitoring", () => ({
  logWarn: vi.fn(),
}));

import { isFeatureEnabled, invalidateFeatureFlags } from "@v1/lib/featureFlags";

describe("Feature Flags", () => {
  beforeEach(() => {
    invalidateFeatureFlags();
  });

  it("retorna true para flags conhecidas com default enabled", () => {
    expect(isFeatureEnabled("whatsapp_integration")).toBe(true);
    expect(isFeatureEnabled("premium_loaders")).toBe(true);
    expect(isFeatureEnabled("clinical_analytics")).toBe(true);
  });

  it("retorna true para flags desconhecidas (don't block new features)", () => {
    expect(isFeatureEnabled("unknown_feature_xyz")).toBe(true);
  });

  it("invalidateFeatureFlags limpa cache", () => {
    // After invalidation, should still return defaults
    invalidateFeatureFlags();
    expect(isFeatureEnabled("whatsapp_integration")).toBe(true);
  });

  it("todas as flags padrão têm gracefulDegradation true", () => {
    // This tests the contract — all defaults should degrade gracefully
    const knownFlags = [
      "whatsapp_integration", "premium_loaders", "clinical_analytics",
      "behavior_learning", "metabolic_score", "clinical_automations",
      "ai_meal_generator", "recipe_ai_generation", "body_projection",
      "semi_autonomous_protocols",
    ];
    knownFlags.forEach((key) => {
      expect(isFeatureEnabled(key)).toBe(true);
    });
  });
});
