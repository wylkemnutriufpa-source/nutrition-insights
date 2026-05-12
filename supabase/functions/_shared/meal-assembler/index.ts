/**
 * Meal Assembler — public surface for Onda 2B.
 * Atomic. No DB, no fetch, no persistence, no UI.
 */
export { composeMeal, ASSEMBLER_VERSION } from "./composeMeal.ts";
export { reconcileMeal } from "./reconcileMeal.ts";
export {
  clinicalUpperBound,
  isProteinRole,
  FEMALE_PROTEIN_MAX_GRAMS,
} from "./slotConstraints.ts";
export type * from "./mealAssembler.types.ts";
export type * from "./reconcileResult.ts";
