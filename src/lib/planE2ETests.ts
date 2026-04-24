import { supabase } from "@/integrations/supabase/client";

/**
 * E2E-style verification for plan publication
 */
export const verifyPlanPublicationFlow = async (planId: string, patientId: string) => {
  console.log(`[E2E Test] Verifying publication flow for plan ${planId}`);

  // 1. Verify DB state directly (Backend/API check)
  const { data: plan, error: dbError } = await supabase
    .from('meal_plans')
    .select('status, is_active, plan_mode, patient_id')
    .eq('id', planId)
    .single();

  if (dbError || !plan) {
    throw new Error(`[E2E Failure] Plan ${planId} not found in database.`);
  }

  const issues: string[] = [];

  if (plan.status !== 'published') issues.push(`Status is ${plan.status}, expected 'published'`);
  if (plan.is_active !== true) issues.push(`is_active is ${plan.is_active}, expected true`);
  if (plan.patient_id !== patientId) issues.push(`patient_id mismatch: ${plan.patient_id} vs ${patientId}`);

  // 2. Simulate visibility check (Patient view)
  const { data: visiblePlans, error: visibilityError } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('patient_id', patientId)
    .eq('status', 'published')
    .eq('is_active', true);

  if (visibilityError) {
    issues.push(`Visibility query failed: ${visibilityError.message}`);
  } else {
    const isVisible = visiblePlans.some(p => p.id === planId);
    if (!isVisible) {
      issues.push(`Plan exists but is HIDDEN from patient queries. Check RLS or tenant_id.`);
    }
  }

  if (issues.length > 0) {
    const errorMsg = `[E2E Failure] Publication validation failed:\n- ${issues.join('\n- ')}`;
    console.error(errorMsg);
    
    // Log critical alert
    await supabase.from('system_alerts').insert({
      alert_type: 'E2E_PUBLISH_FAILURE',
      severity: 'critical',
      message: errorMsg,
      metadata: { plan_id: planId, patient_id: patientId, issues }
    });

    return { success: false, issues };
  }

  console.log("[E2E Success] Plan is correctly published and visible.");
  return { success: true };
};
