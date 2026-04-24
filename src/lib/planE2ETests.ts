import { createClient } from "@supabase/supabase-js";

// Use a separate client with no generated types to bypass TS recursion limits in this file
const diagnosticClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * E2E-style verification for plan publication
 */
export const verifyPlanPublicationFlow = async (planId: string, patientId: string) => {
  const correlationId = crypto.randomUUID();
  console.log(`[E2E Test] Verifying publication flow for plan ${planId} (Correlation: ${correlationId})`);

  // 1. Fetch with specific column filters to test null modes and inconsistent states
  const { data: plan, error: dbError } = await diagnosticClient
    .from('meal_plans')
    .select('id, status, is_active, plan_mode, patient_id, tenant_id')
    .eq('id', planId)
    .single();

  if (dbError || !plan) {
    throw new Error(`[E2E Failure] Plan ${planId} not found in database.`);
  }

  const issues: string[] = [];
  
  // Validation for production rules
  if (plan.status !== 'published') issues.push(`Status is ${plan.status}, expected 'published'`);
  if (!plan.is_active) issues.push(`Plan is not marked as active`);
  
  // Security/Consistency check: patient_id mismatch is a CRITICAL leak
  if (plan.patient_id !== patientId) issues.push(`CRITICAL: patient_id leak detected (${plan.patient_id} vs ${patientId})`);

  // 2. Simulate multi-tenant/status visibility (The "Ghost Plan" test)
  const { data: visiblePlans, error: visibilityError } = await diagnosticClient
    .from('meal_plans')
    .select('id, status, is_active, plan_mode')
    .eq('patient_id', patientId)
    .in('status', ['published'])
    .eq('is_active', true);

  if (visibilityError) {
    issues.push(`Visibility query failed: ${visibilityError.message}`);
  } else {
    const found = (visiblePlans || []).find((p: any) => p.id === planId);
    if (!found) {
      issues.push(`Plan exists in DB but is invisible to the standard patient query (Possible RLS/Tenant issue)`);
    }
  }

  if (issues.length > 0) {
    const errorMsg = `[E2E Failure] Validation issues:\n- ${issues.join('\n- ')}`;
    await diagnosticClient.from('system_alerts').insert({
      alert_type: 'E2E_CONSISTENCY_ERROR',
      severity: 'critical',
      message: errorMsg,
      correlation_id: correlationId,
      metadata: { plan_id: planId, patient_id: patientId, issues }
    });
    return { success: false, issues };
  }

  return { success: true, correlationId };
};
