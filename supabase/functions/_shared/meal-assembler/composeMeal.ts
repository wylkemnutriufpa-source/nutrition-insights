/**
 * composeMeal — orchestrates a single deterministic meal.
 *
 * Pure function. Wraps reconcileMeal and produces a ComposedMeal envelope
 * with auditable metadata. Same input ⇒ same output.
 *
 * NON-GOALS (Onda 2B):
 *  - Cross-meal coordination, persistence, snapshot, PDF, UI, substitutions.
 */

import type {
  ComposeMealInput,
  ComposedItem,
  MealMacroTotals,
} from "./mealAssembler.types.ts";
import { reconcileMeal } from "./reconcileMeal.ts";
import type { ReconcileResult } from "./reconcileResult.ts";

export interface ComposedMeal {
  meal_id?: string;
  ok: boolean;
  items: ComposedItem[];
  totals: MealMacroTotals;
  reconciliation: ReconcileResult;
  metadata: {
    behavior_profile_name?: string;
    seed?: string;
    sex: "F" | "M";
    slot_count: number;
    assembler_version: string;
  };
}

export const ASSEMBLER_VERSION = "1.0.0-onda2b";

export function composeMeal(input: ComposeMealInput): ComposedMeal {
  const result = reconcileMeal(
    input.slots,
    input.targets,
    input.sex,
    input.options,
  );
  return {
    meal_id: input.meal_id,
    ok: result.ok,
    items: result.items,
    totals: result.totals,
    reconciliation: result,
    metadata: {
      behavior_profile_name: input.behavior_profile_name,
      seed: input.seed,
      sex: input.sex,
      slot_count: input.slots.length,
      assembler_version: ASSEMBLER_VERSION,
    },
  };
}
