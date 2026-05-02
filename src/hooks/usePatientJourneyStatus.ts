import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { assertContract } from "@/lib/contractGuards";
import { isRealtimeAvailable } from "@/lib/security-layer/safeRealtime";
import { useLocation } from "react-router-dom";

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
 * Returns the patient's journey_status from nutritionist_patients.
 */
export function usePatientJourneyStatus() {
  const { user, isPatient } = useAuth();
  const location = useLocation();
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
            console.error(`[usePatientJourneyStatus] NO LINK FOUND for ${user.id}`);
            setStatus("no_link");
            setLoading(false);
          } else {
            const finalStatus = (data as any).journey_status || "active";
            console.log(`[usePatientJourneyStatus] Resolved status: ${finalStatus}`);
            
            // Validação de Contrato (Anti-Cascade Architecture)
            // Não usamos auto-cura silenciosa. Se houver desvio lógico, logamos o erro fatal.
            try {
              assertContract("ui_consistency", {
                dbStatus: finalStatus,
                uiStatus: status === "no_link" ? null : status,
                errorVisible: false,
                hasInvisibleState: false
              });
            } catch (contractErr: any) {
              // Em vez de auto-curar, registramos a falha de integridade para investigação profunda.
              console.error("[Anti-Cascade] Violação de Integridade detectada:", contractErr.message);
              // O sistema mantém o status original do banco (finalStatus), 
              // mas sem mascarar o erro nos logs.
            }

            setStatus(finalStatus);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("[usePatientJourneyStatus] Unexpected error:", err);
        if (!cancelled) {
          // Em caso de erro real de infra, não assumimos "active" falsamente
          setLoading(false);
        }
      }
    };

    fetchStatus();

    // Listen for insert/update events — blindado contra falhas de WebSocket
    let channel: any = null;
    try {
      channel = supabase
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
    } catch (err: any) {
      console.warn("[usePatientJourneyStatus] Realtime indisponível (continuando sem realtime):", err?.message);
    }

    return () => {
      cancelled = true;
      try {
        if (channel) supabase.removeChannel(channel);
      } catch { /* noop */ }
    };
  }, [user, isPatient, location.pathname]);

  const canAccessOnboarding = status !== "no_link" && status !== null;

  return { status, anamnesisStatus, loading, canAccessOnboarding };
}