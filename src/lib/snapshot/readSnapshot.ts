/**
 * Onda 2A — PDF Snapshot Read (modo PASSIVO)
 * ─────────────────────────────────────────────────
 * Camada SOMENTE LEITURA do MealPlanSnapshot v1 persistido em
 * `meal_plans.snapshot` (jsonb).
 *
 * REGRAS DE OURO:
 *  - NÃO recalcular nada.
 *  - NÃO normalizar/transformar a estrutura.
 *  - NÃO criar fallback "inteligente".
 *  - Apenas LER, validar shape mínimo e devolver tipado, ou null.
 *
 * O snapshot é SOBERANO: a forma já está correta no momento da publicação.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  MealPlanSnapshotV1,
  SNAPSHOT_SCHEMA_VERSION,
} from "./types";

export interface SnapshotReadResult {
  planId: string;
  /** Presente quando a coluna `snapshot` já foi populada (Onda 1+). */
  snapshot: MealPlanSnapshotV1 | null;
  schemaVersion: string | null;
  engineVersion: string | null;
  hash: string | null;
  /** True quando a coluna existe mas está vazia / shape inválido. */
  legacyOnly: boolean;
  /** Mensagem técnica (somente diagnóstico, nunca exibida ao usuário). */
  reason?: string;
}

/**
 * Lê o snapshot persistido para um meal_plan.
 * Não lança exceção — devolve `legacyOnly: true` em qualquer falha.
 */
export async function readMealPlanSnapshot(
  planId: string,
): Promise<SnapshotReadResult> {
  const empty = (reason: string): SnapshotReadResult => ({
    planId,
    snapshot: null,
    schemaVersion: null,
    engineVersion: null,
    hash: null,
    legacyOnly: true,
    reason,
  });

  if (!planId) return empty("missing_plan_id");

  try {
    const { data, error } = await supabase
      .from("meal_plans")
      .select("id, snapshot, snapshot_schema_version, engine_version, snapshot_hash")
      .eq("id", planId)
      .maybeSingle();

    if (error) return empty(`db_error:${error.code || "unknown"}`);
    if (!data) return empty("plan_not_found");

    const raw = (data as any).snapshot;
    if (!raw || typeof raw !== "object") return empty("snapshot_absent");

    // Validação MÍNIMA de shape — não normaliza, apenas confirma presença.
    if (
      typeof raw.schema_version !== "string" ||
      !Array.isArray(raw.days) ||
      !raw.plan ||
      !raw.targets
    ) {
      return empty("snapshot_invalid_shape");
    }

    if (raw.schema_version !== SNAPSHOT_SCHEMA_VERSION) {
      return {
        planId,
        snapshot: null,
        schemaVersion: raw.schema_version,
        engineVersion: (data as any).engine_version ?? raw.engine_version ?? null,
        hash: (data as any).snapshot_hash ?? raw.hash ?? null,
        legacyOnly: true,
        reason: `schema_version_mismatch:${raw.schema_version}`,
      };
    }

    return {
      planId,
      snapshot: raw as MealPlanSnapshotV1,
      schemaVersion: raw.schema_version,
      engineVersion: (data as any).engine_version ?? raw.engine_version ?? null,
      hash: (data as any).snapshot_hash ?? raw.hash ?? null,
      legacyOnly: false,
    };
  } catch (e: any) {
    return empty(`exception:${e?.message || "unknown"}`);
  }
}
