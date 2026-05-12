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

export interface ClinicalEvent {
  type: string;
  before: number;
  after: number;
  meal_type?: string;
  source_rule: string;
  metadata?: any;
}

export const PROTEIN_HARD_CLAMP_FEMALE = 150;
export const PROTEIN_HARD_CLAMP_MALE = 200;

/**
 * Reconciliador Soberano V2
 */
export function reconcileMeal(
  items: MealItem[],
  targets: MacroTargets,
  profile: ClinicalProfile,
  mealType?: string
) {
  const result = JSON.parse(JSON.stringify(items)) as MealItem[];
  const events: ClinicalEvent[] = [];
  
  // 1. FIX PROTEIN
  const proteinItems = result.filter(i => i.macro_role === 'protein');
  proteinItems.forEach(item => {
    const density = item.protein_per_100g / 100;
    if (density > 0) {
      const targetProtein = targets.protein / proteinItems.length;
      let targetGrams = targetProtein / density;
      const originalGrams = targetGrams;
      
      // Clamp Clínico Rígido
      const maxGrams = profile.sex === 'female' ? PROTEIN_HARD_CLAMP_FEMALE : PROTEIN_HARD_CLAMP_MALE;
      
      if (targetGrams > maxGrams) {
        targetGrams = maxGrams;
        events.push({
          type: 'protein_clamp_applied',
          before: originalGrams,
          after: targetGrams,
          meal_type: mealType,
          source_rule: `hard_clamp_${profile.sex}`,
          metadata: { food: item.name }
        });
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
  carbItems.forEach(item => {
    const density = item.carbs_per_100g / 100;
    if (density > 0) {
      const carbsFromOthers = current.carbs - (item.grams * density);
      const neededCarbs = Math.max(0, targets.carbs - carbsFromOthers);
      const share = neededCarbs / carbItems.length;
      item.grams = Math.round(share / density);
      
      current = calculateTotals(result);
    }
  });

  return {
    items: result,
    totals: calculateTotals(result),
    events
  };
}

export function calculateTotals(items: MealItem[]) {
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
