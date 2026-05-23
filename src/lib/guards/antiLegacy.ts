/**
 * 🛡️ ANTI-LEGADO DETECTOR — FitJourney 2.0
 */

import { assertNotLegacyCode } from "../sovereign/invariantAssertions";

/**
 * Hook global para detectar uso de lógica proibida em runtime.
 * Deve ser chamado no início de funções que estão em processo de depreciação.
 */
export function useAntiLegacyGuard(symbolName: string, context: string) {
  assertNotLegacyCode(symbolName, context);
}

// Exemplos de funções que devem ser guardadas:
// - normalizeMealPlan
// - calculatePrimaryTotals
// - getBestMealImage
// - clinicalHumanEngine
// - hydrationEngine
// - runtimeInference
