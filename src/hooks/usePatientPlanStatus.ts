/**
 * usePatientPlanStatus — Single source of truth for patient meal plan status.
 *
 * Uses the `resolve_patient_plan_status` RPC to determine the canonical state.
 * ALL patient-facing UI must use this hook instead of querying plan status independently.
 *
 * Status hierarchy (highest → lowest priority):
 * 1. plan_delivered          → Plan published & active. Show plan, hide everything else.
 * 2. plan_approved_pending_publish → Approved, not yet published.
 * 3. plan_under_review       → Professional is reviewing.
 * 4. plan_pending_approval   → Draft/auto-generated, waiting approval.
 * 5. onboarding_in_progress  → Patient still completing onboarding steps.
 * 6. no_plan                 → No plan exists at all.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

export function usePatientPlanStatus(): PatientPlanStatus {
  const { user, isPatient } = useAuth();
  const [data, setData] = useState<PatientPlanStatus>({
    status: "loading",
    showOnboarding: false,
    showNoPlan: false,
    showWaitingApproval: false,
    isLoading: true,
    refetch: () => {},
  });

  const fetchStatus = async () => {
    if (!user) return;

    try {
      const { data: result, error } = await supabase.rpc(
        "resolve_patient_plan_status",
        { _patient_id: user.id }
      );

      if (error) {
        console.error("Error resolving plan status:", error);
        setData((prev) => ({ ...prev, status: "no_plan", isLoading: false }));
        return;
      }

      const r = result as Record<string, unknown>;
      setData({
        status: (r.status as PatientPlanStatusCode) || "no_plan",
        planId: r.plan_id as string | undefined,
        planTitle: r.plan_title as string | undefined,
        deliverySource: r.delivery_source as string | undefined,
        lastUpdated: r.last_updated as string | undefined,
        onboardingId: r.onboarding_id as string | undefined,
        onboardingStatus: r.onboarding_status as string | undefined,
        showOnboarding: !!r.show_onboarding,
        showNoPlan: !!r.show_no_plan,
        showWaitingApproval: !!r.show_waiting_approval,
        isLoading: false,
        refetch: fetchStatus,
      });
    } catch {
      setData((prev) => ({ ...prev, status: "no_plan", isLoading: false }));
    }
  };

  useEffect(() => {
    if (user && isPatient) {
      fetchStatus();
    }
  }, [user, isPatient]);

  return { ...data, refetch: fetchStatus };
}
