/**
 * Onda 2A — Comparador PASSIVO Snapshot vs. Render Legado
 * ─────────────────────────────────────────────────────────
 * Compara, SEM ALTERAR NADA, a estrutura que o pipeline legado do PDF está
 * prestes a renderizar contra o snapshot determinístico persistido.
 *
 * Saída: relatório textual + array de divergências com severidade.
 * Logs vão para `console` com prefixo "[snapshot-compare]".
 *
 * PROIBIÇÕES:
 *  - Não recalcula macros.
 *  - Não reagrupa.
 *  - Não reordena.
 *  - Não altera o payload do PDF.
 *  - Não toca no schema do snapshot.
 */

import type { MealPlanSnapshotV1, SnapshotItem } from "./types";

// Tipo "frouxo" (estrutural) do item do PDF legado, para evitar acoplamento
// com `PremiumMealPlanPDFData` neste módulo passivo.
export interface LegacyPdfItemLike {
  mealType?: string | null;
  title?: string | null;
  description?: string | null;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  day_of_week?: number | null;
  is_primary?: boolean | null;
  substitution_group_id?: string | null;
}

export type Severity = "info" | "warn" | "error";

export interface SnapshotDivergence {
  code: string;
  severity: Severity;
  message: string;
  context?: Record<string, unknown>;
}

export interface SnapshotCompareReport {
  planId: string;
  schemaVersion: string;
  engineVersion: string | null;
  snapshotHash: string | null;
  totals: {
    snapshotDays: number;
    legacyDays: number;
    snapshotPrimaryItems: number;
    legacyPrimaryItems: number;
    snapshotSubstitutions: number;
    legacySubstitutions: number;
  };
  divergences: SnapshotDivergence[];
  ok: boolean;
}

function normalizeMealType(t: unknown): string {
  return String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function countSnapshotItems(snapshot: MealPlanSnapshotV1) {
  let primary = 0;
  let subs = 0;
  for (const day of snapshot.days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        if (item.is_primary) primary++;
        else primary++; // snapshot lista todos como itens; substituições vão dentro de `item.substitutions`
        subs += Array.isArray(item.substitutions) ? item.substitutions.length : 0;
      }
    }
  }
  return { primary, subs };
}

function countLegacyItems(items: LegacyPdfItemLike[]) {
  let primary = 0;
  let subs = 0;
  for (const it of items) {
    if (it.is_primary === false) subs++;
    else primary++;
  }
  return { primary, subs };
}

function snapshotMealTypesByDay(snapshot: MealPlanSnapshotV1): Map<number, string[]> {
  const m = new Map<number, string[]>();
  for (const day of snapshot.days) {
    m.set(
      day.day_of_week,
      day.meals.map((meal) => normalizeMealType(meal.meal_type)),
    );
  }
  return m;
}

function legacyMealTypesByDay(items: LegacyPdfItemLike[]): Map<number, string[]> {
  const byDay = new Map<number, LegacyPdfItemLike[]>();
  for (const it of items) {
    const d = it.day_of_week ?? -1;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(it);
  }
  const result = new Map<number, string[]>();
  for (const [day, list] of byDay) {
    // Preserva ordem de aparição do payload legado e remove duplicatas consecutivas
    const seen: string[] = [];
    for (const it of list) {
      const t = normalizeMealType(it.mealType);
      if (seen[seen.length - 1] !== t) seen.push(t);
    }
    result.set(day, seen);
  }
  return result;
}

