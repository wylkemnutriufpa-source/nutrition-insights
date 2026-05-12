/**
 * Slot Elasticity — frozen catalogue.
 *
 * NOTE (Onda 2A): the elasticity table is consumed by the future Reconciler
 * layer (Onda 2B+). It is exported here so the contract stays stable, but
 * composeSlotSequence() does NOT touch macros or scaling in this wave.
 */

import type { SlotRole } from "./types.ts";

export interface SlotElasticity {
  /** Min scale factor (e.g. 0.9 = -10% portion). */
  min: number;
  /** Max scale factor (e.g. 1.1 = +10% portion). */
  max: number;
  /** 0 = touched LAST by reconciler (most clinical-sensitive). */
  pivot_priority: number;
}

export const SLOT_ELASTICITY: Record<SlotRole, SlotElasticity> = {
  protein_lean:  { min: 0.90, max: 1.10, pivot_priority: 0 },
  protein_fat:   { min: 0.90, max: 1.10, pivot_priority: 0 },
  dairy:         { min: 0.85, max: 1.15, pivot_priority: 1 },
  legume:        { min: 0.80, max: 1.20, pivot_priority: 2 },
  vegetable:     { min: 0.70, max: 1.40, pivot_priority: 4 },
  fruit:         { min: 0.80, max: 1.25, pivot_priority: 3 },
  carb_complex:  { min: 0.70, max: 1.40, pivot_priority: 3 },
  carb_simple:   { min: 0.60, max: 1.30, pivot_priority: 4 },
  fat_source:    { min: 0.80, max: 1.20, pivot_priority: 2 },
  beverage:      { min: 0.50, max: 1.50, pivot_priority: 5 },
  free:          { min: 0.50, max: 1.50, pivot_priority: 5 },
};

export function getSlotElasticity(role: SlotRole): SlotElasticity {
  return SLOT_ELASTICITY[role];
}
