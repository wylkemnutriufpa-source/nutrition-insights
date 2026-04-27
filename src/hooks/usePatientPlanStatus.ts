/**
 * @deprecated usePatientPlanStatus — COMPATIBILITY LAYER (DEPRECATED)
 *
 * This hook delegates to the canonical usePatientLifecycleState hook.
 * It exists ONLY for backward compatibility with 3 legacy components:
 * - OnboardingPipeline, OnboardingProgressModal, PlanRequestButton.
 *
 * NEW CODE MUST USE usePatientLifecycleState DIRECTLY.
 * This file will be removed once those components are migrated.
 */

import { usePatientLifecycleState } from "@/hooks/usePatientLifecycleState";
import type { PatientLifecycle } from "@/hooks/usePatientLifecycleState";

export type PatientPlanStatusCode =
  | "plan_delivered"
  | "plan_approved_pending_publish"
  | "plan_under_review"
  | "plan_pending_approval"
  | "plan_draft"
  | "plan_pending_production"
  | "onboarding_in_progress"
  | "no_plan"
  | "loading";

export interface PatientPlanStatus {
  status: PatientPlanStatusCode;
  planId?: string;
  planTitle?: string;
  deliverySource?: string;
  lastUpdated?: string;
  onboardingId?: string;
  onboardingStatus?: string;
  showOnboarding: boolean;
  showNoPlan: boolean;
  showWaitingApproval: boolean;
  isLoading: boolean;
  refetch: () => void;
}

/** Maps lifecycle state → legacy plan status code */
function mapLifecycleToPlanStatus(lc: PatientLifecycle): PatientPlanStatusCode {
  if (lc.isLoading) return "loading";

  switch (lc.state) {
    case "plan_delivered":
    case "active_followup":
    case "maintenance_mode":
      return "plan_delivered";
    case "plan_pending_production":
      return "plan_pending_production";
    case "onboarding_started":
    case "onboarding_ready_for_plan":
      return lc.hasActivePlan ? "plan_delivered" : (lc.onboardingStatus === "lead_created" || lc.onboardingStatus === "awaiting_consent" ? "loading" : "onboarding_in_progress");
    case "clinical_attention":
    case "retention_risk":
      return lc.hasActivePlan ? "plan_delivered" : "no_plan";
    case "paused":
    case "closed":
      return lc.hasActivePlan ? "plan_delivered" : "no_plan";
    default:
      return "no_plan";
  }
}

export function usePatientPlanStatus(): PatientPlanStatus {
  const lifecycle = usePatientLifecycleState();
  const status = mapLifecycleToPlanStatus(lifecycle);

  return {
    status,
    planId: lifecycle.planId || undefined,
    planTitle: lifecycle.planTitle || undefined,
    onboardingStatus: lifecycle.onboardingStatus || undefined,
    showOnboarding: lifecycle.showOnboarding,
    showNoPlan: lifecycle.showNoPlan,
    showWaitingApproval: lifecycle.showWaitingApproval,
    isLoading: lifecycle.isLoading,
    refetch: lifecycle.refetch,
  };
}
