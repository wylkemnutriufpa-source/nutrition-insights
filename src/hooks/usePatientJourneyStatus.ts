import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocation } from "react-router-dom";

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
  const { user, isPatient } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<JourneyStatus>(null);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastValidated, setLastValidated] = useState<number>(0);

  // Expose global setter for atomic transitions
  useEffect(() => {
    (window as any).__FJ_SET_TRANSITIONING__ = setIsTransitioning;
    return () => { delete (window as any).__FJ_SET_TRANSITIONING__; };
  }, []);

  const fetchStatus = async (cancelled = false) => {
    if (!user?.id) return;
    try {
      console.log(`[usePatientJourneyStatus] Fetching unified state for ${user.id}...`);
      const { data, error } = await supabase
        .from("profiles")
        .select("patient_state")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("[usePatientJourneyStatus] Fetch error:", error);
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled && data) {
        const finalStatus = data.patient_state as JourneyStatus;
        if (!finalStatus) {
          console.warn("[FJ:Guard] patient_state nulo detectado, forçando fallback para slides");
          setStatus("onboarding_slides");
        } else {
          console.log(`[usePatientJourneyStatus] Unified state: ${finalStatus}`);
          setStatus(finalStatus);
        }
        setLoading(false);
        setLastValidated(Date.now());
      }
    } catch (err) {
      console.error("[usePatientJourneyStatus] Unexpected error:", err);
      if (!cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !isPatient) { setLoading(false); return; }

    let cancelled = false;
    fetchStatus(cancelled);

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
          if (newStatus && !isTransitioning) {
            console.log(`[usePatientJourneyStatus] Realtime update: ${newStatus}`);
            setStatus(newStatus as JourneyStatus);
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
    refetch: () => fetchStatus(false) 
  };
}
