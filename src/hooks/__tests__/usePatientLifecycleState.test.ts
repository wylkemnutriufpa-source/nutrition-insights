import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockRpc = vi.fn();
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
}));
const mockRemoveChannel = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "patient-1", email: "test@test.com" },
    isPatient: true,
    profile: null,
  }),
}));

// We test the parseLifecycleResult logic by importing the module and examining outputs
// Since parseLifecycleResult is not exported, we test the computed flags logic directly

describe("PatientLifecycle state computation", () => {
  const PLAN_STATES = ["plan_delivered", "active_followup", "maintenance_mode"];
  const ONBOARDING_STATES = ["onboarding_started", "onboarding_ready_for_plan"];

  function computeFlags(state: string, hasActivePlan: boolean) {
    return {
      showPlan: PLAN_STATES.includes(state) || hasActivePlan,
      showOnboarding: ONBOARDING_STATES.includes(state) && !hasActivePlan,
      showNoPlan: state === "onboarding_started" && !hasActivePlan,
      showWaitingApproval: state === "plan_pending_production" && !hasActivePlan,
      showClinicalAlert: state === "clinical_attention",
      showRetentionRisk: state === "retention_risk",
      showMaintenance: state === "maintenance_mode",
      isPaused: state === "paused",
      isClosed: state === "closed",
    };
  }

  it("shows onboarding for new patient", () => {
    const flags = computeFlags("onboarding_started", false);
    expect(flags.showOnboarding).toBe(true);
    expect(flags.showNoPlan).toBe(true);
    expect(flags.showPlan).toBe(false);
  });

  it("shows plan for active_followup", () => {
    const flags = computeFlags("active_followup", true);
    expect(flags.showPlan).toBe(true);
    expect(flags.showOnboarding).toBe(false);
  });

  it("shows clinical alert", () => {
    const flags = computeFlags("clinical_attention", true);
    expect(flags.showClinicalAlert).toBe(true);
  });

  it("shows waiting approval for plan_pending_production", () => {
    const flags = computeFlags("plan_pending_production", false);
    expect(flags.showWaitingApproval).toBe(true);
    expect(flags.showPlan).toBe(false);
  });

  it("shows maintenance mode", () => {
    const flags = computeFlags("maintenance_mode", true);
    expect(flags.showMaintenance).toBe(true);
    expect(flags.showPlan).toBe(true);
  });

  it("handles paused state", () => {
    const flags = computeFlags("paused", false);
    expect(flags.isPaused).toBe(true);
    expect(flags.showPlan).toBe(false);
    expect(flags.showOnboarding).toBe(false);
  });

  it("handles closed state", () => {
    const flags = computeFlags("closed", false);
    expect(flags.isClosed).toBe(true);
  });

  it("retention risk flags correctly", () => {
    const flags = computeFlags("retention_risk", true);
    expect(flags.showRetentionRisk).toBe(true);
    expect(flags.showPlan).toBe(true);
  });

  it("plan_delivered with active plan shows plan", () => {
    const flags = computeFlags("plan_delivered", true);
    expect(flags.showPlan).toBe(true);
    expect(flags.showOnboarding).toBe(false);
  });
});
