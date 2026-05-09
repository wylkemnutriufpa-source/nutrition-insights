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
  
  // Se já temos uma unidade de exibição definida no item (V3), usamos ela
  if ((item as MealItem).portionUnitLabel) {
    const label = (item as MealItem).portionUnitLabel!;
    if (label.includes('Unid.') || label.includes('unid')) {
      // Para unidades P, M, G, calculamos quantas "unidades" isso representa
      // Mas geralmente no V3 o usuário quer ver "1 Unid. P"
      return {
        displayUnit: label,
        displayQuantity: 1,
        normalizedGrams: grams
      };
    }
    if (label.includes('colher')) {
      const units = Math.round(grams / 15);
      return {
        displayUnit: label,
        displayQuantity: units || 1,
        normalizedGrams: grams
      };
    }
  }

  // Basic unit mapping (Fallback)
  if (name.includes('arroz')) {
    const spoonWeight = 25;
    const units = Math.round(grams / spoonWeight);
    return {
      displayUnit: units <= 1 ? 'colher de sopa' : 'colheres de sopa',
      displayQuantity: units || 1,
      normalizedGrams: grams
    };
  }

  if (name.includes('feijão')) {
    const spoonWeight = 30;
    const units = Math.round(grams / spoonWeight);
    return {
      displayUnit: units <= 1 ? 'colher de sopa' : 'colheres de sopa',
      displayQuantity: units || 1,
      normalizedGrams: grams
    };
  }

  if (name.includes('frango') || name.includes('carne') || name.includes('peixe')) {
    // Para carnes, se for por volta de 100g, podemos chamar de "filé" ou "pedaço"
    // Mas geralmente o usuário prefere apenas gramas se não houver unidade clara
    // Por enquanto mantemos gramas para carnes a menos que venha do V3 com unidade
  }

  if (name.includes('pão') || name.includes('fatia')) {
    const sliceWeight = 25;
    const slices = Math.round(grams / sliceWeight);
    return {
      displayUnit: slices === 1 ? 'fatia' : 'fatias',
      displayQuantity: slices || 1,
      normalizedGrams: (slices || 1) * sliceWeight
    };
  }

  if (name.includes('ovo') || name.includes('unidade')) {
    const eggWeight = 50;
    const units = Math.round(grams / eggWeight);
    return {
      displayUnit: units === 1 ? 'unidade' : 'unidades',
      displayQuantity: units || 1,
      normalizedGrams: (units || 1) * eggWeight
    };
  }

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
