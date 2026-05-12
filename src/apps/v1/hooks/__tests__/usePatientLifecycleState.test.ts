import { describe, it, expect } from "vitest";

describe("PatientLifecycle state computation", () => {
  const PLAN_STATES = ["plan_delivered", "active_followup", "maintenance_mode"];
  const ONBOARDING_STATES = ["onboarding_started", "onboarding_ready_for_plan"];

  function computeFlags(state: string, overrides: { has_active_plan?: boolean; has_pending_onboarding?: boolean; has_clinical_alert?: boolean; has_retention_risk?: boolean } = {}) {
    const hasActivePlan = overrides.has_active_plan ?? false;
    const hasPendingOnboarding = overrides.has_pending_onboarding ?? false;
    return {
      showPlan: PLAN_STATES.includes(state) || hasActivePlan,
      showOnboarding: ONBOARDING_STATES.includes(state) && !hasActivePlan,
      showNoPlan: state === "onboarding_started" && !hasActivePlan && !hasPendingOnboarding,
      showWaitingApproval: state === "plan_pending_production" && !hasActivePlan,
      showClinicalAlert: state === "clinical_attention",
      showRetentionRisk: state === "retention_risk",
      showMaintenance: state === "maintenance_mode",
      isPaused: state === "paused",
      isClosed: state === "closed",
    };
  }

  function parseLifecycleResult(r: Record<string, unknown>) {
    const state = (r.lifecycle_state as string) || "onboarding_started";
    const hasActivePlan = !!r.has_active_plan;
    return {
      state,
      hasActivePlan,
      hasPendingOnboarding: !!r.has_pending_onboarding,
      hasClinicalAlert: !!r.has_clinical_alert,
      hasRetentionRisk: !!r.has_retention_risk,
      adherenceScore: (r.adherence_score as number) || 0,
      riskScore: (r.risk_score as number) || 0,
      daysInactive: (r.days_inactive as number) || 0,
      planId: (r.plan_id as string) || null,
      planTitle: (r.plan_title as string) || null,
      lastCheckinAt: (r.last_checkin_at as string) || null,
      lastPlanDeliveryAt: (r.last_plan_delivery_at as string) || null,
      nextRecommendedAction: (r.next_recommended_action as string) || null,
      onboardingStatus: (r.onboarding_status as string) || null,
      isLoading: false,
      ...computeFlags(state, { has_active_plan: hasActivePlan, has_pending_onboarding: !!r.has_pending_onboarding }),
    };
  }

  // --- Flag computation ---
  it("shows onboarding for new patient", () => {
    const flags = computeFlags("onboarding_started");
    expect(flags.showOnboarding).toBe(true);
    expect(flags.showNoPlan).toBe(true);
    expect(flags.showPlan).toBe(false);
  });

  it("shows plan for active_followup", () => {
    const flags = computeFlags("active_followup", { has_active_plan: true });
    expect(flags.showPlan).toBe(true);
    expect(flags.showOnboarding).toBe(false);
  });

  it("shows clinical alert", () => {
    const flags = computeFlags("clinical_attention", { has_active_plan: true });
    expect(flags.showClinicalAlert).toBe(true);
  });

  it("shows waiting approval for plan_pending_production", () => {
    const flags = computeFlags("plan_pending_production");
    expect(flags.showWaitingApproval).toBe(true);
    expect(flags.showPlan).toBe(false);
  });

  it("shows maintenance mode", () => {
    const flags = computeFlags("maintenance_mode", { has_active_plan: true });
    expect(flags.showMaintenance).toBe(true);
    expect(flags.showPlan).toBe(true);
  });

  it("handles paused state", () => {
    const flags = computeFlags("paused");
    expect(flags.isPaused).toBe(true);
    expect(flags.showPlan).toBe(false);
    expect(flags.showOnboarding).toBe(false);
  });

  it("handles closed state", () => {
    const flags = computeFlags("closed");
    expect(flags.isClosed).toBe(true);
  });

  it("retention risk flags correctly", () => {
    const flags = computeFlags("retention_risk", { has_active_plan: true });
    expect(flags.showRetentionRisk).toBe(true);
    expect(flags.showPlan).toBe(true);
  });

  it("plan_delivered with active plan shows plan", () => {
    const flags = computeFlags("plan_delivered", { has_active_plan: true });
    expect(flags.showPlan).toBe(true);
    expect(flags.showOnboarding).toBe(false);
  });

  it("showPlan=true when has_active_plan regardless of state", () => {
    const flags = computeFlags("onboarding_started", { has_active_plan: true });
    expect(flags.showPlan).toBe(true);
  });

  it("showNoPlan=false when has_pending_onboarding", () => {
    const flags = computeFlags("onboarding_started", { has_pending_onboarding: true });
    expect(flags.showNoPlan).toBe(false);
  });

  // --- Full parse function ---
  it("parses complete RPC result with all fields", () => {
    const result = parseLifecycleResult({
      lifecycle_state: "active_followup",
      has_active_plan: true,
      has_pending_onboarding: false,
      has_clinical_alert: false,
      has_retention_risk: false,
      adherence_score: 85,
      risk_score: 12,
      days_inactive: 2,
      plan_id: "plan-1",
      plan_title: "Emagrecimento",
      last_checkin_at: "2025-06-01",
      last_plan_delivery_at: "2025-05-15",
      next_recommended_action: "checkin",
      onboarding_status: "completed",
    });

    expect(result.state).toBe("active_followup");
    expect(result.hasActivePlan).toBe(true);
    expect(result.adherenceScore).toBe(85);
    expect(result.planId).toBe("plan-1");
    expect(result.showPlan).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it("defaults to onboarding_started on empty RPC result", () => {
    const result = parseLifecycleResult({});
    expect(result.state).toBe("onboarding_started");
    expect(result.adherenceScore).toBe(0);
    expect(result.planId).toBeNull();
    expect(result.showOnboarding).toBe(true);
  });

  it("defaults to onboarding_started on RPC error", () => {
    const result = parseLifecycleResult({ lifecycle_state: undefined });
    expect(result.state).toBe("onboarding_started");
  });

  it("handles null plan fields without crashing", () => {
    const result = parseLifecycleResult({
      lifecycle_state: "plan_pending_production",
      plan_id: null,
      plan_title: null,
    });
    expect(result.planId).toBeNull();
    expect(result.planTitle).toBeNull();
    expect(result.showWaitingApproval).toBe(true);
  });
});
