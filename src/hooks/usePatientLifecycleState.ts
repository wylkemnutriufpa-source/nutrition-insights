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

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type LifecycleState =
  | "onboarding_started"
  | "onboarding_ready_for_plan"
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
];

const EMPTY: PatientLifecycle = {
  state: "loading",
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

/**
 * Hook for patient-side usage (uses auth.uid).
 */
export function usePatientLifecycleState(): PatientLifecycle {
  const { user, isPatient } = useAuth();
  const [data, setData] = useState<PatientLifecycle>(EMPTY);

  const fetchState = useCallback(async () => {
    if (!user) return;
    try {
      const { data: result, error } = await supabase.rpc(
        "resolve_patient_lifecycle_state" as any,
        { _patient_id: user.id }
      );

      if (error) {
        console.error("Error resolving lifecycle state:", error);
        setData((prev) => ({ ...prev, state: "onboarding_started", isLoading: false }));
        return;
      }

      const r = (result as Record<string, unknown>) || {};
      const state = (r.lifecycle_state as LifecycleState) || "onboarding_started";

      setData({
        state,
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

        showPlan: PLAN_STATES.includes(state) || !!r.has_active_plan,
        showOnboarding: ONBOARDING_STATES.includes(state) && !r.has_active_plan,
        showNoPlan: state === "onboarding_started" && !r.has_active_plan && !r.has_pending_onboarding,
        showWaitingApproval: state === "plan_pending_production" && !r.has_active_plan,
        showClinicalAlert: state === "clinical_attention",
        showRetentionRisk: state === "retention_risk",
        showMaintenance: state === "maintenance_mode",
        isPaused: state === "paused",
        isClosed: state === "closed",

        refetch: fetchState,
      });
    } catch {
      setData((prev) => ({ ...prev, state: "onboarding_started", isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    if (user && isPatient) {
      fetchState();
    }
  }, [user, isPatient, fetchState]);

  // Listen for realtime lifecycle changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`lifecycle-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "patient_lifecycle_states",
          filter: `patient_id=eq.${user.id}`,
        },
        () => fetchState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchState]);

  return { ...data, refetch: fetchState };
}

/**
 * Hook for professional-side usage (pass patient_id explicitly).
 */
export function usePatientLifecycleStateFor(patientId: string | null): PatientLifecycle {
  const [data, setData] = useState<PatientLifecycle>(EMPTY);

  const fetchState = useCallback(async () => {
    if (!patientId) return;
    try {
      const { data: result, error } = await supabase.rpc(
        "resolve_patient_lifecycle_state" as any,
        { _patient_id: patientId }
      );

      if (error) {
        setData((prev) => ({ ...prev, state: "onboarding_started", isLoading: false }));
        return;
      }

      const r = (result as Record<string, unknown>) || {};
      const state = (r.lifecycle_state as LifecycleState) || "onboarding_started";

      setData({
        state,
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

        showPlan: PLAN_STATES.includes(state) || !!r.has_active_plan,
        showOnboarding: ONBOARDING_STATES.includes(state) && !r.has_active_plan,
        showNoPlan: state === "onboarding_started" && !r.has_active_plan && !r.has_pending_onboarding,
        showWaitingApproval: state === "plan_pending_production" && !r.has_active_plan,
        showClinicalAlert: state === "clinical_attention",
        showRetentionRisk: state === "retention_risk",
        showMaintenance: state === "maintenance_mode",
        isPaused: state === "paused",
        isClosed: state === "closed",

        refetch: fetchState,
      });
    } catch {
      setData((prev) => ({ ...prev, state: "onboarding_started", isLoading: false }));
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId) fetchState();
  }, [patientId, fetchState]);

  return { ...data, refetch: fetchState };
}
