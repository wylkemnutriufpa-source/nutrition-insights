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
        const patientIdentity = await resolvePatientIdentity(user!.id);

        // Check if there's an active/in_progress onboarding pipeline
        const { data: pipeline } = await supabase
          .from("onboarding_pipelines" as any)
          .select("id, status, anamnesis_completed, body_data_completed, preferences_completed, plan_generated, plan_approved")
          .in("patient_id", patientIdentity.allIds)
          .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan","superseded_by_reset")')
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        // If there's an active pipeline that isn't fully completed, patient must complete it
        if (pipeline) {
          const p = pipeline as any;
          const allDone = p.anamnesis_completed && p.body_data_completed && p.preferences_completed && p.plan_generated && p.plan_approved;
          if (!allDone) {
            setRequirement("must_complete");
            return;
          }
        }

        // Also check journey_status — if it's onboarding_active, force onboarding
        // BUT: if patient already has an active plan, they shouldn't be stuck in onboarding
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
          // Check if patient already has an active meal plan — if so, don't block them
          const { count } = await supabase
            .from("meal_plans")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", user!.id)
            .eq("is_active", true);

          if (cancelled) return;

          if ((count ?? 0) > 0) {
            // Patient has a plan but journey_status wasn't updated — auto-fix
            setRequirement("none");
            return;
          }

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
