import { supabase } from "@/integrations/supabase/client";

/**
 * Detailed plan inspection
 */
export const inspectPatientPlans = async (patientId: string) => {
  const correlationId = crypto.randomUUID();
  console.log(`[Diagnostic] Inspecting plans for ${patientId} (Correlation: ${correlationId})`);
  
  const { data, error } = await supabase.rpc('get_detailed_plan_diagnostics', {
    p_patient_id: patientId
  });

  if (error) {
    await logAlert('DIAGNOSTIC_FAILURE', `Failed to inspect plans for ${patientId}`, { error, correlationId });
    return null;
  }

  return data;
};

/**
 * Idempotent publication wrapper
 */
export const publishPlanSafely = async (planId: string) => {
  const correlationId = crypto.randomUUID();
  console.log(`[Pub] Safe publish for ${planId} (Correlation: ${correlationId})`);

  const { data, error } = await supabase.rpc('publish_meal_plan_v2', {
    p_plan_id: planId,
    p_correlation_id: correlationId
  }) as { data: any, error: any };

  if (error || !data?.success) {
    const errorMsg = data?.error || error?.message || 'Unknown publication error';
    await logAlert('PUBLISH_RACE_CONDITION', `Publication failed/locked for ${planId}`, { error: errorMsg, correlationId });
    throw new Error(errorMsg);
  }

  return data;
};

const logAlert = async (type: string, msg: string, metadata: any) => {
  return supabase.from('system_alerts').insert({
    alert_type: type,
    message: msg,
    metadata,
    correlation_id: metadata.correlation_id
  });
};
