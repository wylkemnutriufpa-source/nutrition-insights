/**
 * Admin: Plan Loading Diagnostics
 * ----------------------------------------------------------------
 * Painel rápido para diagnosticar incidentes do tipo "todos os planos
 * sumiram". Mostra:
 *   • Contagem total de meal_plans
 *   • Distribuição por plan_status (ativos vs total)
 *   • Lista dos últimos 50 alertas relacionados a planos
 *     (PLAN_VISIBILITY_DROP, PLAN_STATUS_UNKNOWN, PUBLISH_RACE_CONDITION,
 *      DIAGNOSTIC_FAILURE, E2E_CONSISTENCY_ERROR)
 *   • Botão de refresh
 */
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Database, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPlanStatusMeta, KNOWN_PLAN_STATUS_KEYS, isTrulyUnknownPlanStatus } from "@/lib/planStatusLabels";

interface StatusBucket {
  plan_status: string;
  total: number;
  active: number;
}

interface AlertRow {
  id: string;
  alert_type: string;
  severity: string | null;
  message: string;
  metadata: any;
  created_at: string;
}

interface UnknownStatusBreakdown {
  plan_status: string;
  workspace_id: string | null;
  count: number;
  last_seen: string;
}

interface TrendBucket {
  date: string;
  PLAN_STATUS_UNKNOWN: number;
  PLAN_VISIBILITY_DROP: number;
}

const TRACKED_ALERT_TYPES = [
  "PLAN_VISIBILITY_DROP",
  "PLAN_STATUS_UNKNOWN",
  "PUBLISH_RACE_CONDITION",
  "DIAGNOSTIC_FAILURE",
  "E2E_CONSISTENCY_ERROR",
];

const TREND_TRACKED_TYPES = ["PLAN_STATUS_UNKNOWN", "PLAN_VISIBILITY_DROP"] as const;

