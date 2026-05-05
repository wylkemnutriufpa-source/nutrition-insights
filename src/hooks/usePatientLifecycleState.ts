/**
 * usePatientLifecycleState — Single Source of Truth for the Patient Lifecycle.
 *
 * Uses the `resolve_patient_lifecycle_state` RPC to determine the canonical state.
 * ALL modules (onboarding, plan, dashboard, alerts, notifications) MUST use this hook
 * instead of independently querying status.
 *
 * Lifecycle States (priority order):
 * 1. closed / paused           → Manual overrides
 * 2. clinical_attention         → Active high-severity alerts
 * 3. retention_risk             → Dropout / low engagement
 * 4. active_followup            → Plan active + recent activity
 * 5. maintenance_mode           → Stable, high adherence
 * 6. plan_delivered             → Plan exists, moderate activity
 * 7. plan_pending_production    → Onboarding awaiting plan generation
 * 8. onboarding_ready_for_plan  → Data collected, ready for plan
 * 9. onboarding_started         → Just registered
 */

import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { validateLifecycleEnvelope } from "@/lib/lifecycleStateValidator";
import { safeChannel, safeSubscribe, safeRemoveChannel } from "@/lib/security-layer/safeRealtime";

export type LifecycleState =
  | "onboarding_started"
  | "onboarding_ready_for_plan"
  | "onboarding_active"
  | "onboarding"
  | "plan_pending_production"
  | "plan_delivered"
  | "active_followup"
  | "clinical_attention"
  | "retention_risk"
  | "maintenance_mode"
  | "paused"
  | "closed"
  | "loading";

export interface PatientLifecycle {
  state: LifecycleState;
  plan: any | null;
  hasActivePlan: boolean;
  hasPendingOnboarding: boolean;
  hasClinicalAlert: boolean;
  hasRetentionRisk: boolean;
  lastCheckinAt: string | null;
  lastPlanDeliveryAt: string | null;
  adherenceScore: number;
  riskScore: number;
  daysInactive: number;
  planId: string | null;
  planTitle: string | null;
  nextRecommendedAction: string | null;
  onboardingStatus: string | null;
  isLoading: boolean;

  // Blocking logic
  isBlocked: boolean;
  blockReason: string | null;

  // Computed convenience flags
  showPlan: boolean;
  showOnboarding: boolean;
  showNoPlan: boolean;
  showWaitingApproval: boolean;
  showClinicalAlert: boolean;
  showRetentionRisk: boolean;
  showMaintenance: boolean;
  isPaused: boolean;
  isClosed: boolean;

  refetch: () => void;
}

const PLAN_STATES: LifecycleState[] = [
  "plan_delivered",
  "active_followup",
  "maintenance_mode",
];

const ONBOARDING_STATES: LifecycleState[] = [
  "onboarding_started",
  "onboarding_ready_for_plan",
  "onboarding_active",
  "onboarding",
];

/** Parse RPC result into PatientLifecycle */
function parseLifecycleResult(r: Record<string, unknown>, refetchFn: () => void): PatientLifecycle {
  // Mapping from RPC fields to hook fields
  const state = (r.state || r.lifecycle_state || "onboarding_started") as LifecycleState;
  const isBlocked = !!(r.is_onboarding_blocked || r.is_blocked);
  
  return {
    state,
    plan: r.plan || null,
    hasActivePlan: !!r.has_active_plan,
    hasPendingOnboarding: !!r.has_pending_onboarding,
    hasClinicalAlert: !!r.has_clinical_alert,
    hasRetentionRisk: !!r.has_retention_risk,
    lastCheckinAt: (r.last_checkin_at as string) || null,
    lastPlanDeliveryAt: (r.last_plan_delivery_at as string) || null,
    adherenceScore: (r.adherence_score as number) || 0,
    riskScore: (r.risk_score as number) || 0,
    daysInactive: (r.days_inactive as number) || 0,
    planId: (r.plan_id as string) || null,
    planTitle: (r.plan_title as string) || null,
    nextRecommendedAction: (r.next_recommended_action as string) || null,
    onboardingStatus: (r.onboarding_status as string) || null,
    isLoading: false,
    
    // Blocking logic
    isBlocked,
    blockReason: (r.onboarding_block_reason as string) || null,

    showPlan: PLAN_STATES.includes(state) || !!r.has_active_plan,
    // Only show onboarding automatically if it's blocked or explicitly needed
    showOnboarding: (ONBOARDING_STATES.includes(state) && !r.has_active_plan) || isBlocked,
    showNoPlan: state === "onboarding_started" && !r.has_active_plan && !r.has_pending_onboarding,
    showWaitingApproval: state === "plan_pending_production" && !r.has_active_plan,
    showClinicalAlert: state === "clinical_attention",
    showRetentionRisk: state === "retention_risk",
    showMaintenance: state === "maintenance_mode",
    isPaused: state === "paused",
    isClosed: state === "closed",
    refetch: refetchFn,
  };
}

