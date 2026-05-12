/**
 * Meal Assembler — Pure types.
 *
 * Onda 2B (atomic). NO DB, NO fetch, NO persistence, NO UI.
 * See docs/WEEKLY_COMPOSER_CONTRACT.md (v1.0.0).
 */

import type { SlotRole } from "../weekly-composer/types.ts";
import type { SlotElasticity } from "../weekly-composer/slotElasticity.ts";

export type Sex = "F" | "M";

/** Macros per 100g. NEVER per portion. */
export interface FoodMacrosPer100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodRef {
  id: string;
  name?: string;
  macros_per_100g: FoodMacrosPer100g;
}

export interface SlotSpec {
  role: SlotRole;
  food: FoodRef;
  /** Initial portion in grams BEFORE reconciliation. Must be > 0. */
  base_grams: number;
  /**
   * Optional override of the default elasticity (rare). When omitted the
   * reconciler reads SLOT_ELASTICITY[role].
   */
  elasticity?: SlotElasticity;
}

export interface MealTargets {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealMacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type ClampFlag =
  | null
  | "min_elasticity"
  | "max_elasticity"
  | "female_protein_150g";

export interface ComposedItem {
  food_id: string;
  food_name?: string;
  role: SlotRole;
  base_grams: number;
  grams: number;
  scale_factor: number;
  clamped: ClampFlag;
  macros: MealMacroTotals; // contribution of THIS item
  pivot_priority: number;
}

export interface AssemblerTolerances {
  kcal: number;    // default 0.05  (±5%)
  protein: number; // default 0.03  (±3%)
}

export interface AssemblerOptions {
  maxIterations?: number;        // default 8
  tolerances?: Partial<AssemblerTolerances>;
}

export interface ComposeMealInput {
  /** Diagnostic only; does not affect determinism. */
  meal_id?: string;
  slots: SlotSpec[];
  targets: MealTargets;
  sex: Sex;
  /** Behavior profile name — kept for metadata. Not used in reconcile math. */
  behavior_profile_name?: string;
  /** Optional seed string for tracing only. NOT used by RNG (assembler is deterministic without RNG). */
  seed?: string;
  options?: AssemblerOptions;
}
