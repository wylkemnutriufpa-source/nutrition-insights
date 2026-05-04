import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
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

export const IS_FLUID_STATE = (status: JourneyStatus) => 
  status === "ready_for_plan" || status === "plan_generated" || status === "active_plan";

export function usePatientJourneyStatus() {
  const { user, profile, isPatient, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<JourneyStatus>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Expose global setter for atomic transitions
  useEffect(() => {
    (window as any).__FJ_SET_TRANSITIONING__ = setIsTransitioning;
    return () => { delete (window as any).__FJ_SET_TRANSITIONING__; };
  }, []);

  // Synchronize status with profile from useAuth
  useEffect(() => {
    if (authLoading) return;
    
    if (profile?.patient_state) {
      setStatus(profile.patient_state as JourneyStatus);
      setLoading(false);
    } else if (isPatient) {
      setStatus("onboarding_slides");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [profile, authLoading, isPatient]);

  useEffect(() => {
    if (!user || !isPatient) return;

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
            console.log(`[FJ:Audit] State change detected (Realtime): ${newStatus}`);
            if (isTransitioning) return;
            setStatus(newStatus as JourneyStatus);
            recordStateChange({ userId: user.id, from: oldStatus ?? status, to: newStatus, source: "realtime" });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPatient, status, isTransitioning]);

  const canAccessOnboarding = status !== "no_link" && status !== null;

  return { 
    status, 
    loading, 
    canAccessOnboarding, 
    isTransitioning,
    refetch: async () => { console.log("Refetch triggered via useAuth sync."); }
  };
}