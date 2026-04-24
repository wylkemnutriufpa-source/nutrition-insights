/**
 * Helpers puros usados pelo painel /admin/plan-loading-diagnostics.
 * Extraídos para permitir testes unitários determinísticos sem
 * acoplar ao componente React.
 */
import { isTrulyUnknownPlanStatus } from "@/lib/planStatusLabels";

export interface TrendBucket {
  date: string;
  PLAN_STATUS_UNKNOWN: number;
  PLAN_VISIBILITY_DROP: number;
}

export interface UnknownStatusBreakdown {
  plan_status: string;
  workspace_id: string | null;
  count: number;
  last_seen: string;
}

export interface AlertTrendRow {
  alert_type: string;
  created_at: string;
}

export interface PlanRowForBreakdown {
  plan_status: string | null;
  tenant_id: string | null;
  nutritionist_id: string | null;
  updated_at: string | null;
}

/**
 * Constrói um array de N dias (mais antigo → mais recente) com a
 * contagem por dia para PLAN_STATUS_UNKNOWN e PLAN_VISIBILITY_DROP.
 *
 * - Aceita um `now` injetável para testes determinísticos.
 * - Linhas fora do range são ignoradas.
 * - alert_types fora dos dois rastreados são ignorados.
 */
export function buildTrend(
  rows: AlertTrendRow[],
  days: number,
  now: Date = new Date(),
): TrendBucket[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const buckets: TrendBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    buckets.push({
      date: d.toISOString().slice(0, 10),
      PLAN_STATUS_UNKNOWN: 0,
      PLAN_VISIBILITY_DROP: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.date, i]));
  for (const r of rows) {
    const day = (r.created_at || "").slice(0, 10);
    const i = idx.get(day);
    if (i === undefined) continue;
    if (r.alert_type === "PLAN_STATUS_UNKNOWN") buckets[i].PLAN_STATUS_UNKNOWN += 1;
    else if (r.alert_type === "PLAN_VISIBILITY_DROP") buckets[i].PLAN_VISIBILITY_DROP += 1;
  }
  return buckets;
}

/**
 * Agrega linhas cruas de meal_plans por (plan_status × workspace),
 * filtrando para incluir SOMENTE plan_status verdadeiramente
 * desconhecidos (excluindo null/"" e itens do catálogo).
 *
 * Workspace = tenant_id; cai para nutritionist_id quando ausente; e
 * "(sem workspace)" como último recurso.
 *
 * Retorna ordenado por count desc (sem cap — pagine no consumidor).
 */
export function aggregateUnknownByWorkspace(
  rows: PlanRowForBreakdown[],
): UnknownStatusBreakdown[] {
  const breakdown = new Map<string, UnknownStatusBreakdown>();
  for (const r of rows) {
    if (!isTrulyUnknownPlanStatus(r.plan_status)) continue;
    const status = String(r.plan_status);
    const wsKey = r.tenant_id || r.nutritionist_id || "(sem workspace)";
    const k = `${status}::${wsKey}`;
    const cur = breakdown.get(k) || {
      plan_status: status,
      workspace_id: wsKey,
      count: 0,
      last_seen: r.updated_at || "",
    };
    cur.count += 1;
    if (r.updated_at && r.updated_at > cur.last_seen) cur.last_seen = r.updated_at;
    breakdown.set(k, cur);
  }
  return Array.from(breakdown.values()).sort((a, b) => b.count - a.count);
}
