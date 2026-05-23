import { assertNotLegacyCode } from "../sovereign/invariantAssertions";

/**
 * 🛡️ ANTI-LEGADO: normalizeMealPlan
 * 
 * Este arquivo é um stub que APENAS retorna o plano se ele for V3.
 * Se houver tentativa de normalização real, explode.
 */
export function normalizeMealPlan<T>(plan: T): T {
  assertNotLegacyCode('normalizeMealPlan', 'mealPlanNormalizer');
  return plan;
}

