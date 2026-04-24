/**
 * Single Day Consistency Validator
 * ----------------------------------------------------------------
 * Valida — antes de persistir e após carregar — que o master (dia 0)
 * é idêntico aos dias 1-6 num plano `single_day`.
 *
 * Backend espelhado em `validate_single_day_consistency(plan_id)` (SQL).
 * Frontend aqui evita persistência inconsistente quando a UI tem
 * o estado mais recente.
 */

import type { Tables } from "@/integrations/supabase/types";

type Item = Pick<
  Partial<Tables<"meal_plan_items">>,
  | "id"
  | "title"
  | "meal_type"
  | "day_of_week"
  | "calories_target"
  | "protein_target"
  | "carbs_target"
  | "fat_target"
>;

const round = (v: unknown) => (v == null ? -1 : Math.round(Number(v) * 10) / 10);

const fp = (i: Item) =>
  [
    String(i.meal_type ?? ""),
    (i.title ?? "").trim().toLowerCase(),
    round(i.calories_target),
    round(i.protein_target),
    round(i.carbs_target),
    round(i.fat_target),
  ].join("|");

export interface ConsistencyIssue {
  day: number;
  meal_type: string;
  title: string;
  issue: "missing_in_day" | "extra_in_day" | "drift";
}

export interface ConsistencyReport {
  valid: boolean;
  masterCount: number;
  issues: ConsistencyIssue[];
  summary: string;
}

/**
 * Compara dia 0 com dias 1-6. Cada dia deve conter EXATAMENTE o mesmo
 * conjunto multiset de fingerprints do master.
 */
export function checkSingleDayConsistency(items: Item[]): ConsistencyReport {
  const master = items.filter((i) => i.day_of_week === 0);
  const masterFps = master.map(fp).sort();

  const issues: ConsistencyIssue[] = [];

  for (let day = 1; day <= 6; day++) {
    const dayItems = items.filter((i) => i.day_of_week === day);
    const dayFps = dayItems.map(fp).sort();

    // missing in day
    const dayCounts = new Map<string, number>();
    dayFps.forEach((f) => dayCounts.set(f, (dayCounts.get(f) ?? 0) + 1));
    const masterCounts = new Map<string, number>();
    masterFps.forEach((f) => masterCounts.set(f, (masterCounts.get(f) ?? 0) + 1));

    for (const m of master) {
      const f = fp(m);
      const need = masterCounts.get(f) ?? 0;
      const have = dayCounts.get(f) ?? 0;
      if (have < need) {
        issues.push({
          day,
          meal_type: String(m.meal_type ?? ""),
          title: m.title ?? "",
          issue: "missing_in_day",
        });
      }
    }

    for (const d of dayItems) {
      const f = fp(d);
      const have = dayCounts.get(f) ?? 0;
      const allowed = masterCounts.get(f) ?? 0;
      if (have > allowed) {
        issues.push({
          day,
          meal_type: String(d.meal_type ?? ""),
          title: d.title ?? "",
          issue: "extra_in_day",
        });
      }
    }
  }

  const valid = issues.length === 0;
  const summary = valid
    ? `Master e dias 1-6 idênticos (${master.length} itens master).`
    : `${issues.length} inconsistência(s) encontrada(s) entre dia 0 e dias 1-6.`;

  return { valid, masterCount: master.length, issues, summary };
}

export class SingleDayConsistencyError extends Error {
  readonly report: ConsistencyReport;
  constructor(report: ConsistencyReport) {
    super(report.summary);
    this.name = "SingleDayConsistencyError";
    this.report = report;
  }
}

export function assertSingleDayConsistency(items: Item[]): void {
  const report = checkSingleDayConsistency(items);
  if (!report.valid) {
    console.error("[SINGLE_DAY_CONSISTENCY]", report);
    throw new SingleDayConsistencyError(report);
  }
}
