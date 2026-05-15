
import { Food, MealItem } from '@/features/editor-v3/types/types';

/**
 * Calculates macros for a food item based on quantity.
 * If kcal_100g exists (V3 standard), use it. Fallback to base props.
 */
export function calculateItemMacros(item: any, quantity: number = 100) {
  const factor = quantity / 100;
  
  const baseKcal = item.kcal_100g ?? item.kcal ?? item.calories ?? 0;
  const baseProtein = item.protein_100g ?? item.protein ?? item.protein_g ?? 0;
  const baseCarbs = item.carb_100g ?? item.carbs ?? item.carbs_g ?? 0;
  const baseFat = item.fat_100g ?? item.fat ?? item.fat_g ?? 0;

  return {
    kcal: baseKcal * factor,
    protein: baseProtein * factor,
    carbs: baseCarbs * factor,
    fat: baseFat * factor,
  };
}

/**
 * Adjusts substitution quantities proportionally when the main item quantity changes.
 */
export function adjustSubstitutionsProportionally(
  mainItem: MealItem, 
  oldQuantity: number, 
  newQuantity: number
): Food[] {
  if (!mainItem.substitutions || mainItem.substitutions.length === 0) return [];
  if (oldQuantity === 0) return mainItem.substitutions;

  const ratio = newQuantity / oldQuantity;

  return mainItem.substitutions.map(sub => {
    // Substitutions in MealItem might not have clinical_mass_g, but Food has portionValue
    const currentQty = (sub as any).clinical_mass_g || sub.portionValue || 100;
    const newQty = Math.round(currentQty * ratio);
    
    return {
      ...sub,
      portionValue: newQty, // Update for UI
      clinical_mass_g: newQty, // Update for math
    };
  });
}