function buildTrend(
  rows: Array<{ alert_type: string; created_at: string }>,
  days: number,
): TrendBucket[] {
  const today = new Date();
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

const UNKNOWN_LIMIT_OPTIONS = [25, 50, 100, 200] as const;
type UnknownLimit = (typeof UNKNOWN_LIMIT_OPTIONS)[number];

export default function AdminPlanLoadingDiagnostics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [activeTotal, setActiveTotal] = useState<number>(0);
  const [buckets, setBuckets] = useState<StatusBucket[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [unknownByWorkspace, setUnknownByWorkspace] = useState<UnknownStatusBreakdown[]>([]);
  const [trend7, setTrend7] = useState<TrendBucket[]>([]);
  const [trend30, setTrend30] = useState<TrendBucket[]>([]);
  const [trendWindow, setTrendWindow] = useState<7 | 30>(7);
  const [unknownLimit, setUnknownLimit] = useState<UnknownLimit>(50);
  const [unknownPage, setUnknownPage] = useState<number>(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch counts em paralelo
    const [allPlansRes, alertsRes, unknownPlansRes, trendAlertsRes] = await Promise.all([
      supabase
        .from("meal_plans")
        .select("plan_status, is_active")
        .limit(50_000),
      supabase
        .from("system_alerts" as any)
        .select("id, alert_type, severity, message, metadata, created_at")
        .in("alert_type", TRACKED_ALERT_TYPES)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("meal_plans")
        .select("plan_status, tenant_id, nutritionist_id, updated_at")
        .limit(50_000),
      supabase
        .from("system_alerts" as any)
        .select("alert_type, created_at")
        .in("alert_type", TREND_TRACKED_TYPES as unknown as string[])
        .gte("created_at", since30)
        .order("created_at", { ascending: false })
        .limit(10_000),
    ]);

    if (allPlansRes.error) {
      setError(allPlansRes.error.message);
      setLoading(false);
      return;
    }

    const rows = (allPlansRes.data || []) as Array<{ plan_status: string | null; is_active: boolean | null }>;
    setTotal(rows.length);
    setActiveTotal(rows.filter((r) => r.is_active === true).length);

    const map = new Map<string, StatusBucket>();
    rows.forEach((r) => {
      const key = r.plan_status || "draft";
      const cur = map.get(key) || { plan_status: key, total: 0, active: 0 };
      cur.total += 1;
      if (r.is_active) cur.active += 1;
      map.set(key, cur);
    });
    setBuckets(Array.from(map.values()).sort((a, b) => b.total - a.total));

    if (!alertsRes.error) {
      setAlerts((alertsRes.data || []) as unknown as AlertRow[]);
    }

    // Unknown statuses by workspace (tenant_id ?? nutritionist_id)
    if (!unknownPlansRes.error) {
      const unknownRows = (unknownPlansRes.data || []) as Array<{
        plan_status: string | null;
        tenant_id: string | null;
        nutritionist_id: string | null;
        updated_at: string | null;
      }>;
      const breakdown = new Map<string, UnknownStatusBreakdown>();
      for (const r of unknownRows) {
        // Use isTrulyUnknownPlanStatus para excluir null/"" do bucket Desconhecido
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
      // Mantém TODAS as ocorrências; o slicing/paginação acontece no render
      // para permitir navegação sem refetch.
      setUnknownByWorkspace(
        Array.from(breakdown.values()).sort((a, b) => b.count - a.count),
      );
    }

    // Trend buckets per day
    if (!trendAlertsRes.error) {
      const alertRows = ((trendAlertsRes.data || []) as unknown) as Array<{ alert_type: string; created_at: string }>;
      setTrend7(buildTrend(alertRows, 7));
      setTrend30(buildTrend(alertRows, 30));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unknownStatuses = buckets.filter((b) => isTrulyUnknownPlanStatus(b.plan_status));

  // Pagination derived state for unknown-by-workspace list
  const totalUnknownPages = Math.max(1, Math.ceil(unknownByWorkspace.length / unknownLimit));
  const currentPage = Math.min(unknownPage, totalUnknownPages);
  const pagedUnknown = unknownByWorkspace.slice(
    (currentPage - 1) * unknownLimit,
    currentPage * unknownLimit,
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diagnóstico de Carregamento de Planos</h1>
            <p className="text-sm text-muted-foreground">
              Confirme rapidamente que os planos continuam visíveis e inspecione erros recentes.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            data-testid="plan-diagnostics-refresh"
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Atualizar
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
              <div>
                <p className="text-sm font-medium text-destructive">Falha ao carregar diagnósticos</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de planos</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="plan-diagnostics-total">{total}</p>
              <p className="text-xs text-muted-foreground mt-1">linhas em meal_plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="plan-diagnostics-active">{activeTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">is_active = true</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status desconhecidos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="plan-diagnostics-unknown">{unknownStatuses.length}</p>
              <p className="text-xs text-muted-foreground mt-1">valores fora do catálogo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por plan_status</CardTitle>
          </CardHeader>
          <CardContent>
            {buckets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="plan-diagnostics-buckets">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">plan_status</th>
                      <th className="text-left py-2">label</th>
                      <th className="text-right py-2">total</th>
                      <th className="text-right py-2">ativos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((b) => {
                      const meta = getPlanStatusMeta(b.plan_status);
                      const isUnknown = isTrulyUnknownPlanStatus(b.plan_status);
                      return (
                        <tr key={b.plan_status} className="border-t border-border">
                          <td className="py-2">
                            <code className="text-xs">{b.plan_status}</code>
                            {isUnknown && (
                              <Badge variant="outline" className="ml-2 text-[10px] border-destructive/40 text-destructive">
                                novo
                              </Badge>
                            )}
                          </td>
                          <td className="py-2">
                            <Badge className={`text-[10px] ${meta.badgeClass}`}>{meta.label}</Badge>
                          </td>
                          <td className="py-2 text-right font-mono">{b.total}</td>
                          <td className="py-2 text-right font-mono">{b.active}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unknown plan_status by workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Status desconhecidos por workspace
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Onde valores de <code>plan_status</code> fora do catálogo aparecem (top 50).
              Workspace = <code>tenant_id</code> ou, se ausente, <code>nutritionist_id</code>.
            </p>
          </CardHeader>
          <CardContent>
            {unknownByWorkspace.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="plan-diagnostics-no-unknown-ws">
                Nenhum status desconhecido detectado nos planos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  data-testid="plan-diagnostics-unknown-ws"
                >
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">plan_status</th>
                      <th className="text-left py-2">workspace</th>
                      <th className="text-right py-2">ocorrências</th>
                      <th className="text-right py-2">visto por último</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unknownByWorkspace.map((u, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="py-2">
                          <code className="text-xs">{u.plan_status}</code>
                        </td>
                        <td className="py-2">
                          <code className="text-[10px] break-all">{u.workspace_id}</code>
                        </td>
                        <td className="py-2 text-right font-mono">{u.count}</td>
                        <td className="py-2 text-right text-[10px] text-muted-foreground">
                          {u.last_seen ? new Date(u.last_seen).toLocaleString("pt-BR") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Tendência de PLAN_STATUS_UNKNOWN e PLAN_VISIBILITY_DROP
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Volume diário; útil para detectar crescimento súbito.
              </p>
            </div>
            <div className="flex gap-1" data-testid="plan-diagnostics-trend-window">
              <Button
                size="sm"
                variant={trendWindow === 7 ? "default" : "outline"}
                onClick={() => setTrendWindow(7)}
              >
                7d
              </Button>
              <Button
                size="sm"
                variant={trendWindow === 30 ? "default" : "outline"}
                onClick={() => setTrendWindow(30)}
              >
                30d
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(trendWindow === 7 ? trend7 : trend30).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="plan-diagnostics-trend">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">data</th>
                      <th className="text-right py-2">PLAN_STATUS_UNKNOWN</th>
                      <th className="text-right py-2">PLAN_VISIBILITY_DROP</th>
                      <th className="text-left py-2 pl-4">distribuição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trendWindow === 7 ? trend7 : trend30).map((b) => {
                      const max = Math.max(
                        1,
                        ...((trendWindow === 7 ? trend7 : trend30).flatMap((x) => [
                          x.PLAN_STATUS_UNKNOWN,
                          x.PLAN_VISIBILITY_DROP,
                        ])),
                      );
                      const wU = Math.round((b.PLAN_STATUS_UNKNOWN / max) * 100);
                      const wV = Math.round((b.PLAN_VISIBILITY_DROP / max) * 100);
                      return (
                        <tr key={b.date} className="border-t border-border">
                          <td className="py-2 text-xs font-mono">{b.date}</td>
                          <td className="py-2 text-right font-mono">{b.PLAN_STATUS_UNKNOWN}</td>
                          <td className="py-2 text-right font-mono">{b.PLAN_VISIBILITY_DROP}</td>
                          <td className="py-2 pl-4 w-[40%]">
                            <div className="flex flex-col gap-1">
                              <div
                                className="h-1.5 rounded bg-warning/70"
                                style={{ width: `${wU}%` }}
                                title={`PLAN_STATUS_UNKNOWN: ${b.PLAN_STATUS_UNKNOWN}`}
                              />
                              <div
                                className="h-1.5 rounded bg-destructive/70"
                                style={{ width: `${wV}%` }}
                                title={`PLAN_VISIBILITY_DROP: ${b.PLAN_VISIBILITY_DROP}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos alertas relacionados a planos</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="plan-diagnostics-no-alerts">
                Sem alertas registrados nos últimos eventos.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="plan-diagnostics-alerts">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{a.alert_type}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm">{a.message}</p>
                    {a.metadata && (
                      <pre className="mt-2 text-[10px] text-muted-foreground bg-muted/40 rounded p-2 overflow-x-auto">
                        {JSON.stringify(a.metadata, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
