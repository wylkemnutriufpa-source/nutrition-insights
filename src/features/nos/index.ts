/**
 * 🔬 NOS — Nutrition Operating System
 *
 * Ponto de entrada do módulo NOS.
 * SOMENTE importar em código do Editor V3.
 * PROIBIDO importar no Patient App.
 */

// Engine puro (sem side effects, sem Supabase)
export {
  calcMacros,
  calcRecipeTotals,
  calcRecipePerPortion,
  calcMealTotals,
  calcDayTotals,
  calcQtyForMacroTarget,
  calcEnergyDensity,
  calcEquivalentSubstitution,
  type NOSMacros,
  type NOSFoodBase,
  type NOSIngredient,
  type NOSMealItem,
} from './engine/calcEngine';

// Hooks de busca (usam Supabase, somente no Editor)
export {
  useNOSFoodSearch,
  useNOSFoodById,
  type NOSFoodResult,
} from './hooks/useNOSFoodSearch';
