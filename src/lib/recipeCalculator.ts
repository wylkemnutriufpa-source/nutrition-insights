/**
 * Recipe Calculator Engine — FitJourney
 * Real-time macro calculation + clinical meal slot matching
 */

export interface RecipeIngredient {
  id: string;
  food_id?: string;
  name: string;
  quantity_grams: number;
  unit: string; // "g", "colher_sopa", "xicara", "unidade"
  calories_per_gram: number;
  protein_per_gram: number;
  carbs_per_gram: number;
  fat_per_gram: number;
}

export interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ── Unit conversion to grams ──
const UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  colher_sopa: 15,
  colher_cha: 5,
  colher_sobremesa: 10,
  xicara: 240,
  unidade: 1, // needs per-food override
  fatia: 30,
  copo: 250,
};

export function unitToGrams(quantity: number, unit: string, portionGrams?: number): number {
  if (unit === "unidade" && portionGrams) return quantity * portionGrams;
  return quantity * (UNIT_TO_GRAMS[unit] ?? 1);
}

export function getAvailableUnits(): { value: string; label: string }[] {
  return [
    { value: "g", label: "gramas" },
    { value: "colher_sopa", label: "colher de sopa" },
    { value: "colher_cha", label: "colher de chá" },
    { value: "colher_sobremesa", label: "colher de sobremesa" },
    { value: "xicara", label: "xícara" },
    { value: "unidade", label: "unidade" },
    { value: "fatia", label: "fatia" },
    { value: "copo", label: "copo" },
    { value: "ml", label: "ml" },
  ];
}

/**
 * Calculate total macros for a list of ingredients
 */
export function calculateRecipeMacros(ingredients: RecipeIngredient[]): RecipeMacros {
  return ingredients.reduce(
    (acc, ing) => {
      const grams = unitToGrams(ing.quantity_grams, ing.unit);
      return {
        calories: acc.calories + grams * (ing.calories_per_gram || 0),
        protein: acc.protein + grams * (ing.protein_per_gram || 0),
        carbs: acc.carbs + grams * (ing.carbs_per_gram || 0),
        fat: acc.fat + grams * (ing.fat_per_gram || 0),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculate per-serving macros
 */
export function perServingMacros(total: RecipeMacros, servings: number): RecipeMacros {
  const s = Math.max(1, servings);
  return {
    calories: total.calories / s,
    protein: total.protein / s,
    carbs: total.carbs / s,
    fat: total.fat / s,
  };
}

/**
 * Match recipe to a meal slot — parametric adjustment
 * Returns adjusted ingredient quantities to hit target macros
 */
export function matchRecipeToMealSlot(
  ingredients: RecipeIngredient[],
  targetCalories: number,
  servings: number
): { scaleFactor: number; adjustedIngredients: RecipeIngredient[]; adjustedMacros: RecipeMacros } {
  const currentTotal = calculateRecipeMacros(ingredients);
  const currentPerServing = perServingMacros(currentTotal, servings);

  if (currentPerServing.calories <= 0) {
    return { scaleFactor: 1, adjustedIngredients: ingredients, adjustedMacros: currentPerServing };
  }

  const scaleFactor = targetCalories / currentPerServing.calories;

  const adjustedIngredients = ingredients.map((ing) => ({
    ...ing,
    quantity_grams: Math.round(ing.quantity_grams * scaleFactor * 10) / 10,
  }));

  const adjustedTotal = calculateRecipeMacros(adjustedIngredients);
  const adjustedMacros = perServingMacros(adjustedTotal, servings);

  return { scaleFactor, adjustedIngredients, adjustedMacros };
}

/**
 * Check if recipe macros match target within tolerance (default 5%)
 */
export function macrosMatchTarget(
  recipeMacros: RecipeMacros,
  targetCalories: number,
  targetProtein?: number,
  tolerance = 0.05
): { matches: boolean; caloriesDiff: number; proteinDiff?: number } {
  const calDiff = Math.abs(recipeMacros.calories - targetCalories) / targetCalories;
  const protDiff = targetProtein
    ? Math.abs(recipeMacros.protein - targetProtein) / targetProtein
    : undefined;

  return {
    matches: calDiff <= tolerance && (protDiff === undefined || protDiff <= tolerance),
    caloriesDiff: Math.round((recipeMacros.calories - targetCalories) * 10) / 10,
    proteinDiff: protDiff !== undefined ? Math.round((recipeMacros.protein - (targetProtein || 0)) * 10) / 10 : undefined,
  };
}
