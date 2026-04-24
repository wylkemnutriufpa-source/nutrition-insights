import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

export interface ConsolidationPlan {
  /** IDs cuja `day_of_week` deve ser alterada para 0. */
  toMove: string[];
  /** Total de itens que ficaram em day != 0 (informativo). */
  legacyCount: number;
}

/**
 * Calcula quais itens devem ser movidos para o slot canônico (day=0).
 * Estratégia conservadora: só migra refeições legadas se `day=0` estiver
 * vazio para aquele `meal_type`. Caso contrário, manteríamos duplicatas.
 *
 * Quando `force=true`, ainda assim só migra se não conflitar — outros
 * itens conflitantes ficam preservados para revisão manual.
 */
export function planLegacyConsolidation(
  items: ReadonlyArray<MealPlanItem>,
  options: { force?: boolean } = {}
): ConsolidationPlan {
  const legacy = items.filter((i) => (i.day_of_week ?? 0) !== 0);
  if (legacy.length === 0) return { toMove: [], legacyCount: 0 };

  const day0ByMeal = new Map<string, MealPlanItem[]>();
  for (const it of items) {
    if ((it.day_of_week ?? 0) === 0) {
      const arr = day0ByMeal.get(it.meal_type) ?? [];
      arr.push(it);
      day0ByMeal.set(it.meal_type, arr);
    }
  }

  const toMove: string[] = [];
  for (const it of legacy) {
    const existing = day0ByMeal.get(it.meal_type) ?? [];
    if (existing.length === 0 || options.force) {
      toMove.push(it.id);
    }
  }

  return { toMove, legacyCount: legacy.length };
}
