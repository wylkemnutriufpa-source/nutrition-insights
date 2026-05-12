/**
 * Slot Constraints — clinical clamps applied to portion grams.
 *
 * These are HARD clamps. They override elasticity and any reconciler nudge.
 * Currently:
 *  - Female protein (lunch & dinner role categories) ≤ 150g absolute.
 *
 * Designed to be extended (e.g. carbs at night, beans cap, etc.) WITHOUT
 * touching reconcileMeal.ts logic.
 */
import type { SlotRole } from "../weekly-composer/types.ts";
import type { Sex } from "./mealAssembler.types.ts";

export const FEMALE_PROTEIN_MAX_GRAMS = 150;

export function isProteinRole(role: SlotRole): boolean {
  return role === "protein_lean" || role === "protein_fat";
}

/**
 * Returns the absolute upper bound for `grams` for a given (sex, role).
 * `Infinity` means no clinical clamp applies.
 */
export function clinicalUpperBound(sex: Sex, role: SlotRole): number {
  if (sex === "F" && isProteinRole(role)) return FEMALE_PROTEIN_MAX_GRAMS;
  return Number.POSITIVE_INFINITY;
}
