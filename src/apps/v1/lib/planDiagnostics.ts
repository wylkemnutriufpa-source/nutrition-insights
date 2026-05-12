import { supabase } from "@/integrations/supabase/client";

/**
 * Diagnostic tool to check plan visibility and distribution
 */
export const runPlanDiagnostics = async (patientId: string) => {
  console.log(`[Diagnostic] Running diagnostics for patient: ${patientId}`);
  
  const { data, error } = await supabase.rpc('get_plan_diagnostics', {
    p_patient_id: patientId
  });

  if (error) {
    console.error("[Diagnostic] Failed to run diagnostics:", error);
    return null;
  }

  console.table(data);
  return data;
};

/**
 * Logic to detect "missing" plans and log alerts
 */
export const checkPlanAnomalies = async (patientId: string, actualCount: number) => {
  // Query DB directly for all plans for this patient regardless of status/active
  const { count, error } = await supabase
    .from('meal_plans')
    .select('*', { count: 'exact', head: true })
    .eq('patient_id', patientId);

  if (error) return;

  // If we have total plans but the fetch returned 0 or very few, it's an anomaly
  if (count && count > 0 && actualCount === 0) {
    console.warn(`[Anomaly] Patient ${patientId} has ${count} plans in DB but fetch returned 0.`);
    
    await supabase.from('system_alerts').insert({
      alert_type: 'PLAN_VISIBILITY_DROP',
      severity: 'critical',
      message: `Patient ${patientId} has ${count} plans in DB but zero are visible in the UI fetch.`,
      metadata: { patient_id: patientId, db_count: count, fetch_count: actualCount }
    });
  }
};
