/**
 * Single Day Repair Helper
 * ----------------------------------------------------------------
 * Encapsula chamadas RPC para reparo e validação de planos
 * em modo "Dia Padrão".
 */

import { supabase } from "@/integrations/supabase/client";

export interface ValidationReport {
  valid: boolean;
  mode: string;
  master_items?: number;
  replica_items?: number;
  expected_replicas?: number;
  inconsistencies?: Array<{
    master_id?: string;
    meal_type: string;
    title: string;
    issue: string;
    day_of_week?: number;
    detail?: Record<string, unknown>;
  }>;
  reason?: string;
}

export async function validateSingleDayConsistencyRpc(
  planId: string
): Promise<ValidationReport | null> {
  const { data, error } = await supabase.rpc(
    "validate_single_day_consistency" as any,
    { p_plan_id: planId }
  );
  if (error) {
    console.warn("[validateSingleDayConsistency] RPC erro:", error.message);
    return null;
  }
  return (data ?? null) as unknown as ValidationReport;
}

export interface RepairResult {
  ok: boolean;
  deleted?: number;
  inserted?: number;
  reason?: string;
}

export async function repairSingleDayPlan(planId: string): Promise<RepairResult> {
  const { data, error } = await supabase.rpc(
    "repair_single_day_plan" as any,
    { p_plan_id: planId }
  );
  if (error) {
    console.error("[repairSingleDayPlan] erro:", error.message);
    return { ok: false, reason: error.message };
  }
  return (data ?? { ok: false }) as unknown as RepairResult;
}
