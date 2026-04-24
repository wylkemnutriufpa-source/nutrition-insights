import type { MealPlanItem } from "@/stores/mealPlanEditorV2Store";

export interface ConsolidationConflict {
  /** ID do item legado que NÃO pôde ser migrado. */
  itemId: string;
  /** Tipo de refeição em conflito. */
  mealType: string;
  /** Dia legado de origem (1..6). */
  fromDay: number;
}

export interface ConsolidationPlan {
  /** IDs cuja `day_of_week` deve ser alterada para 0. */
  toMove: string[];
  /** Itens não migrados por conflito de meal_type em day 0. */
  conflicts: ConsolidationConflict[];
  /** Total de itens que ficaram em day != 0 (informativo). */
  legacyCount: number;
  /** Quantidade movida agrupada por meal_type. */
  movedByMealType: Record<string, number>;
  /** Quantidade conflitante agrupada por meal_type. */
  conflictsByMealType: Record<string, number>;
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
  const empty: ConsolidationPlan = {
    toMove: [],
    conflicts: [],
    legacyCount: 0,
    movedByMealType: {},
    conflictsByMealType: {},
  };

  const legacy = items.filter((i) => (i.day_of_week ?? 0) !== 0);
  if (legacy.length === 0) return empty;

  const day0ByMeal = new Map<string, MealPlanItem[]>();
  for (const it of items) {
    if ((it.day_of_week ?? 0) === 0) {
      const arr = day0ByMeal.get(it.meal_type) ?? [];
      arr.push(it);
      day0ByMeal.set(it.meal_type, arr);
    }
  }

  const toMove: string[] = [];
  const conflicts: ConsolidationConflict[] = [];
  const movedByMealType: Record<string, number> = {};
  const conflictsByMealType: Record<string, number> = {};

  for (const it of legacy) {
    const existing = day0ByMeal.get(it.meal_type) ?? [];
    const canMove = existing.length === 0 || options.force;
    if (canMove) {
      toMove.push(it.id);
      movedByMealType[it.meal_type] = (movedByMealType[it.meal_type] ?? 0) + 1;
    } else {
      conflicts.push({
        itemId: it.id,
        mealType: it.meal_type,
        fromDay: it.day_of_week ?? 0,
      });
      conflictsByMealType[it.meal_type] = (conflictsByMealType[it.meal_type] ?? 0) + 1;
    }
  }

  return {
    toMove,
    conflicts,
    legacyCount: legacy.length,
    movedByMealType,
    conflictsByMealType,
  };
}

/** Rótulos human-readable para meal_type (PT-BR). */
export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};

/** Snapshot de um item antes da migração (para undo). */
export interface MigrationUndoEntry {
  itemId: string;
  previousDay: number;
}

/**
 * Constrói o snapshot de undo a partir do plano de consolidação e do
 * estado atual dos itens. Use ANTES de aplicar a migração.
 */
export function buildMigrationUndoSnapshot(
  items: ReadonlyArray<MealPlanItem>,
  toMove: ReadonlyArray<string>
): MigrationUndoEntry[] {
  const map = new Map(items.map((i) => [i.id, i.day_of_week ?? 0] as const));
  return toMove
    .map((id) => ({ itemId: id, previousDay: map.get(id) ?? 0 }))
    .filter((e) => e.previousDay !== 0);
}

/** Formata um resumo human-readable das contagens por meal_type. */
export function formatMealTypeCounts(map: Record<string, number>): string {
  const entries = Object.entries(map);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => `${MEAL_TYPE_LABELS[k] ?? k}: ${v}`)
    .join(", ");
}
