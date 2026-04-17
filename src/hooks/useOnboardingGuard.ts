/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resolvePatientIdentity } from "@/lib/onboardingPlanResolver";

export type OnboardingRequirement = "none" | "must_complete" | "loading";

// Routes the patient is allowed to visit even with incomplete onboarding
const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding",
  "/onboarding-pipeline",
  "/onboarding-paciente",
  "/anamnesis",
  "/consent-required",
  "/payment-required",
  "/settings",
  "/auth",
  "/reset-password",
  "/intake",
];

export function isOnboardingAllowedRoute(pathname: string): boolean {
  return ONBOARDING_ALLOWED_ROUTES.some(r => pathname.startsWith(r));
}

export function useOnboardingGuard() {
  const { user, isPatient } = useAuth();
  const [requirement, setRequirement] = useState<OnboardingRequirement>("loading");

  useEffect(() => {
    if (!user || !isPatient) {
      setRequirement("none");
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        // Build list of IDs to check — always include user.id, plus resolved identity
        let allIds: string[] = [user!.id];
        try {
          const patientIdentity = await resolvePatientIdentity(user!.id);
          allIds = Array.from(new Set([user!.id, ...patientIdentity.allIds]));
        } catch (e) {
          console.warn("[OnboardingGuard] resolvePatientIdentity failed, using user.id only", e);
        }

        // 🔓 PROFESSIONAL OVERRIDE: If the professional already delivered any plan
        // (published / approved / draft entregue), the patient is NOT forced through
        // the automated-onboarding pipeline. Onboarding becomes optional.
        // Onboarding is ONLY mandatory when the patient depends on the automated
        // engine to generate their first plan (no plan exists yet).
        const { data: existingPlan } = await supabase
          .from("meal_plans")
          .select("id, plan_status, is_active")
          .in("patient_id", allIds)
          .in("plan_status", [
            "published",
            "published_to_patient",
            "approved",
            "active",
            "delivered",
          ])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (existingPlan) {
          // Professional already delivered a plan → onboarding is optional.
          setRequirement("none");
          return;
        }

        // Check if there's an active/in_progress onboarding pipeline
        const { data: pipeline } = await supabase
          .from("onboarding_pipelines" as any)
          .select("id, status, anamnesis_completed, body_data_completed, preferences_completed, plan_generated, plan_approved")
          .in("patient_id", allIds)
          .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan","superseded_by_reset")')
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        // Pipeline only blocks the patient when it explicitly targets the
        // AUTOMATED engine (release_status = 'released' AND no plan delivered yet).
        if (pipeline) {
          const p = pipeline as any;
          const targetsAutomatedFlow =
            p.release_status === "released" || p.release_status === undefined;
          const patientStepsDone =
            !!p.anamnesis_completed &&
            !!p.body_data_completed &&
            !!p.preferences_completed;
          const pipelineFullyDone =
            patientStepsDone && !!p.plan_generated && !!p.plan_approved;

          if (targetsAutomatedFlow && !pipelineFullyDone) {
            setRequirement("must_complete");
            return;
          }
        }

        // Defensive fallback: if journey says onboarding_active AND there is still
        // no plan delivered, keep patient in onboarding. Plan check above already
        // short-circuits when professional has delivered a manual plan.
        const { data: link } = await supabase
          .from("nutritionist_patients")
          .select("journey_status")
          .eq("patient_id", user!.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        const journeyStatus = (link as any)?.journey_status;
        if (journeyStatus === "onboarding_active") {
          setRequirement("must_complete");
          return;
        }

        setRequirement("none");
      } catch {
        if (!cancelled) setRequirement("none");
      }
    }

    check();

    // Listen for realtime changes
    const ch = supabase
      .channel(`onboarding-guard-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "onboarding_pipelines",
        filter: `patient_id=eq.${user.id}`,
      }, () => check())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "nutritionist_patients",
        filter: `patient_id=eq.${user.id}`,
      }, () => check())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user, isPatient]);

  return { requirement };
}
