/**
 * MealPlanSnapshot v1 — Persistência (Onda 1)
 * ────────────────────────────────────────────
 * Grava o snapshot via RPC `persist_meal_plan_snapshot` (SECURITY DEFINER).
 * Falhas são reportadas mas NÃO devem bloquear o fluxo de publicação.
 */

import { supabase } from "@/integrations/supabase/client";
import { buildMealPlanSnapshot, BuildSnapshotOptions } from "./buildSnapshot";
import { SNAPSHOT_SCHEMA_VERSION } from "./types";
import { validateMealPlanSnapshot, logSovereignEvent, getCorrelationId } from "@/lib/runtimeGovernance";

export interface PersistSnapshotResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * Gera + persiste o snapshot de um plano publicado.
 * Idempotente: re-publicar regenera o snapshot.
 */
export async function generateAndPersistMealPlanSnapshot(
  planId: string,
  options: BuildSnapshotOptions = {}
): Promise<PersistSnapshotResult> {
  try {
    const snapshot = await buildMealPlanSnapshot(planId, options);
    
    // 🛡️ Blindagem Operacional: Validação rígida antes da persistência
    validateMealPlanSnapshot(snapshot, "persist_snapshot");

    const { data, error } = await supabase.rpc(
      "persist_meal_plan_snapshot" as any,
      {
        _plan_id: planId,
        _snapshot: snapshot as unknown as Record<string, unknown>,
        _schema_version: SNAPSHOT_SCHEMA_VERSION,
        _engine_version: snapshot.engine_version,
        _snapshot_hash: snapshot.hash,
      }
    );

    if (error) {
      const errMsg = `[FATAL-SNAPSHOT] RPC persist_meal_plan_snapshot failed: ${error.message} (Code: ${error.code})`;
      console.error(errMsg, { planId, correlationId: getCorrelationId() });
      await logSovereignEvent("ERROR", "snapshot_persist_failed", { planId, error: error.message, code: error.code });
      throw new Error(errMsg);
    }

    const result = data as Record<string, unknown> | null;
    if (result && result.success === false) {
      const errMsg = `[FATAL-SNAPSHOT] RPC logic failure: ${result.error || 'unknown_error'}`;
      console.error(errMsg, { planId });
      throw new Error(errMsg);
    }

    return { success: true, hash: snapshot.hash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[snapshot] build/persist failed:", message);
    return { success: false, error: message };
  }
}
