/**
 * Clinical Engine V2 — Soberania Clínica
 * SINGLE SOURCE OF TRUTH for all clinical calculations.
 * 
 * Hierarchy:
 * 1. Protein (Fixed)
 * 2. Fat (Semi-fixed)
 * 3. Carb (Primary Pivot)
 * 4. Fiber (Secondary Pivot)
 */

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface ClinicalProfile {
  sex: 'male' | 'female';
  weight: number;
  height: number;
  age: number;
  activityLevel: string;
  goal: string;
}

export interface MealItem {
  id?: string;
  name: string;
  grams: number;
  macro_role: 'protein' | 'carb' | 'fat' | 'fiber' | 'fixed';
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  calories_per_100g: number;
}

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose_weight: -500,
  lose: -500,
  maintain: 0,
  gain_muscle: 300,
  gain_weight: 500,
  gain: 400,
  improve_health: -200,
  athletic_performance: 200,
};

export const CLINICAL_PROTEIN_RANGES: Record<string, { min: number; max: number; ideal: number }> = {
  lose:                 { min: 1.6, max: 2.2, ideal: 2.0 },
  lose_weight:          { min: 1.6, max: 2.2, ideal: 2.0 },
  improve_health:       { min: 1.4, max: 2.0, ideal: 1.6 },
  maintain:             { min: 1.4, max: 2.0, ideal: 1.6 },
  gain_muscle:          { min: 1.8, max: 2.5, ideal: 2.2 },
  gain_weight:          { min: 1.8, max: 2.5, ideal: 2.2 },
  gain:                 { min: 1.8, max: 2.5, ideal: 2.2 },
  athletic_performance: { min: 1.6, max: 2.2, ideal: 2.0 },
};

export const CLINICAL_FAT_RANGE = { min: 0.8, max: 1.0, ideal: 0.9 };

export const PROTEIN_HARD_CLAMP_FEMALE = 150; // grams of solid protein source (e.g. 150g frango)

/**
 * Reconciliador Soberano
 */
export function reconcileMeal(
  items: MealItem[],
  targets: MacroTargets,
  profile: ClinicalProfile
) {
  const result = JSON.parse(JSON.stringify(items)) as MealItem[];
  
  // 1. FIX PROTEIN
  const proteinItems = result.filter(i => i.macro_role === 'protein');
  proteinItems.forEach(item => {
    const density = item.protein_per_100g / 100;
    if (density > 0) {
      const targetProtein = targets.protein / proteinItems.length;
      let targetGrams = targetProtein / density;
      
      // Clamp Clínico Rígido
      if (profile.sex === 'female' && targetGrams > PROTEIN_HARD_CLAMP_FEMALE) {
        targetGrams = PROTEIN_HARD_CLAMP_FEMALE;
      }
      
      item.grams = Math.round(targetGrams);
    }
  });

  // Calculate current
  let current = calculateTotals(result);

  // 2. ADJUST FAT (SEMI-FIXED)
  const fatItems = result.filter(i => i.macro_role === 'fat');
  fatItems.forEach(item => {
    const density = item.fat_per_100g / 100;
    if (density > 0) {
      const neededFat = Math.max(0, targets.fat - (current.fat - (item.grams * density)));
      const targetFat = neededFat / fatItems.length;
      item.grams = Math.round(targetFat / density);
    }
  });

  current = calculateTotals(result);

  // 3. ADJUST CARBS (PRIMARY PIVOT)
  const carbItems = result.filter(i => i.macro_role === 'carb');
  if (carbItems.length > 0) {
    const neededCarbs = Math.max(0, targets.carbs - current.carbs);
    carbItems.forEach(item => {
      const density = item.carbs_per_100g / 100;
      if (density > 0) {
        const share = neededCarbs / carbItems.length;
        item.grams = Math.round(share / density);
      }
    });
  }

  return {
    items: result,
    totals: calculateTotals(result)
  };
}

function calculateTotals(items: MealItem[]) {
  return items.reduce((acc, item) => {
    const f = item.grams / 100;
    return {
      protein: acc.protein + (item.protein_per_100g * f),
      carbs: acc.carbs + (item.carbs_per_100g * f),
      fat: acc.fat + (item.fat_per_100g * f),
      calories: acc.calories + (item.calories_per_100g * f),
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
}
