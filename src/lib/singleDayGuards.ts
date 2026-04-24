/**
 * Single Day Plan Guards (Modo Dia Padrão)
 * ----------------------------------------------------------------
 * Garante que o sistema NUNCA gere variações automáticas de 7 dias
 * e que a UI permaneça sincronizada com o banco.
 *
 * Regras invioláveis:
 *   1. Todo item deve possuir `day_of_week === 0` (Master Day).
 *   2. Não pode haver mais de 1 item primário por (meal_type) sem
 *      vínculo a um substitution_group_id.
 *   3. Snapshot UI deve bater com snapshot persistido (mesmos ids,
 *      títulos, macros e meal_types).
 *
 * Uso:
 *   - Antes de persistir: assertSingleDayItems(items)
 *   - Após persistir/hidratar: assertUiMatchesDb(uiItems, dbItems)
 */

import type { Tables } from "@/integrations/supabase/types";

type MealItemLike = Pick<
  Partial<Tables<"meal_plan_items">>,
  | "id"
  | "title"
  | "meal_type"
  | "day_of_week"
  | "calories_target"
  | "protein_target"
  | "carbs_target"
  | "fat_target"
  | "is_primary"
  | "substitution_group_id"
>;

export class SingleDayViolationError extends Error {
  readonly code: string;
  readonly offenders: unknown[];
  constructor(code: string, message: string, offenders: unknown[] = []) {
    super(message);
    this.name = "SingleDayViolationError";
    this.code = code;
    this.offenders = offenders;
  }
}

/**
 * Bloqueia qualquer item com `day_of_week` ≠ 0.
 * Retorna a lista normalizada (forçando day_of_week = 0) quando `autoFix=true`.
 */
export function assertSingleDayItems<T extends MealItemLike>(
  items: T[],
  options: { autoFix?: boolean } = {}
): T[] {
  if (!Array.isArray(items)) {
    throw new SingleDayViolationError(
      "INVALID_INPUT",
      "Lista de itens inválida para validação Single Day."
    );
  }

  const offenders = items.filter((i) => i.day_of_week != null && i.day_of_week !== 0);

  if (offenders.length === 0) return items;

  if (options.autoFix) {
    console.warn(
      "[SINGLE_DAY_GUARD] Itens com day_of_week≠0 detectados. Normalizando para 0.",
      { count: offenders.length }
    );
    return items.map((i) => ({ ...i, day_of_week: 0 }));
  }

  throw new SingleDayViolationError(
    "MULTI_DAY_FORBIDDEN",
    `Modo Dia Padrão violado: ${offenders.length} item(ns) com day_of_week ≠ 0.`,
    offenders
  );
}

/**
 * Detecta variações automáticas de 7 dias: presença de itens iguais
 * (mesmo título + meal_type) replicados em múltiplos dias.
 */
export function detectAutomatedWeeklyVariation<T extends MealItemLike>(
  items: T[]
): { hasVariation: boolean; daysFound: number[]; reason?: string } {
  const days = new Set<number>();
  for (const it of items) {
    if (it.day_of_week != null) days.add(it.day_of_week);
  }
  const daysFound = Array.from(days).sort();

  if (daysFound.length <= 1) {
    return { hasVariation: false, daysFound };
  }

  return {
    hasVariation: true,
    daysFound,
    reason: `Detectados itens em ${daysFound.length} dias distintos: ${daysFound.join(", ")}. Modo Dia Padrão aceita apenas day=0.`,
  };
}

// ── Sincronização UI ↔ Banco ──────────────────────────────────
type SyncableItem = Pick<
  Partial<Tables<"meal_plan_items">>,
  "id" | "title" | "meal_type" | "calories_target" | "protein_target" | "carbs_target" | "fat_target"
>;

const round = (v: unknown) =>
  v == null ? null : Math.round(Number(v) * 10) / 10;

const fingerprint = (i: SyncableItem) =>
  [
    i.id ?? "",
    String(i.meal_type ?? ""),
    (i.title ?? "").trim().toLowerCase(),
    round(i.calories_target),
    round(i.protein_target),
    round(i.carbs_target),
    round(i.fat_target),
  ].join("|");

export interface UiDbDiff {
  inSync: boolean;
  missingInDb: SyncableItem[];
  missingInUi: SyncableItem[];
  drifted: Array<{ id: string; ui: string; db: string }>;
}

/**
 * Compara snapshot da UI com snapshot persistido.
 * Considera divergências de macros, título e presença/ausência de itens.
 */
export function diffUiVsDb(
  uiItems: SyncableItem[],
  dbItems: SyncableItem[]
): UiDbDiff {
  const uiMap = new Map(uiItems.filter((i) => i.id).map((i) => [i.id as string, i]));
  const dbMap = new Map(dbItems.filter((i) => i.id).map((i) => [i.id as string, i]));

  const missingInDb = uiItems.filter((i) => i.id && !dbMap.has(i.id as string));
  const missingInUi = dbItems.filter((i) => i.id && !uiMap.has(i.id as string));

  const drifted: UiDbDiff["drifted"] = [];
  for (const [id, ui] of uiMap.entries()) {
    const db = dbMap.get(id);
    if (!db) continue;
    const fpUi = fingerprint(ui);
    const fpDb = fingerprint(db);
    if (fpUi !== fpDb) drifted.push({ id, ui: fpUi, db: fpDb });
  }

  return {
    inSync:
      missingInDb.length === 0 && missingInUi.length === 0 && drifted.length === 0,
    missingInDb,
    missingInUi,
    drifted,
  };
}

export function assertUiMatchesDb(
  uiItems: SyncableItem[],
  dbItems: SyncableItem[]
): void {
  const diff = diffUiVsDb(uiItems, dbItems);
  if (diff.inSync) return;

  console.error("[SINGLE_DAY_GUARD] Dessincronia UI ↔ DB detectada", diff);
  throw new SingleDayViolationError(
    "UI_DB_DESYNC",
    `UI fora de sincronia com banco: ` +
      `${diff.missingInDb.length} apenas na UI, ` +
      `${diff.missingInUi.length} apenas no DB, ` +
      `${diff.drifted.length} com macros divergentes.`,
    [diff]
  );
}
