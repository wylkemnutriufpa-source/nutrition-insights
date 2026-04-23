/**
 * Macros & Nutrition Number Formatting — Defense-in-depth helpers
 *
 * Garante que NENHUM valor numérico exibido em UIs de macros (kcal, proteína,
 * carboidrato, gordura, percentuais) vaze como "NaN", "Infinity", "undefined"
 * ou "null" — independente de bugs em adapters, cálculos ou dados de banco.
 *
 * Use estes helpers como ÚLTIMA camada antes do JSX, mesmo se o valor já
 * tiver passado por `Math.round` upstream — eles são idempotentes.
 */
import { CALORIC_DEFICIT_LIMITS } from "./clinicalConstitution";

/**
 * Coage qualquer valor para `number` finito. Trata `null`, `undefined`,
 * strings, `NaN`, `Infinity` e `-Infinity` como `0`.
 */
export function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formata um valor numérico para exibição no DOM, retornando sempre uma
 * string segura (inteiro arredondado).
 */
export function fmtMacro(v: unknown, fallback: string = "0"): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return String(Math.round(n));
}

/**
 * Variante decimal: preserva uma casa decimal.
 */
export function fmtMacroDecimal(v: unknown, decimals: number = 1, fallback: string = "0"): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const factor = 10 ** decimals;
  return String(Math.round(n * factor) / factor);
}

/**
 * Calcula um multiplicador de escala (alvo/base) protegendo divisão por zero.
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
 * Checks if calories are clamped by system safety bounds.
 */
export function isCalorieClamped(calories: number, sex: "male" | "female" = "female"): boolean {
  const c = Math.round(safeNum(calories));
  const min = sex === "male" ? CALORIC_DEFICIT_LIMITS.MIN_CALORIES_MALE : CALORIC_DEFICIT_LIMITS.MIN_CALORIES_FEMALE;
  const max = 4500; // Estabilizado no clinicalMacroEngine
  return c === min || c === max;
}

/**
 * Returns the exact clamp threshold hit, if any.
 */
export function getCalorieClampValue(calories: number, sex: "male" | "female" = "female"): number | null {
  const c = Math.round(safeNum(calories));
  const min = sex === "male" ? CALORIC_DEFICIT_LIMITS.MIN_CALORIES_MALE : CALORIC_DEFICIT_LIMITS.MIN_CALORIES_FEMALE;
  const max = 4500;
  if (c === min) return min;
  if (c === max) return max;
  return null;
}

/**
 * Checks if a meal plan item has a suspicious portion alert.
 */
export function getPortionWarning(item: any): string | null {
  if (!item) return null;
  
  // 1. Check metadata from edge function
  const alert = item.metadata?.portion_alert || item.edit_metadata?.portion_alert;
  if (alert) return alert;

  // 2. Client-side heuristic if metadata is missing
  const description = item.description || "";
  if (description.includes("⚠️")) {
    const match = description.match(/⚠️\s*(.+)$/m);
    return match ? match[1] : "Aviso de porção";
  }

  return null;
}

