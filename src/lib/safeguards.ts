/**
 * FitJourney — Self-Healing Data Safeguards
 * 
 * Camada de autocorreção que sanitiza dados antes de renderizar.
 * Previne crashes como .toFixed(), .map(), .length em dados inválidos.
 * 
 * REGRA: Toda página/componente que recebe dados externos (DB, API, props)
 * DEVE usar estas funções para sanitizar antes de operar.
 */

// ========== Primitivos seguros ==========

/** Garante retorno numérico — nunca NaN/null/undefined */
export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Garante retorno string — nunca null/undefined/number */
export function safeString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  return String(value);
}

/** Garante retorno array — nunca null/undefined/object */
export function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  return fallback;
}

/** Garante retorno boolean */
export function safeBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return fallback;
}

/** Garante retorno de objeto — nunca null/array/string */
export function safeObject<T extends Record<string, unknown>>(
  value: unknown,
  fallback: T = {} as T
): T {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  return fallback;
}

/** Garante retorno de data válida */
export function safeDate(value: unknown, fallback?: Date): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback ?? null;
}

// ========== Operações numéricas seguras ==========

/** .toFixed() seguro — nunca falha */
export function safeFixed(value: unknown, digits = 1): string {
  return safeNumber(value).toFixed(digits);
}

/** Porcentagem segura 0-100 */
export function safePercent(value: unknown, digits = 0): string {
  const n = Math.min(100, Math.max(0, safeNumber(value)));
  return n.toFixed(digits) + "%";
}

/** Divisão segura — nunca divide por zero */
export function safeDivide(numerator: unknown, denominator: unknown, fallback = 0): number {
  const n = safeNumber(numerator);
  const d = safeNumber(denominator);
  if (d === 0) return fallback;
  return n / d;
}

// ========== Operações de coleção seguras ==========

/** .map() seguro — nunca falha em null/undefined */
export function safeMap<T, R>(value: unknown, fn: (item: T, index: number) => R): R[] {
  return safeArray<T>(value).map(fn);
}

/** .filter() seguro */
export function safeFilter<T>(value: unknown, fn: (item: T) => boolean): T[] {
  return safeArray<T>(value).filter(fn);
}

/** .length seguro */
export function safeLength(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "string") return value.length;
  return 0;
}

// ========== JSON seguro ==========

/** JSON.parse seguro — nunca lança exceção */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ========== Accessor seguro para objetos aninhados ==========

/** Acessa propriedade aninhada sem risco de crash */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  try {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return fallback;
      current = (current as Record<string, unknown>)[key];
    }
    return (current as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// ========== Sanitização de registros do banco ==========

/** Sanitiza um registro inteiro do banco, garantindo que campos numéricos sejam números, etc. */
export function sanitizeRecord<T extends Record<string, unknown>>(
  record: unknown,
  schema: Record<string, "number" | "string" | "boolean" | "array" | "object">
): T {
  const obj = safeObject(record);
  const result: Record<string, unknown> = { ...obj };

  for (const [key, type] of Object.entries(schema)) {
    switch (type) {
      case "number":
        result[key] = safeNumber(obj[key]);
        break;
      case "string":
        result[key] = safeString(obj[key]);
        break;
      case "boolean":
        result[key] = safeBool(obj[key]);
        break;
      case "array":
        result[key] = safeArray(obj[key]);
        break;
      case "object":
        result[key] = safeObject(obj[key]);
        break;
    }
  }

  return result as T;
}
