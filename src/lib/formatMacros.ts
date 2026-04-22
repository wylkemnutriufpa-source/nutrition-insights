/**
 * Macros & Nutrition Number Formatting — Defense-in-depth helpers
 *
 * Garante que NENHUM valor numérico exibido em UIs de macros (kcal, proteína,
 * carboidrato, gordura, percentuais) vaze como "NaN", "Infinity", "undefined"
 * ou "null" — independente de bugs em adapters, cálculos ou dados de banco.
 *
 * Use estes helpers como ÚLTIMA camada antes do JSX, mesmo se o valor já
 * tiver passado por `Math.round` upstream — eles são idempotentes.
 *
 * Ver:
 *   - src/pages/DietTemplates.tsx (origem do bug das marmitas fixas)
 *   - src/pages/__tests__/MarmitasFixasMacros.integration.test.tsx
 */

/**
 * Coage qualquer valor para `number` finito. Trata `null`, `undefined`,
 * strings, `NaN`, `Infinity` e `-Infinity` como `0`.
 *
 * Use em CÁLCULOS (multiplicação, divisão, soma) onde um operando inválido
 * propagaria `NaN`/`Infinity`. Sempre retorna número seguro para aritmética.
 */
export function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formata um valor numérico para exibição no DOM, retornando sempre uma
 * string segura (inteiro arredondado). Inválidos (`NaN`, `Infinity`, etc.)
 * caem para o fallback (default `"0"`).
 *
 * Use em JSX como última barreira: `<span>{fmtMacro(v)}kcal</span>`.
 */
export function fmtMacro(v: unknown, fallback: string = "0"): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return String(Math.round(n));
}

/**
 * Variante decimal: preserva uma casa decimal (útil p/ macros granulares
 * como `protein_per_gram * qty` no editor visual). Inválidos → fallback.
 */
export function fmtMacroDecimal(v: unknown, decimals: number = 1, fallback: string = "0"): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const factor = 10 ** decimals;
  return String(Math.round(n * factor) / factor);
}

/**
 * Calcula um multiplicador de escala (alvo/base) protegendo divisão por
 * zero e operandos inválidos. Retorna `1` (sem ajuste) quando degenerado.
 *
 * Caso real: template com `base_calories = 0` causava `NaN`/`Infinity`
 * que vazava para a UI como "NaNkcal".
 */
export function safeMultiplier(target: unknown, base: unknown, fallback: number = 1): number {
  const t = safeNum(target);
  const b = safeNum(base);
  if (b <= 0) return fallback;
  const m = t / b;
  return Number.isFinite(m) ? m : fallback;
}

/**
 * Checks if macros (P, C, F) match total calories within a tolerance.
 * Returns true if the difference is more than the tolerance.
 */
export function isMacroInconsistent(calories: number, p: number, c: number, f: number, tolerance = 0.05): boolean {
  const cal = safeNum(calories);
  if (cal === 0) return false;
  const calculated = (safeNum(p) * 4) + (safeNum(c) * 4) + (safeNum(f) * 9);
  return Math.abs(calculated - cal) > (cal * tolerance);
}

/**
 * Checks if calories are likely clamped (e.g., exactly 1200 or 1500)
 * which might indicate a system limit was hit.
 */
export function isCalorieClamped(calories: number): boolean {
  const c = safeNum(calories);
  return c === 1200; // Common lower bound in our system
}

