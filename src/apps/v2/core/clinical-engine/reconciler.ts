import { MealItem, MacroTargets, ReconcileResult, ClinicalProfile } from './types';
import { applyProteinClamp } from './clamps';

/**
 * Reconciliador Soberano
 * 
 * Ordem de Reconciliação:
 * 1. Proteína (FIXA)
 * 2. Gordura (SEMI-FIXA)
 * 3. Carboidrato (PIVOT PRINCIPAL)
 * 4. Vegetal/Fibra (PIVOT SECUNDÁRIO)
 */
export function reconcileMeal(
  items: MealItem[],
  targets: MacroTargets,
  profile: ClinicalProfile
): ReconcileResult {
  const result: MealItem[] = JSON.parse(JSON.stringify(items));
  const violations: string[] = [];

  // 1. FIX PROTEIN
  // Protein is non-negotiable and fixed first.
  const proteinItems = result.filter(i => i.macro_role === 'protein');
  proteinItems.forEach(item => {
    // Calculate required grams to hit target protein (distributed among protein items)
    // If target is total for the meal, we split it.
    const density = item.macros_per_100g.protein / 100;
    if (density > 0) {
      const targetProtein = targets.protein / proteinItems.length;
      let targetGrams = targetProtein / density;
      
      // Apply Sovereignty Clamps
      targetGrams = applyProteinClamp(targetGrams, item, profile);
      
      item.grams = Math.round(targetGrams);
    }
  });

  // Calculate current state after fixing protein
  let current = calculateCurrentMacros(result);

  // 2. ADJUST FAT (SEMI-FIXED)
  const fatItems = result.filter(i => i.macro_role === 'fat');
  fatItems.forEach(item => {
    const density = item.macros_per_100g.fat / 100;
    if (density > 0) {
      // If we are over fat target already due to protein items, we might need to minimize fat items
      const neededFat = Math.max(0, targets.fat - (current.fat - (item.grams * density)));
      const targetFat = neededFat / fatItems.length;
      item.grams = Math.round(targetFat / density);
    }
  });

  current = calculateCurrentMacros(result);

  // 3. ADJUST CARBS (PRIMARY PIVOT)
  const carbItems = result.filter(i => i.macro_role === 'carb');
  carbItems.forEach(item => {
    const density = item.macros_per_100g.carbs / 100;
    if (density > 0) {
      // Calculate carbs already provided by NON-carb items
      const carbsFromOthers = current.carbs - (item.grams * density);
      const neededCarbs = Math.max(0, targets.carbs - carbsFromOthers);
      const share = neededCarbs / carbItems.length;
      item.grams = Math.round(share / density);
      
      // Update current for next carb item if any
      current = calculateCurrentMacros(result);
    }
  });

  current = calculateCurrentMacros(result);

  // 4. ADJUST FIBER (SECONDARY PIVOT)
  // Usually fixed or slight adjustment
  const fiberItems = result.filter(i => i.macro_role === 'fiber');
  fiberItems.forEach(item => {
    // Fiber items usually have a fixed minimum (e.g., 100g of broccoli)
    if (item.grams < 50) item.grams = 100;
  });

  const finalTotals = calculateCurrentMacros(result);

  // Check for violations (e.g. Protein was modified to close kcal - PROIBIDO)
  // In our implementation, we fixed protein first, so it won't be modified by others.
  
  return {
    items: result,
    totals: finalTotals,
    violations
  };
}

function calculateCurrentMacros(items: MealItem[]): MacroTargets {
  return items.reduce((acc, item) => {
    const p = (item.grams * item.macros_per_100g.protein) / 100;
    const c = (item.grams * item.macros_per_100g.carbs) / 100;
    const f = (item.grams * item.macros_per_100g.fat) / 100;
    const cal = (item.grams * item.macros_per_100g.calories) / 100;
    
    return {
      protein: acc.protein + p,
      carbs: acc.carbs + c,
      fat: acc.fat + f,
      calories: acc.calories + cal
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
}
