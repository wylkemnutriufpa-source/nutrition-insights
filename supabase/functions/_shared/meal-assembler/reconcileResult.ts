/**
 * Reconcile Result — discriminated union, never throws.
 */
import type {
  ComposedItem,
  MealMacroTotals,
  MealTargets,
} from "./mealAssembler.types.ts";

export type ReconcileFailureReason =
  | "KCAL_OUT_OF_TOLERANCE"
  | "PROTEIN_OUT_OF_TOLERANCE"
  | "ITERATION_LIMIT_EXCEEDED"
  | "EMPTY_SLOTS"
  | "INVALID_TARGETS";

export interface ReconcileMetadata {
  iterations: number;
  tolerances: { kcal: number; protein: number };
  initial_totals: MealMacroTotals;
  final_totals: MealMacroTotals;
  targets: MealTargets;
  kcal_deviation: number;     // signed: actual - target, fraction of target
  protein_deviation: number;  // signed: actual - target, fraction of target
  touched_roles: string[];    // roles whose grams changed
  female_protein_clamp_hit: boolean;
}

export interface ReconcileOk {
  ok: true;
  items: ComposedItem[];
  totals: MealMacroTotals;
  metadata: ReconcileMetadata;
}

export interface ReconcileFail {
  ok: false;
  reason: ReconcileFailureReason;
  message: string;
  items: ComposedItem[];        // best-effort partial result, never silent
  totals: MealMacroTotals;
  metadata: ReconcileMetadata;
  requires_review: true;
}

export type ReconcileResult = ReconcileOk | ReconcileFail;
