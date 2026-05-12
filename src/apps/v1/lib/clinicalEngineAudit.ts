import { supabase } from "@v1/integrations/supabase/client";

/**
 * Log a step of the Deterministic Clinical Engine for audit and transparency.
 * Helps confirm no AI/LLM was used in specific clinical decisions.
 */
export async function logEngineStep(
  patientId: string,
  mealPlanId: string | null,
  eventType: string,
  metadata: Record<string, any>
) {
  // Fire and forget
  supabase.from("clinical_engine_audit_logs").insert({
    patient_id: patientId,
    meal_plan_id: mealPlanId,
    event_type: eventType,
    metadata: {
      ...metadata,
      engine: "Deterministic Motor v3.1",
      timestamp: new Date().toISOString(),
      no_ai_guarantee: true
    },
  }).then(({ error }) => {
    if (error) console.error("[clinical-audit] Error logging step:", error);
  });
}
