/**
 * Cálculos do cabeçalho do editor (modo Diário Único).
 *
 * Centralizamos aqui para garantir que ListView e WeeklyGrid SEMPRE
 * derivem rótulo + totais do mesmo `effectiveDay`. Isso evita
 * dessincronização visual quando o profissional alterna entre
 * "forçar day 0" e o fallback legado.
 */

import { resolveEffectiveDay, type EffectiveDayInput } from "./resolveEffectiveDay";

export interface HeaderTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HeaderItem extends EffectiveDayInput {
  calories_target?: number | null;
  protein_target?: number | string | null;
  carbs_target?: number | string | null;
  fat_target?: number | string | null;
}

export interface HeaderSnapshot {
  /** Dia que o cabeçalho está descrevendo no momento. */
  effectiveDay: number;
  /** Rótulo human-readable correspondente ao dia efetivo. */
  effectiveDayLabel: string;
  /** Quando true, o cabeçalho está exibindo um dia legado (1..6). */
  showingLegacy: boolean;
  /** Totais nutricionais filtrados por `effectiveDay`. */
  totals: HeaderTotals;
}

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export function getDayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Dia ${day}`;
}

export function calcDayTotals(
  items: ReadonlyArray<HeaderItem>,
  day: number
): HeaderTotals {
  const dayItems = items.filter((i) => (i.day_of_week ?? 0) === day);
  return dayItems.reduce<HeaderTotals>(
    (acc, i) => ({
      calories: acc.calories + (Number(i.calories_target) || 0),
      protein: acc.protein + (Number(i.protein_target) || 0),
      carbs: acc.carbs + (Number(i.carbs_target) || 0),
      fat: acc.fat + (Number(i.fat_target) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Resolve o cabeçalho completo (dia + rótulo + totais) a partir dos
 * itens e da preferência `forceCanonical`. Garante consistência:
 * o `effectiveDay` usado para o label é EXATAMENTE o mesmo usado para
 * filtrar os totais.
 */
export function resolveHeaderSnapshot(
  items: ReadonlyArray<HeaderItem>,
  options: { forceCanonical?: boolean } = {}
): HeaderSnapshot {
  const effectiveDay = resolveEffectiveDay(items, options);
  return {
    effectiveDay,
    effectiveDayLabel: getDayLabel(effectiveDay),
    showingLegacy: effectiveDay !== 0,
    totals: calcDayTotals(items, effectiveDay),
  };
}
