import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Detailed plan inspection
 */
export const inspectPatientPlans = async (patientId: string) => {
  const correlationId = uuidv4();
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
  const correlationId = uuidv4();
  console.log(`[Pub] Safe publish for ${planId} (Correlation: ${correlationId})`);

  const { data, error } = await supabase.rpc('publish_meal_plan_v2', {
    p_plan_id: planId,
    p_correlation_id: correlationId
  });

  if (error || !data?.success) {
    await logAlert('PUBLISH_RACE_CONDITION', `Publication failed/locked for ${planId}`, { error, correlationId });
    throw error || new Error(data?.error || 'Unknown publication error');
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
