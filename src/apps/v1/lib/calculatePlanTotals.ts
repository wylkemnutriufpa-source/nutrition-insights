/**
 * Helper para garantir consistência dos totais de um plano alimentar
 * SEM bloquear o fluxo do usuário.
 *
 * Regras:
 *  - Sempre tenta recalcular via RPC `calculate_plan_totals`
 *  - Se o RPC falhar, retorna { success: false } mas NÃO lança erro
 *  - O backend marca planos sem totais como `totals_status = 'incomplete'`
 *    para correção assíncrona, sem impedir salvamento/publicação.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PlanTotals {
  success: boolean;
  totals_status: "ok" | "incomplete";
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  item_count?: number;
  error?: string;
}

const EMPTY: PlanTotals = {
  success: false,
  totals_status: "incomplete",
  total_calories: 0,
  total_protein: 0,
  total_carbs: 0,
  total_fat: 0,
};

/**
 * Recalcula os totais de um plano com base nos itens persistidos.
 * Nunca lança — falhas viram `{ success:false, totals_status:'incomplete' }`.
 */
export async function calculatePlanTotals(planId: string | undefined | null): Promise<PlanTotals> {
  if (!planId) return EMPTY;

  try {
    const { data, error } = await (supabase.rpc as any)("calculate_plan_totals", {
      p_plan_id: planId,
    });

    if (error) {
      console.warn("[calculatePlanTotals] RPC error (non-blocking):", error.message);
      return { ...EMPTY, error: error.message };
    }

    const d = (data || {}) as Record<string, any>;
    return {
      success: !!d.success,
      totals_status: d.totals_status === "ok" ? "ok" : "incomplete",
      total_calories: Number(d.total_calories) || 0,
      total_protein: Number(d.total_protein) || 0,
      total_carbs: Number(d.total_carbs) || 0,
      total_fat: Number(d.total_fat) || 0,
      item_count: Number(d.item_count) || 0,
    };
  } catch (e: any) {
    console.warn("[calculatePlanTotals] Exception (non-blocking):", e?.message);
    return { ...EMPTY, error: e?.message };
  }
}

/**
 * Garante que `total_calories` esteja preenchido. Se vier 0 ou null,
 * dispara recálculo. Sempre retorna o melhor valor disponível.
 */
export async function ensurePlanTotals(
  planId: string | undefined | null,
  current: { total_calories?: number | null } | null | undefined,
): Promise<PlanTotals> {
  const calories = Number(current?.total_calories) || 0;
  if (calories > 0) {
    return {
      success: true,
      totals_status: "ok",
      total_calories: calories,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
    };
  }
  return calculatePlanTotals(planId);
}
