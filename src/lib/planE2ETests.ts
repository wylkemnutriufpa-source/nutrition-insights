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
  console.log(`[E2E Test] Verifying publication flow for plan ${planId}`);

  // Fetch using generic client to avoid complex type instantiation depth issues
  const { data: plan, error: dbError } = await diagnosticClient
    .from('meal_plans')
    .select('*')
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
  const { data: visiblePlans, error: visibilityError } = await diagnosticClient
    .from('meal_plans')
    .select('id')
    .eq('patient_id', patientId)
    .eq('status', 'published')
    .eq('is_active', true);

  if (visibilityError) {
    issues.push(`Visibility query failed: ${visibilityError.message}`);
  } else {
    const isVisible = (visiblePlans || []).some((p: any) => p.id === planId);
    if (!isVisible) {
      issues.push(`Plan exists but is HIDDEN from patient queries. Check RLS or tenant_id.`);
    }
  }

  if (issues.length > 0) {
    const errorMsg = `[E2E Failure] Publication validation failed:\n- ${issues.join('\n- ')}`;
    console.error(errorMsg);
    
    await diagnosticClient.from('system_alerts').insert({
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
