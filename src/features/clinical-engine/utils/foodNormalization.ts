import { Food, MealItem } from "../types/clinical-types";

/**
 * Normalizes food units and measurements.
 * Implementation of FitJourney V3 - Step 1 & 2
 */
export const normalizeFoodMeasurement = (item: MealItem | Food): { 
  displayUnit: string; 
  displayQuantity: number;
  normalizedGrams: number;
} => {
  const name = item.name.toLowerCase();
  let grams = (item as MealItem).quantity || (item as Food).portionValue || 100;
  
  // Basic unit mapping
  if (name.includes('pão') || name.includes('fatia')) {
    // Standard slice is approx 25g
    const sliceWeight = 25;
    const slices = Math.round(grams / sliceWeight);
    return {
      displayUnit: slices === 1 ? 'fatia' : 'fatias',
      displayQuantity: slices || 1,
      normalizedGrams: (slices || 1) * sliceWeight
    };
  }

  if (name.includes('ovo') || name.includes('unidade')) {
    // Standard egg is approx 50g
    const eggWeight = 50;
    const units = Math.round(grams / eggWeight);
    return {
      displayUnit: units === 1 ? 'unidade' : 'unidades',
      displayQuantity: units || 1,
      normalizedGrams: (units || 1) * eggWeight
    };
  }

  if (name.includes('queijo')) {
    // Standard slice is approx 15g
    const sliceWeight = 15;
    const slices = Math.round(grams / sliceWeight);
    return {
      displayUnit: slices === 1 ? 'fatia' : 'fatias',
      displayQuantity: slices || 1,
      normalizedGrams: (slices || 1) * sliceWeight
    };
  }

  // Default to grams for everything else (rice, beans, etc.)
  return {
    displayUnit: 'g',
    displayQuantity: grams,
    normalizedGrams: grams
  };
};

/**
 * Recalculates nutritional macros based on a base (usually per 100g)
 * Implementation of FitJourney V3 - Step 3
 */
export const recalculateMacros = (item: Food, quantityGrams: number) => {
  // We assume the values in the database are per 100g if not specified, 
  // or we use the portionValue if available.
  const baseGrams = item.portionValue || 100;
  const ratio = quantityGrams / baseGrams;

  return {
    calories: Math.round(item.calories * ratio),
    protein: Number((item.protein * ratio).toFixed(1)),
    carbs: Number((item.carbs * ratio).toFixed(1)),
    fat: Number((item.fat * ratio).toFixed(1))
  };
};

/**
 * Applies clinical minimums and corrections
 * Implementation of FitJourney V3 - Step 2 & 4
 */
export const applyClinicalSafety = (foodName: string, grams: number): number => {
  const name = foodName.toLowerCase();
  
  // Cheese minimum 15g (approx 1 slice)
  if (name.includes('queijo') && grams < 10) {
    return 15;
  }

  // Protein source minimums
  if ((name.includes('frango') || name.includes('carne') || name.includes('peixe')) && grams < 50) {
    return 80; // Standard minimum portion for main protein
  }

  return grams;
};
