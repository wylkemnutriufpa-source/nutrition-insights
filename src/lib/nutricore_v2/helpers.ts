
import { Food, MealItem } from '@/features/editor-v3/types/types';

/**
 * Calculates macros for a food item based on quantity.
 * If kcal_100g exists (V3 standard), use it. Fallback to base props.
 */
export function calculateItemMacros(item: any, quantity: number = 100) {
  const factor = quantity / 100;
  
  const baseKcal = Number(item.kcal_100g ?? item.kcal ?? item.calories ?? item.kcal_base ?? 0);
  const baseProtein = Number(item.protein_100g ?? item.protein ?? item.protein_g ?? item.protein_base ?? 0);
  const baseCarbs = Number(item.carb_100g ?? item.carbs ?? item.carbs_g ?? item.carbs_base ?? 0);
  const baseFat = Number(item.fat_100g ?? item.fat ?? item.fat_g ?? item.fats_base ?? 0);

  return {
    kcal: baseKcal * factor,
    protein: baseProtein * factor,
    carbs: baseCarbs * factor,
    fat: baseFat * factor,
  };
}

/**
 * Scales an item to reach a target macro (usually kcal or protein).
 */
export function scaleItemToTarget(item: any, targetValue: number, macroType: 'kcal' | 'protein' | 'carbs' | 'fat' = 'kcal') {
  const currentMacros = calculateItemMacros(item, item.quantity || 100);
  const currentValue = currentMacros[macroType];
  
  if (currentValue === 0) return item.quantity || 100;
  
  const ratio = targetValue / currentValue;
  const rawQuantity = (item.quantity || 100) * ratio;
  // SOBERANIA V3: Mínimo de 5g para evitar frações irrelevantes (ex: 3g de ovo)
  const newQuantity = Math.max(5, Math.round(rawQuantity / 5) * 5);

  
  return newQuantity;
}

/**
 * Adjusts substitution quantities proportionally when the main item quantity changes.
 */
export function adjustSubstitutionsProportionally(
  substitutions: Food[], 
  oldQuantity: number, 
  newQuantity: number
): Food[] {
  if (!substitutions || substitutions.length === 0) return [];
  if (oldQuantity === 0) return substitutions;

  const ratio = newQuantity / oldQuantity;

  return substitutions.map(sub => {
    const currentQty = (sub as any).clinical_mass_g || sub.portionValue || 100;
    const rawQty = currentQty * ratio;
    const newQty = Math.max(5, Math.round(rawQty / 5) * 5);

    
    return {
      ...sub,
      portionValue: newQty,
      clinical_mass_g: newQty,
      ...calculateItemMacros(sub, newQty)
    };
  });
}

