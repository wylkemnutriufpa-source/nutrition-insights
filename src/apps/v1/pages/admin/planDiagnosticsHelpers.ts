/**
 * Helpers puros usados pelo painel /admin/plan-loading-diagnostics.
 * Extraídos para permitir testes unitários determinísticos sem
 * acoplar ao componente React.
 */
import { isTrulyUnknownPlanStatus } from "@v1/lib/planStatusLabels";

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
/**
 * Resumo agregado de uma janela de tendência: total no período atual,
 * total no período anterior (mesmo tamanho, imediatamente antes) e
 * variação percentual.
 *
 * Para "período anterior" usamos as mesmas linhas brutas, deslocando
 * a janela: ex. trend de 7d hoje → compara com os 7d antes desses 7d.
 *
 * Retorna `deltaPct = null` quando previous=0 e current>0 (variação
 * indefinida / "novo"), ou 0 quando ambos são zero.
 */
export interface TrendSummary {
  currentUnknown: number;
  currentDrop: number;
  previousUnknown: number;
  previousDrop: number;
  deltaUnknownPct: number | null;
  deltaDropPct: number | null;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function summarizeTrend(
  rows: AlertTrendRow[],
  days: number,
  now: Date = new Date(),
): TrendSummary {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  // current window: [today - (days-1), today]
  const currentStart = today.getTime() - (days - 1) * dayMs;
  const currentEnd = today.getTime() + dayMs - 1; // inclui dia inteiro de hoje
  // previous window: [today - (2*days-1), today - days]
  const previousStart = today.getTime() - (2 * days - 1) * dayMs;
  const previousEnd = today.getTime() - days * dayMs + dayMs - 1;

  let currentUnknown = 0;
  let currentDrop = 0;
  let previousUnknown = 0;
  let previousDrop = 0;

  for (const r of rows) {
    const ts = Date.parse(r.created_at || "");
    if (Number.isNaN(ts)) continue;
    if (ts >= currentStart && ts <= currentEnd) {
      if (r.alert_type === "PLAN_STATUS_UNKNOWN") currentUnknown += 1;
      else if (r.alert_type === "PLAN_VISIBILITY_DROP") currentDrop += 1;
    } else if (ts >= previousStart && ts <= previousEnd) {
      if (r.alert_type === "PLAN_STATUS_UNKNOWN") previousUnknown += 1;
      else if (r.alert_type === "PLAN_VISIBILITY_DROP") previousDrop += 1;
    }
  }

  return {
    currentUnknown,
    currentDrop,
    previousUnknown,
    previousDrop,
    deltaUnknownPct: pctDelta(currentUnknown, previousUnknown),
    deltaDropPct: pctDelta(currentDrop, previousDrop),
  };
}

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
