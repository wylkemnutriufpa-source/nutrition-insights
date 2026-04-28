import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type JourneyStatus =
  | "lead_created"
  | "awaiting_payment"
  | "awaiting_consent"
  | "awaiting_onboarding_release"
  | "onboarding_active"
  | "onboarding_completed"
  | "draft_ready_for_review"
  | "plan_published"
  | "active_followup"
  | "clinical_followup_active"
  | "active" // legacy
  | "no_link"
  | null;

/** 
 * Centralized rule for allowed (non-blocking) states.
 */
export const IS_FLUID_STATE = (status: JourneyStatus) => 
  status === "active" || status === "onboarding_active" || status === "lead_created" || status === "awaiting_consent" || status === "onboarding_completed" || status === "draft_ready_for_review" || status === "plan_published" || status === "active_followup" || status === "clinical_followup_active";

/**
 * Single Source of Truth for Navigation Decision.
 * MOVED TO GOVERNANCE.TS
 */

/**
 * Returns the patient's journey_status from nutritionist_patients.
 */
export function usePatientJourneyStatus() {
  const { user, isPatient } = useAuth();
  const [status, setStatus] = useState<JourneyStatus | "no_link">(null);
  const [anamnesisStatus, setAnamnesisStatus] = useState<'pending' | 'completed' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isPatient) { setLoading(false); return; }

    let cancelled = false;
    const fetchStatus = async () => {
      try {
        console.log(`[usePatientJourneyStatus] Fetching status for ${user.id}...`);
        const [journeyRes, anamRes] = await Promise.all([
          supabase
            .from("nutritionist_patients")
            .select("journey_status")
            .eq("patient_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("patient_anamnesis")
            .select("status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        const data = journeyRes.data;
        const error = journeyRes.error;

        if (anamRes.data) {
          setAnamnesisStatus(anamRes.data.status as any);
        }

        if (error) {
          console.error("[usePatientJourneyStatus] Fetch error:", error);
          if (!cancelled) {
            setStatus("active");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          if (!data) {
            console.warn(`[usePatientJourneyStatus] NO LINK FOUND for ${user.id}`);
            // Check if user has NO link at all
            setStatus(null);
            
            // Fresh signup processing fallback: try again after a delay
            setTimeout(async () => {
              if (cancelled) return;
              const { data: retryData } = await supabase
                .from("nutritionist_patients")
                .select("journey_status")
                .eq("patient_id", user.id)
                .maybeSingle();
              
              if (!retryData) {
                // If still no link, check if it's an orphan patient and try to auto-heal
                console.log("[usePatientJourneyStatus] Trying auto-heal for orphan patient...");
                const { data: healData } = await supabase.rpc("run_patient_realtime_fix" as any, { _patient_id: user.id });
                
                if (healData?.success) {
                    const { data: finalData } = await supabase
                        .from("nutritionist_patients")
                        .select("journey_status")
                        .eq("patient_id", user.id)
                        .maybeSingle();
                    
                    if (finalData) {
                        setStatus((finalData as any).journey_status || "awaiting_consent");
                        setLoading(false);
                        return;
                    }
                }
                
                setStatus("no_link");
              } else {
                setStatus((retryData as any).journey_status || "active");
              }
              setLoading(false);
            }, 1500);
          } else {
            const finalStatus = (data as any).journey_status || "active";
            console.log(`[usePatientJourneyStatus] Resolved status: ${finalStatus}`);
            setStatus(finalStatus);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("[usePatientJourneyStatus] Unexpected error:", err);
        if (!cancelled) {
          setStatus("active");
          setLoading(false);
        }
      }
    };

    fetchStatus();

    // Listen for insert/update events
    const channel = supabase
      .channel(`journey-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "nutritionist_patients",
          filter: `patient_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.journey_status;
          if (newStatus) setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, isPatient]);

  const canAccessOnboarding = status !== "no_link" && status !== null;

  return { status, loading, canAccessOnboarding };
}
