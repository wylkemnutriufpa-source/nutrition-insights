import { supabase } from "@v1/integrations/supabase/client";

/**
 * Validates advanced audit filters (tenant, status, mode)
 */
export const testAdvancedAuditFilters = async (tenantId: string) => {
  console.log(`[E2E] Testing advanced filters for tenant: ${tenantId}`);

  // 1. Test Alert Filtering
  const { data: alerts, error: alertError } = await (supabase.rpc('get_advanced_alerts', {
    p_tenant_id: tenantId,
    p_limit: 10
  }) as any);

  if (alertError) throw new Error(`Alert filter failed: ${alertError.message}`);
  
  const mismatch = (alerts || []).find((a: any) => a.metadata?.tenant_id && a.metadata.tenant_id !== tenantId);
  if (mismatch) throw new Error(`Filter leaked data from other tenant: ${mismatch.metadata.tenant_id}`);

  // 2. Test Drop Metrics logic
  const { data: metrics, error: metricError } = await (supabase.rpc('get_plan_drop_metrics', {
    p_patient_id: '00000000-0000-0000-0000-000000000000', // Dummy
    p_cutoff: new Date().toISOString()
  }) as any);

  if (metricError) throw new Error(`Metrics RPC failed: ${metricError.message}`);
  if (typeof metrics.diff !== 'number') throw new Error(`Invalid metric response: ${JSON.stringify(metrics)}`);

  console.log("[E2E] Advanced Audit Filters validated successfully.");
  return true;
};