const EMPTY: PatientLifecycle = {
  state: "loading",
  plan: null,
  hasActivePlan: false,
  hasPendingOnboarding: false,
  hasClinicalAlert: false,
  hasRetentionRisk: false,
  lastCheckinAt: null,
  lastPlanDeliveryAt: null,
  adherenceScore: 0,
  riskScore: 0,
  daysInactive: 0,
  planId: null,
  planTitle: null,
  nextRecommendedAction: null,
  onboardingStatus: null,
  isLoading: true,
  isBlocked: false,
  blockReason: null,
  showPlan: false,
  showOnboarding: false,
  showNoPlan: false,
  showWaitingApproval: false,
  showClinicalAlert: false,
  showRetentionRisk: false,
  showMaintenance: false,
  isPaused: false,
  isClosed: false,
  refetch: () => {},
};

/** Fetch lifecycle state from RPC */
async function fetchLifecycleState(patientId: string): Promise<Record<string, unknown>> {
  const { data: result, error } = await supabase.rpc(
    "resolve_patient_lifecycle_state" as any,
    { _patient_id: patientId }
  );
  if (error) {
    console.error("Error resolving lifecycle state:", error);
    return { state: "onboarding_started" };
  }
  const envelope = (result as Record<string, unknown>) || { state: "onboarding_started" };
  // Runtime coherence check — surfaces structured errors when has_active_plan
  // is true but plan_id/plan_title/plan are null.
  const validation = validateLifecycleEnvelope(envelope);
  if (!validation.ok) {
    console.error("[lifecycle] envelope incoherent", {
      patientId,
      issues: validation.issues,
      message: validation.message,
    });
  }
  return envelope;
}

/**
 * Hook for patient-side usage (uses auth.uid).
 * Uses React Query for caching — all components share a single cached state.
 */
export function usePatientLifecycleState(): PatientLifecycle {
  const { user, isPatient } = useAuth();
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ["lifecycle", user?.id],
    enabled: !!user && isPatient,
    staleTime: 5 * 1000, // 5s — fast refresh for instant lifecycle sync
    refetchInterval: 2 * 60 * 1000, // auto-refresh every 2min
    refetchOnWindowFocus: true, // re-evaluate on tab focus (override may have expired)
    refetchOnReconnect: true,
    queryFn: () => fetchLifecycleState(user!.id),
  });

  const refetchFn = useCallback(() => { refetch(); }, [refetch]);

  // Listen for realtime lifecycle changes → invalidate cache.
  // Also listen for visibilitychange so an expired unblock override is
  // re-evaluated when the patient brings the tab back into focus.
  useEffect(() => {
    if (!user) return;
    const channel = safeChannel(`lifecycle-${user.id}`);
    
    if (channel) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_lifecycle_states",
          filter: `patient_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["lifecycle", user.id] })
      ).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "professional_unblock_overrides",
          filter: `patient_id=eq.${user.id}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["lifecycle", user.id] })
      );
      safeSubscribe(channel);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: ["lifecycle", user.id] });
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (channel) safeRemoveChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, queryClient]);

  if (!data) return { ...EMPTY, refetch: refetchFn };
  return parseLifecycleResult(data, refetchFn);
}

/**
 * Hook for professional-side usage (pass patient_id explicitly).
 */
export function usePatientLifecycleStateFor(patientId: string | null): PatientLifecycle {
  const { data, refetch } = useQuery({
    queryKey: ["lifecycle", patientId],
    enabled: !!patientId,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    queryFn: () => fetchLifecycleState(patientId!),
  });

  const refetchFn = useCallback(() => { refetch(); }, [refetch]);

  if (!data) return { ...EMPTY, refetch: refetchFn };
  return parseLifecycleResult(data, refetchFn);
}
