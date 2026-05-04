import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocation } from "react-router-dom";
import { recordStateChange } from "@/lib/governanceTelemetry";

export type JourneyStatus =
  | "onboarding_slides"
  | "anamnesis"
  | "collecting_profile"
  | "ready_for_plan"
  | "plan_generated"
  | "active_plan"
  | "no_link"
  | null;

/** 
 * Centralized rule for allowed (non-blocking) states.
 */
export const IS_FLUID_STATE = (status: JourneyStatus) => 
  status === "ready_for_plan" || status === "plan_generated" || status === "active_plan";

/**
 * Returns the patient's unified state from profiles.
 */
export function usePatientJourneyStatus() {
  const { user, profile, isPatient, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<JourneyStatus>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Synchronize status with profile from useAuth
  useEffect(() => {
    if (authLoading) return;
    
    if (profile?.patient_state) {
      setStatus(profile.patient_state as JourneyStatus);
      setLoading(false);
    } else if (isPatient) {
      // Fallback if profile doesn't have it yet but user is a patient
      setStatus("onboarding_slides");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [profile, authLoading, isPatient]);

  const fetchStatus = async () => {
    // If needed to manually refetch, we refresh the profile in useAuth
    // which will update the status here via the useEffect above.
    console.log("[usePatientJourneyStatus] Manually refreshing status...");
  };

    const channel = supabase
      .channel(`patient-state-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.patient_state;
          const oldStatus = (payload.old as any)?.patient_state;
          
          if (newStatus && newStatus !== status) {
            console.log(`[FJ:Audit] State change detected: ${status} -> ${newStatus} (Realtime)`);
            if (isTransitioning) {
              console.warn(`[FJ:Audit] Realtime update suppressed because isTransitioning=true`);
              return;
            }
            setStatus(newStatus as JourneyStatus);
            recordStateChange({ userId: user.id, from: oldStatus ?? status, to: newStatus, source: "realtime" });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, isPatient]);

  const canAccessOnboarding = status !== "no_link" && status !== null;

  return { 
    status, 
    loading, 
    canAccessOnboarding, 
    isTransitioning,
    refetch: fetchStatus 
  };
}
