/**
 * Meal Assembler — ONDA 2B
 * Transforma slots em refeições reais com gramagens e macros soberanos.
 */
import { MealItem, MacroTargets, ClinicalProfile, ReconcileResult } from './types';
import { reconcileMeal } from './reconciler';

export interface ComposedMeal {
  items: MealItem[];
  totals: MacroTargets;
  is_reconciled: boolean;
}

export function composeMeal(
  baseItems: MealItem[],
  targets: MacroTargets,
  profile: ClinicalProfile
): ComposedMeal {
  // O Assembler é o orquestrador que garante a ordem soberana
  const result = reconcileMeal(baseItems, targets, profile);
  
  return {
    items: result.items,
    totals: result.totals,
    is_reconciled: result.violations.length === 0
  };
}
