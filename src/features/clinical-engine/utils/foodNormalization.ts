import { Food, MealItem } from "../types/clinical-types";

/**
 * Normalizes food units and measurements.
 * Implementation of FitJourney V3 - Step 1 & 2
 * 
 * SOBERANIA CLÍNICA: Esta função NÃO deve mais "adivinhar" unidades baseada no nome.
 * Se não houver unidade explícita, retorna gramas.
 */
export const normalizeFoodMeasurement = (item: MealItem | Food): { 
  displayUnit: string; 
  displayQuantity: number;
  normalizedGrams: number;
} => {
  // 1. Prioridade absoluta: clinical_mass_g se disponível
  const grams = (item as MealItem).clinical_mass_g ?? (item as MealItem).quantity ?? (item as Food).portionValue ?? 0;
  
  if (grams <= 0) {
    console.warn(`[V3-NORMALIZER] Item com massa inválida: ${item.name}`, item);
    // Não inventamos massa. Retornamos o que temos ou falhamos.
  }

  // 2. Se já temos uma unidade de exibição definida no item (V3), usamos ela
  if ((item as MealItem).portionUnitLabel) {
    const label = (item as MealItem).portionUnitLabel!;
    
    // Se for Unidade (P/M/G), assumimos que a quantity já representa o número de unidades
    if (label.toLowerCase().includes('unid')) {
      return {
        displayUnit: label,
        displayQuantity: (item as MealItem).quantity || 1,
        normalizedGrams: grams
      };
    }

    // Se for colher, mantemos a unidade, mas a quantidade de exibição deve ser calculada 
    // SE e SOMENTE SE tivermos o portionValue (fator de conversão)
    if (label.toLowerCase().includes('colher') && item.portionValue > 0) {
      const units = grams / item.portionValue;
      return {
        displayUnit: label,
        displayQuantity: Number(units.toFixed(1)),
        normalizedGrams: grams
      };
    }

    // Caso contrário, usamos a unidade do label com a quantidade original
    return {
      displayUnit: label,
      displayQuantity: (item as MealItem).quantity || 1,
      normalizedGrams: grams
    };
  }

  // 3. Fallback Passivo (Sem adivinhação por nome)
  return {
    displayUnit: item.portionUnitLabel || 'g',
    displayQuantity: (item as MealItem).quantity || grams,
    normalizedGrams: grams
  };
};

/**
 * Recalculates nutritional macros based on a base (usually per 100g)
 * Implementation of FitJourney V3 - Step 3
 */
export const recalculateMacros = (item: Food, quantityGrams: number) => {
  // 🛡️ SOBERANIA CLÍNICA: Falhar explicitamente se dados nutricionais base faltarem
  if (!item.kcal && !item.calories && !item.protein && !item.carbs && !item.fat) {
     console.error('[V3-MOTOR] Food without nutrition data:', item.name);
     return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const baseGrams = item.portionValue || 100;
  const ratio = quantityGrams / baseGrams;

  return {
    calories: Math.round((item.kcal || item.calories || 0) * ratio),
    protein: Number(((item.protein || 0) * ratio).toFixed(1)),
    carbs: Number(((item.carbs || 0) * ratio).toFixed(1)),
    fat: Number(((item.fat || 0) * ratio).toFixed(1))
  };
};

/**
 * Applies clinical minimums and corrections
 * 🛑 REMOVIDO: O sistema não deve mais "corrigir" gramagens arbitrariamente.
 */
export const applyClinicalSafety = (foodName: string, grams: number): number => {
  // Apenas garantimos que não seja negativo
  return Math.max(0, grams);
};
