/**
 * Logger estruturado para auditoria de consolidação/undo do plano legado.
 *
 * Centraliza o formato dos eventos para que filtros (ex.: console e
 * sistemas de observabilidade) consigam diferenciar facilmente:
 * - `migration:plan`        → resultado bruto do `planLegacyConsolidation`
 * - `migration:item-moved`  → cada item realmente movido para day 0
 * - `migration:conflict`    → cada item preservado por conflito
 * - `migration:undo`        → reversão por item
 *
 * Os logs são prefixados com `[LegacyMigration]` e estruturados como
 * objetos para permitir inspeção rápida no DevTools.
 */
import type {
  ConsolidationPlan,
  MigrationUndoEntry,
} from "./legacyDayConsolidation";

export interface LegacyMigrationLogEvent {
  event:
    | "migration:plan"
    | "migration:item-moved"
    | "migration:conflict"
    | "migration:undo"
    | "migration:undo-item";
  timestamp: string;
  effectiveDay: number;
  forceCanonical?: boolean;
  itemId?: string;
  mealType?: string;
  fromDay?: number;
  toDay?: number;
  movedTotal?: number;
  conflictsTotal?: number;
  movedByMealType?: Record<string, number>;
  conflictsByMealType?: Record<string, number>;
}

type LogSink = (entry: LegacyMigrationLogEvent) => void;

let sinks: LogSink[] = [
  (entry) => {
    // Default sink: console com prefixo padronizado.
    // Usamos `info` para que apareça mesmo quando filtros silenciam debug.
    // eslint-disable-next-line no-console
    console.info(`[LegacyMigration] ${entry.event}`, entry);
  },
];

/** Permite testes injetarem sinks customizados (ou silenciar). */
export function __setLegacyMigrationSinks(next: LogSink[]) {
  sinks = next;
}

/** Restaura sink default (somente console). Útil em afterEach. */
export function __resetLegacyMigrationSinks() {
  sinks = [
    (entry) => {
      // eslint-disable-next-line no-console
      console.info(`[LegacyMigration] ${entry.event}`, entry);
    },
  ];
}

function emit(entry: Omit<LegacyMigrationLogEvent, "timestamp">) {
  const full: LegacyMigrationLogEvent = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  for (const s of sinks) {
    try {
      s(full);
    } catch {
      /* ignore sink errors */
    }
  }
}

export interface LogPlanContext {
  effectiveDay: number;
  forceCanonical?: boolean;
  itemsById: ReadonlyMap<string, { meal_type: string; day_of_week: number | null | undefined }>;
}

/**
 * Loga o plano completo + um evento por item movido + um por conflito.
 * Use logo após calcular `planLegacyConsolidation` e antes de aplicar
 * as mutações no store.
 */
export function logConsolidationPlan(
  plan: ConsolidationPlan,
  ctx: LogPlanContext
): void {
  emit({
    event: "migration:plan",
    effectiveDay: ctx.effectiveDay,
    forceCanonical: ctx.forceCanonical,
    movedTotal: plan.toMove.length,
    conflictsTotal: plan.conflicts.length,
    movedByMealType: { ...plan.movedByMealType },
    conflictsByMealType: { ...plan.conflictsByMealType },
  });

  for (const id of plan.toMove) {
    const it = ctx.itemsById.get(id);
    emit({
      event: "migration:item-moved",
      effectiveDay: ctx.effectiveDay,
      forceCanonical: ctx.forceCanonical,
      itemId: id,
      mealType: it?.meal_type,
      fromDay: it?.day_of_week ?? undefined,
      toDay: 0,
    });
  }

  for (const c of plan.conflicts) {
    emit({
      event: "migration:conflict",
      effectiveDay: ctx.effectiveDay,
      forceCanonical: ctx.forceCanonical,
      itemId: c.itemId,
      mealType: c.mealType,
      fromDay: c.fromDay,
    });
  }
}

export interface LogUndoContext {
  effectiveDay: number;
  forceCanonical?: boolean;
  itemsById: ReadonlyMap<string, { meal_type: string }>;
}

/** Loga uma operação de undo (1 evento agregador + 1 por item). */
export function logUndoMigration(
  snapshot: ReadonlyArray<MigrationUndoEntry>,
  ctx: LogUndoContext
): void {
  emit({
    event: "migration:undo",
    effectiveDay: ctx.effectiveDay,
    forceCanonical: ctx.forceCanonical,
    movedTotal: snapshot.length,
  });
  for (const entry of snapshot) {
    const it = ctx.itemsById.get(entry.itemId);
    emit({
      event: "migration:undo-item",
      effectiveDay: ctx.effectiveDay,
      forceCanonical: ctx.forceCanonical,
      itemId: entry.itemId,
      mealType: it?.meal_type,
      fromDay: 0,
      toDay: entry.previousDay,
    });
  }
}
