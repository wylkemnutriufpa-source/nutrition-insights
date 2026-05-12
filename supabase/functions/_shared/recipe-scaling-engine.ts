/**
 * Recipe Scaling Engine (LEGACY)
 * @deprecated Use ClinicalEngine V2 instead.
 * 
 * Re-implementado como wrapper do ClinicalEngineV2 para garantir Soberania Clínica.
 */

import { reconcileMeal, MacroTargets, ClinicalProfile, MealItem } from "./clinical-engine-v2.ts";

export interface RecipeIngredient {
  name: string;
  grams: number;
  macro_role?: "protein" | "carb" | "fat" | "fiber" | "fixed";
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  calories_per_100g?: number;
}

export function scaleRecipeByMacros(
  ingredients: RecipeIngredient[],
  target: { protein: number; carbs: number; fat: number }
): { items: RecipeIngredient[]; totals: { cal: number; p: number; c: number; f: number } } {
  console.warn("[LegacyEngine] RecipeScalingEngine is deprecated. Redirecting to ClinicalEngineV2.");

  const targets: MacroTargets = {
    protein: target.protein,
    carbs: target.carbs,
    fat: target.fat,
    calories: target.protein * 4 + target.carbs * 4 + target.fat * 9
  };

  const profile: ClinicalProfile = {
    sex: 'male', // default for legacy
    weight: 70,
    height: 170,
    age: 30,
    activityLevel: 'moderate',
    goal: 'maintain'
  };

  const mealItems: MealItem[] = ingredients.map(ing => ({
    name: ing.name,
    grams: ing.grams,
    macro_role: ing.macro_role || 'fixed',
    protein_per_100g: ing.protein_per_100g || 0,
    carbs_per_100g: ing.carbs_per_100g || 0,
    fat_per_100g: ing.fat_per_100g || 0,
    calories_per_100g: ing.calories_per_100g || 0
  }));

  const result = reconcileMeal(mealItems, targets, profile);

  return {
    items: result.items.map(it => ({
      name: it.name,
      grams: it.grams,
      macro_role: it.macro_role
    })),
    totals: {
      cal: Math.round(result.totals.calories),
      p: Math.round(result.totals.protein),
      c: Math.round(result.totals.carbs),
      f: Math.round(result.totals.fat)
    }
  };
}
