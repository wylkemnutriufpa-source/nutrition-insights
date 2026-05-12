/**
 * Single Day Plan Migration / Upgrade
 * ----------------------------------------------------------------
 * Garante que planos antigos (sem `plan_mode` definido) sejam tratados
 * como `weekly` em runtime. Trabalha em conjunto com o backfill SQL
 * (migration `20260424…hardening`) que normaliza todos os registros
 * persistidos para `weekly` quando `plan_mode IS NULL`.
 *
 * Usar como camada defensiva no frontend para qualquer plano que
 * ainda chegue sem o campo (cache antigo, snapshots em sessionStorage,
 * payloads vindos de edge functions desatualizadas, etc).
 */

import type { Tables } from "@v1/integrations/supabase/types";

export type PlanMode = "weekly" | "single_day";

type AnyPlan = Partial<Tables<"meal_plans">> & {
  plan_mode?: PlanMode | null;
};

export function classifyPlanMode(plan: AnyPlan | null | undefined): PlanMode {
  if (!plan) return "weekly";
  const raw = (plan as { plan_mode?: unknown }).plan_mode;
  if (raw === "single_day") return "single_day";
  // Qualquer valor inesperado, NULL ou ausente → trata como weekly (legado)
  return "weekly";
}

export function ensurePlanMode<T extends AnyPlan>(plan: T): T & { plan_mode: PlanMode } {
  return { ...plan, plan_mode: classifyPlanMode(plan) };
}

/**
 * Normaliza um array de planos. Útil para listas vindas do banco
 * que podem conter registros legados sem `plan_mode`.
 */
export function ensurePlanModeMany<T extends AnyPlan>(plans: T[]): Array<T & { plan_mode: PlanMode }> {
  return plans.map(ensurePlanMode);
}

export function isLegacyPlan(plan: AnyPlan | null | undefined): boolean {
  if (!plan) return false;
  const raw = (plan as { plan_mode?: unknown }).plan_mode;
  return raw == null || (raw !== "weekly" && raw !== "single_day");
}