export function compareSnapshotVsRender(
  snapshot: MealPlanSnapshotV1,
  legacyItems: LegacyPdfItemLike[],
  meta: { planId: string; engineVersion?: string | null; snapshotHash?: string | null },
): SnapshotCompareReport {
  const divergences: SnapshotDivergence[] = [];

  const snapDays = snapshot.days.length;
  const legacyDayKeys = new Set(legacyItems.map((i) => i.day_of_week ?? -1));
  const legacyDayCount = legacyDayKeys.size;

  if (snapDays !== legacyDayCount) {
    divergences.push({
      code: "DAY_COUNT_MISMATCH",
      severity: "warn",
      message: `Snapshot tem ${snapDays} dia(s); render legado tem ${legacyDayCount}.`,
      context: { snapDays, legacyDayCount },
    });
  }

  const snapItems = countSnapshotItems(snapshot);
  const legacyItemsCount = countLegacyItems(legacyItems);

  if (snapItems.primary !== legacyItemsCount.primary) {
    divergences.push({
      code: "PRIMARY_ITEMS_COUNT_MISMATCH",
      severity: "warn",
      message: `Itens primários — snapshot: ${snapItems.primary}, legado: ${legacyItemsCount.primary}.`,
      context: snapItems,
    });
  }

  if (snapItems.subs !== legacyItemsCount.subs) {
    divergences.push({
      code: "SUBSTITUTIONS_COUNT_MISMATCH",
      severity: "info",
      message: `Substituições — snapshot: ${snapItems.subs}, legado: ${legacyItemsCount.subs}.`,
      context: snapItems,
    });
  }

  // Ordem por dia
  const snapByDay = snapshotMealTypesByDay(snapshot);
  const legByDay = legacyMealTypesByDay(legacyItems);

  for (const [day, snapTypes] of snapByDay) {
    const legTypes = legByDay.get(day);
    if (!legTypes) {
      divergences.push({
        code: "DAY_MISSING_IN_LEGACY",
        severity: "warn",
        message: `Dia ${day} existe no snapshot mas não no render legado.`,
        context: { day, snapTypes },
      });
      continue;
    }
    if (snapTypes.length !== legTypes.length) {
      divergences.push({
        code: "MEAL_COUNT_MISMATCH",
        severity: "warn",
        message: `Dia ${day}: snapshot tem ${snapTypes.length} refeição(ões); legado tem ${legTypes.length}.`,
        context: { day, snapTypes, legTypes },
      });
    }
    const minLen = Math.min(snapTypes.length, legTypes.length);
    for (let i = 0; i < minLen; i++) {
      if (snapTypes[i] !== legTypes[i]) {
        divergences.push({
          code: "MEAL_ORDER_MISMATCH",
          severity: "warn",
          message: `Dia ${day} pos ${i}: snapshot="${snapTypes[i]}" vs legado="${legTypes[i]}".`,
          context: { day, position: i, snap: snapTypes[i], legacy: legTypes[i] },
        });
      }
    }

    // Detecta duplicatas no legado dentro do mesmo dia
    const dupes = legTypes.filter(
      (t, idx) => legTypes.indexOf(t) !== idx,
    );
    if (dupes.length > 0) {
      divergences.push({
        code: "LEGACY_DUPLICATE_MEAL_TYPE",
        severity: "warn",
        message: `Dia ${day}: render legado duplica refeição(ões) ${[...new Set(dupes)].join(", ")}.`,
        context: { day, dupes: [...new Set(dupes)] },
      });
    }
  }

  for (const day of legByDay.keys()) {
    if (!snapByDay.has(day)) {
      divergences.push({
        code: "DAY_MISSING_IN_SNAPSHOT",
        severity: "info",
        message: `Dia ${day} existe no render legado mas não no snapshot.`,
        context: { day },
      });
    }
  }

  return {
    planId: meta.planId,
    schemaVersion: snapshot.schema_version,
    engineVersion: meta.engineVersion ?? snapshot.engine_version ?? null,
    snapshotHash: meta.snapshotHash ?? snapshot.hash ?? null,
    totals: {
      snapshotDays: snapDays,
      legacyDays: legacyDayCount,
      snapshotPrimaryItems: snapItems.primary,
      legacyPrimaryItems: legacyItemsCount.primary,
      snapshotSubstitutions: snapItems.subs,
      legacySubstitutions: legacyItemsCount.subs,
    },
    divergences,
    ok: divergences.every((d) => d.severity === "info"),
  };
}

/**
 * Loga o relatório no console de forma agrupada (não bloqueia render).
 * Em ambientes sem console, é no-op silencioso.
 */
export function logSnapshotCompareReport(report: SnapshotCompareReport): void {
  try {
    const tag = `[snapshot-compare] plan=${report.planId} schema=${report.schemaVersion} hash=${(report.snapshotHash || "").slice(0, 8)}`;
    if (report.divergences.length === 0) {
      console.info(`${tag} ✓ shape idêntico`, report.totals);
      return;
    }
    console.groupCollapsed(
      `${tag} ⚠ ${report.divergences.length} divergência(s)` +
        (report.ok ? " (apenas info)" : ""),
    );
    console.table(report.totals);
    for (const d of report.divergences) {
      const fn =
        d.severity === "error"
          ? console.error
          : d.severity === "warn"
            ? console.warn
            : console.info;
      fn(`[${d.code}] ${d.message}`, d.context || {});
    }
    console.groupEnd();
  } catch {
    // silencioso
  }
}
