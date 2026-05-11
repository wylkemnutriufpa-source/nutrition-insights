/**
 * 🛡️ MACRO SAFETY GUARDRAILS
 * 
 * Trinchera única contra "loops de multiplicação" em qualquer motor de plano.
 * - Clamp absoluto por item
 * - Clamp absoluto por dia
 * - Abort se valores explodem (corrupção)
 * 
 * NUNCA REMOVER. NUNCA RELAXAR sem aprovação clínica.
 */

export const MACRO_SAFETY_LIMITS = {
  /** kcal máxima por item individual de refeição */
  MAX_KCAL_PER_ITEM: 2000,
  /** kcal máxima por dia (qualquer plano acima disso é corrupção) */
  MAX_KCAL_PER_DAY: 5000,
  /** kcal acima disso = abort imediato (sinal de loop multiplicativo) */
  ABORT_KCAL_THRESHOLD: 10000,
  /** gramas máximas por item individual */
  MAX_GRAMS_PER_ITEM: 2000,
  /** fator de escala máximo numa única passada */
  MAX_SCALE_FACTOR: 2.5,
  /** fator de escala mínimo numa única passada */
  MIN_SCALE_FACTOR: 0.4,
} as const;

/**
 * Aborta a operação se o valor for astronômico (corrupção detectada).
 */
export function assertSafeMacro(value: number, label: string): void {
  if (!Number.isFinite(value) || value > MACRO_SAFETY_LIMITS.ABORT_KCAL_THRESHOLD) {
    const msg = `[MACRO_SAFETY] CORRUPÇÃO DETECTADA: ${label}=${value}. Operação abortada para proteger o paciente.`;
    console.error(msg);
    throw new Error(msg);
  }
}

/**
 * Clamp seguro para fatores de escala (impede multiplicação fora de controle).
 */
export function clampScaleFactor(factor: number): number {
  if (!Number.isFinite(factor) || factor <= 0) return 1;
  return Math.max(
    MACRO_SAFETY_LIMITS.MIN_SCALE_FACTOR,
    Math.min(MACRO_SAFETY_LIMITS.MAX_SCALE_FACTOR, factor)
  );
}

/**
 * Clamp absoluto de calorias por item.
 */
export function clampItemKcal(kcal: number): number {
  if (!Number.isFinite(kcal) || kcal < 0) return 0;
  return Math.min(MACRO_SAFETY_LIMITS.MAX_KCAL_PER_ITEM, kcal);
}

/**
 * Clamp absoluto de gramas por item.
 */
export function clampItemGrams(grams: number): number {
  if (!Number.isFinite(grams) || grams < 0) return 0;
  return Math.min(MACRO_SAFETY_LIMITS.MAX_GRAMS_PER_ITEM, grams);
}
