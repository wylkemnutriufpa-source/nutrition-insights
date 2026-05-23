/**
 * 🔬 NOS CALC ENGINE — FitJourney 2.0
 *
 * Engine de cálculo nutricional PURO.
 *
 * INVARIANTES ABSOLUTOS:
 * ✅ Funções puras — sem side effects
 * ✅ Sem imports de Supabase, hooks, ou componentes
 * ✅ Sem acesso a estado React
 * ✅ Base SEMPRE por 100g (factor = qty_g / 100)
 * ✅ Usado SOMENTE na camada de autoria (Editor V3)
 *
 * PROIBIDO IMPORTAR EM:
 * ❌ src/pages/PatientMealPlan.tsx
 * ❌ src/components/patient/*
 * ❌ extractMealsFromSnapshot.ts
 * ❌ qualquer arquivo do Patient App
 *
 * O snapshot publicado é FECHADO.
 * Cálculo existe SOMENTE durante a autoria.
 */

// ── Tipos base do engine ──────────────────────────────────────────────

export interface NOSMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
}

export interface NOSFoodBase {
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g?: number;
  sodium_100g?: number;
}

export interface NOSIngredient extends NOSFoodBase {
  food_id: string;
  food_name: string;
  qty_g: number;
}

export interface NOSMealItem extends NOSFoodBase {
  id: string;
  name: string;
  qty_g: number;
  is_primary?: boolean;
}

// ── Funções de cálculo ────────────────────────────────────────────────

/**
 * Calcula macros de um alimento para uma gramagem específica.
 * Base: sempre por 100g.
 */
export function calcMacros(food: NOSFoodBase, qty_g: number): NOSMacros {
  if (qty_g <= 0) {
    return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 };
  }
  const factor = qty_g / 100;
  return {
    kcal:       round2(food.kcal_100g     * factor),
    protein_g:  round2(food.protein_100g  * factor),
    carbs_g:    round2(food.carbs_100g    * factor),
    fat_g:      round2(food.fat_100g      * factor),
    fiber_g:    round2((food.fiber_100g   ?? 0) * factor),
    sodium_mg:  round2((food.sodium_100g  ?? 0) * factor),
  };
}

/**
 * Calcula macros totais de uma receita a partir dos ingredientes.
 * Retorna os macros para o rendimento total (yield_g).
 * Para macros por porção, use calcRecipePerPortion().
 */
export function calcRecipeTotals(ingredients: NOSIngredient[]): NOSMacros {
  return sumMacros(ingredients.map(ing => calcMacros(ing, ing.qty_g)));
}

/**
 * Calcula macros por porção de uma receita.
 */
export function calcRecipePerPortion(
  ingredients: NOSIngredient[],
  yield_g: number,
  portion_g: number,
): NOSMacros {
  if (yield_g <= 0 || portion_g <= 0) {
    return zeroMacros();
  }
  const totals = calcRecipeTotals(ingredients);
  const portionFactor = portion_g / yield_g;
  return scaleMacros(totals, portionFactor);
}

/**
 * Calcula totais de uma refeição (soma dos itens primários).
 */
export function calcMealTotals(items: NOSMealItem[]): NOSMacros {
  const primaries = items.filter(i => i.is_primary !== false);
  return sumMacros(primaries.map(item => calcMacros(item, item.qty_g)));
}

/**
 * Calcula totais do dia (soma de todas as refeições).
 */
export function calcDayTotals(meals: { items: NOSMealItem[] }[]): NOSMacros {
  return sumMacros(meals.map(m => calcMealTotals(m.items)));
}

/**
 * Calcula a gramagem necessária para atingir um alvo de macro.
 * Útil para "quero 30g de proteína de frango, quantos gramas?".
 */
export function calcQtyForMacroTarget(
  food: NOSFoodBase,
  targetValue: number,
  macro: keyof Pick<NOSMacros, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>,
): number {
  const macroKey = macro === 'kcal' ? 'kcal_100g'
    : macro === 'protein_g' ? 'protein_100g'
    : macro === 'carbs_g' ? 'carbs_100g'
    : 'fat_100g';

  const valuePer100g = food[macroKey as keyof NOSFoodBase] as number;
  if (!valuePer100g || valuePer100g <= 0) return 100;

  const rawQty = (targetValue / valuePer100g) * 100;
  return Math.max(5, Math.round(rawQty / 5) * 5); // arredonda para múltiplo de 5g
}

/**
 * Calcula a densidade energética (kcal/g).
 */
export function calcEnergyDensity(food: NOSFoodBase): number {
  return round2(food.kcal_100g / 100);
}

/**
 * Escala substituição proporcionalmente para equivalência calórica.
 * "Quero substituir frango (X kcal) por tilápia — quantos gramas?"
 */
export function calcEquivalentSubstitution(
  primaryKcal: number,
  substituteFood: NOSFoodBase,
): number {
  if (!substituteFood.kcal_100g || substituteFood.kcal_100g <= 0) return 100;
  const rawQty = (primaryKcal / substituteFood.kcal_100g) * 100;
  return Math.max(10, Math.round(rawQty / 5) * 5);
}

// ── Helpers internos ──────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function zeroMacros(): NOSMacros {
  return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 };
}

function sumMacros(macrosList: NOSMacros[]): NOSMacros {
  return macrosList.reduce((acc, m) => ({
    kcal:       round2(acc.kcal      + m.kcal),
    protein_g:  round2(acc.protein_g + m.protein_g),
    carbs_g:    round2(acc.carbs_g   + m.carbs_g),
    fat_g:      round2(acc.fat_g     + m.fat_g),
    fiber_g:    round2(acc.fiber_g   + m.fiber_g),
    sodium_mg:  round2(acc.sodium_mg + m.sodium_mg),
  }), zeroMacros());
}

function scaleMacros(macros: NOSMacros, factor: number): NOSMacros {
  return {
    kcal:       round2(macros.kcal      * factor),
    protein_g:  round2(macros.protein_g * factor),
    carbs_g:    round2(macros.carbs_g   * factor),
    fat_g:      round2(macros.fat_g     * factor),
    fiber_g:    round2(macros.fiber_g   * factor),
    sodium_mg:  round2(macros.sodium_mg * factor),
  };
}
