/**
 * Admin: Plan Loading Diagnostics
 * ----------------------------------------------------------------
 * Painel para diagnosticar incidentes do tipo "todos os planos sumiram".
 *
 * Recursos:
 *   • Contagem total/ativos/desconhecidos
 *   • Distribuição por plan_status
 *   • Tendência 7d/30d com resumo de variação vs período anterior
 *   • Filtro por tipo de alerta (UNKNOWN, DROP, ambos) + workspace
 *   • Drill-down: clicar em status × workspace abre alertas filtrados
 *   • Persistência (URL + localStorage) de página, limite, janela e filtros
 *   • Export filtrado (CSV/XLSX/PDF) com recorte de janela + filtros
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@v1/components/ui/dialog";
import {
  RefreshCw,
  AlertTriangle,
  Database,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Search,
} from "lucide-react";
import { supabase } from "@v1/integrations/supabase/client";
import { getPlanStatusMeta, isTrulyUnknownPlanStatus } from "@v1/lib/planStatusLabels";
import { exportData } from "@v1/lib/auditExportUtils";
import { toast } from "sonner";

import {
  buildTrend,
  aggregateUnknownByWorkspace,
  summarizeTrend,
  type TrendBucket,
  type UnknownStatusBreakdown,
} from "./planDiagnosticsHelpers";

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

const TRACKED_ALERT_TYPES = [
  "PLAN_VISIBILITY_DROP",
  "PLAN_STATUS_UNKNOWN",
  "PUBLISH_RACE_CONDITION",
  "DIAGNOSTIC_FAILURE",
  "E2E_CONSISTENCY_ERROR",
];

const TREND_TRACKED_TYPES = ["PLAN_STATUS_UNKNOWN", "PLAN_VISIBILITY_DROP"] as const;

const UNKNOWN_LIMIT_OPTIONS = [25, 50, 100, 200] as const;
type UnknownLimit = (typeof UNKNOWN_LIMIT_OPTIONS)[number];

type AlertTypeFilter = "ALL" | "PLAN_STATUS_UNKNOWN" | "PLAN_VISIBILITY_DROP";

const STORAGE_KEY = "fitjourney:admin-plan-diagnostics:state";

interface PersistedState {
  page: number;
  limit: UnknownLimit;
  window: 7 | 30;
  alertType: AlertTypeFilter;
}

function readPersistedState(): Partial<PersistedState> {
  try {
    const url = new URL(window.location.href);
    const fromUrl: Partial<PersistedState> = {};
    const p = url.searchParams.get("page");
    const l = url.searchParams.get("limit");
    const w = url.searchParams.get("window");
    const t = url.searchParams.get("type");
    if (p) fromUrl.page = Math.max(1, parseInt(p, 10) || 1);
    if (l && (UNKNOWN_LIMIT_OPTIONS as readonly number[]).includes(parseInt(l, 10))) {
      fromUrl.limit = parseInt(l, 10) as UnknownLimit;
    }
    if (w === "7" || w === "30") fromUrl.window = parseInt(w, 10) as 7 | 30;
    if (t === "PLAN_STATUS_UNKNOWN" || t === "PLAN_VISIBILITY_DROP" || t === "ALL") {
      fromUrl.alertType = t;
    }
    if (Object.keys(fromUrl).length > 0) return fromUrl;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    // ignore
  }
  return {};
}

function writePersistedState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(state.page));
    url.searchParams.set("limit", String(state.limit));
    url.searchParams.set("window", String(state.window));
    url.searchParams.set("type", state.alertType);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" aria-hidden /> novo
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden /> 0%
      </span>
    );
  }
  const positive = delta > 0;
  const cls = positive ? "text-destructive" : "text-emerald-500";
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

export default function AdminPlanLoadingDiagnostics() {
  const persisted = useMemo(() => readPersistedState(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [activeTotal, setActiveTotal] = useState<number>(0);
  const [buckets, setBuckets] = useState<StatusBucket[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [unknownByWorkspace, setUnknownByWorkspace] = useState<UnknownStatusBreakdown[]>([]);
  const [trendRows, setTrendRows] = useState<{ alert_type: string; created_at: string }[]>([]);

  const [trendWindow, setTrendWindow] = useState<7 | 30>(persisted.window ?? 7);
  const [unknownLimit, setUnknownLimit] = useState<UnknownLimit>(persisted.limit ?? 50);
  const [unknownPage, setUnknownPage] = useState<number>(persisted.page ?? 1);
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertTypeFilter>(
    persisted.alertType ?? "ALL",
  );

  // Drill-down modal state
  const [drillBucket, setDrillBucket] = useState<UnknownStatusBreakdown | null>(null);
  const [drillAlerts, setDrillAlerts] = useState<AlertRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillPage, setDrillPage] = useState(1);
  const DRILL_PAGE_SIZE = 20;

  const [exporting, setExporting] = useState(false);

  // Persist navigation state
  useEffect(() => {
    writePersistedState({
      page: unknownPage,
      limit: unknownLimit,
      window: trendWindow,
      alertType: alertTypeFilter,
    });
  }, [unknownPage, unknownLimit, trendWindow, alertTypeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // alertas até 60d para podermos calcular delta vs período anterior
    const since60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

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
        .gte("created_at", since60)
        .order("created_at", { ascending: false })
        .limit(20_000),
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

    if (!unknownPlansRes.error) {
      const unknownRows = (unknownPlansRes.data || []) as Array<{
        plan_status: string | null;
        tenant_id: string | null;
        nutritionist_id: string | null;
        updated_at: string | null;
      }>;
      setUnknownByWorkspace(aggregateUnknownByWorkspace(unknownRows));
    }

    if (!trendAlertsRes.error) {
      setTrendRows(((trendAlertsRes.data || []) as unknown) as Array<{ alert_type: string; created_at: string }>);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unknownStatuses = buckets.filter((b) => isTrulyUnknownPlanStatus(b.plan_status));

  // Filter trend rows by selected alert type for the chart
  const filteredTrendRows = useMemo(() => {
    if (alertTypeFilter === "ALL") return trendRows;
    return trendRows.filter((r) => r.alert_type === alertTypeFilter);
  }, [trendRows, alertTypeFilter]);

  const trendBuckets: TrendBucket[] = useMemo(
    () => buildTrend(filteredTrendRows, trendWindow),
    [filteredTrendRows, trendWindow],
  );

  // Summary uses ALL types so we can show both totals + delta
  const summary = useMemo(() => summarizeTrend(trendRows, trendWindow), [trendRows, trendWindow]);

  // Pagination of unknown-by-workspace
  const totalUnknownPages = Math.max(1, Math.ceil(unknownByWorkspace.length / unknownLimit));
  const currentPage = Math.min(unknownPage, totalUnknownPages);
  const pagedUnknown = unknownByWorkspace.slice(
    (currentPage - 1) * unknownLimit,
    currentPage * unknownLimit,
  );

  // ---------- Drill-down ----------
  const openDrill = useCallback(async (bucket: UnknownStatusBreakdown) => {
    setDrillBucket(bucket);
    setDrillPage(1);
    setDrillLoading(true);
    setDrillAlerts([]);

    // Tentamos casar pelo metadata.plan_status; workspace pode ser tenant_id
    // ou nutritionist_id. Buscamos os PLAN_STATUS_UNKNOWN dos últimos 90d e
    // filtramos no cliente (sem suporte robusto a JSONB filter cross-key
    // sem assumir schema).
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error: dErr } = await supabase
      .from("system_alerts" as any)
      .select("id, alert_type, severity, message, metadata, created_at")
      .eq("alert_type", "PLAN_STATUS_UNKNOWN")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (dErr) {
      toast.error("Falha ao carregar alertas do bucket", { description: dErr.message });
      setDrillLoading(false);
      return;
    }

    const all = (data || []) as unknown as AlertRow[];
    const matching = all.filter((a) => {
      const ps = a.metadata?.plan_status;
      const ws =
        a.metadata?.tenant_id ||
        a.metadata?.nutritionist_id ||
        a.metadata?.workspace_id ||
        "(sem workspace)";
      return String(ps) === bucket.plan_status && String(ws) === bucket.workspace_id;
    });
    setDrillAlerts(matching);
    setDrillLoading(false);
  }, []);

  const closeDrill = useCallback(() => {
    setDrillBucket(null);
    setDrillAlerts([]);
    setDrillPage(1);
  }, []);

  const drillPageCount = Math.max(1, Math.ceil(drillAlerts.length / DRILL_PAGE_SIZE));
  const drillPaged = drillAlerts.slice(
    (drillPage - 1) * DRILL_PAGE_SIZE,
    drillPage * DRILL_PAGE_SIZE,
  );

  // ---------- Export filtrado ----------
  const handleExport = useCallback(
    async (format: "CSV" | "XLSX" | "PDF") => {
      setExporting(true);
      try {
        const since = new Date(
          Date.now() - trendWindow * 24 * 60 * 60 * 1000,
        ).toISOString();

        const types =
          alertTypeFilter === "ALL"
            ? (TREND_TRACKED_TYPES as unknown as string[])
            : [alertTypeFilter];

        const { data, error: qErr } = await supabase
          .from("system_alerts" as any)
          .select("id, alert_type, severity, message, metadata, created_at, correlation_id")
          .in("alert_type", types)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(10_000);

        if (qErr) throw qErr;
        const rows = (data || []) as unknown as any[];
        if (rows.length === 0) {
          toast.warning("Nenhum alerta no recorte atual", {
            description: `Janela ${trendWindow}d, tipo ${alertTypeFilter}`,
          });
          setExporting(false);
          return;
        }

        await exportData({
          format,
          data: rows,
          filters: {
            window_days: trendWindow,
            alert_type: alertTypeFilter,
            since,
          },
          filename: `plan_diagnostics_${alertTypeFilter}_${trendWindow}d_${Date.now()}`,
        });
        toast.success(`Export ${format} gerado`, {
          description: `${rows.length} alertas no recorte (${trendWindow}d, ${alertTypeFilter}).`,
        });
      } catch (e: any) {
        toast.error("Falha ao exportar", { description: e?.message ?? String(e) });
      } finally {
        setExporting(false);
      }
    },
    [trendWindow, alertTypeFilter],
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
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  Status desconhecidos por workspace
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Onde valores de <code>plan_status</code> fora do catálogo aparecem.
                  Workspace = <code>tenant_id</code> ou, se ausente, <code>nutritionist_id</code>.
                  Clique em uma linha para ver os alertas que compõem o bucket.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="unknown-limit" className="text-muted-foreground">Por página:</label>
                <select
                  id="unknown-limit"
                  data-testid="plan-diagnostics-unknown-limit"
                  value={unknownLimit}
                  onChange={(e) => {
                    setUnknownLimit(Number(e.target.value) as UnknownLimit);
                    setUnknownPage(1);
                  }}
                  className="rounded-md border border-input bg-background px-2 py-1"
                >
                  {UNKNOWN_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {unknownByWorkspace.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="plan-diagnostics-no-unknown-ws">
                Nenhum status desconhecido detectado nos planos.
              </p>
            ) : (
              <>
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
                        <th className="text-right py-2">ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedUnknown.map((u, idx) => (
                        <tr
                          key={`${u.plan_status}-${u.workspace_id}-${idx}`}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() => void openDrill(u)}
                        >
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
                          <td className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openDrill(u);
                              }}
                              data-testid="plan-diagnostics-drill-open"
                            >
                              <Search className="h-3 w-3 mr-1" aria-hidden />
                              detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className="flex items-center justify-between gap-2 mt-3 text-xs"
                  data-testid="plan-diagnostics-unknown-pagination"
                >
                  <span className="text-muted-foreground">
                    Mostrando <strong data-testid="plan-diagnostics-unknown-shown">{pagedUnknown.length}</strong>{" "}
                    de <strong data-testid="plan-diagnostics-unknown-total">{unknownByWorkspace.length}</strong>{" "}
                    combinações status × workspace.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setUnknownPage((p) => Math.max(1, p - 1))}
                      data-testid="plan-diagnostics-unknown-prev"
                    >
                      ← Anterior
                    </Button>
                    <span className="font-mono text-muted-foreground" data-testid="plan-diagnostics-unknown-pageinfo">
                      pág. {currentPage} / {totalUnknownPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalUnknownPages}
                      onClick={() => setUnknownPage((p) => Math.min(totalUnknownPages, p + 1))}
                      data-testid="plan-diagnostics-unknown-next"
                    >
                      Próxima →
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trend table with summary + filter + export */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-row items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  Tendência de PLAN_STATUS_UNKNOWN e PLAN_VISIBILITY_DROP
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Volume diário; útil para detectar crescimento súbito.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1" data-testid="plan-diagnostics-trend-window" role="group" aria-label="Janela de tendência">
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
                <div className="flex gap-1" data-testid="plan-diagnostics-type-filter" role="group" aria-label="Filtro por tipo">
                  <Button
                    size="sm"
                    variant={alertTypeFilter === "ALL" ? "default" : "outline"}
                    onClick={() => setAlertTypeFilter("ALL")}
                  >
                    Todos
                  </Button>
                  <Button
                    size="sm"
                    variant={alertTypeFilter === "PLAN_STATUS_UNKNOWN" ? "default" : "outline"}
                    onClick={() => setAlertTypeFilter("PLAN_STATUS_UNKNOWN")}
                  >
                    UNKNOWN
                  </Button>
                  <Button
                    size="sm"
                    variant={alertTypeFilter === "PLAN_VISIBILITY_DROP" ? "default" : "outline"}
                    onClick={() => setAlertTypeFilter("PLAN_VISIBILITY_DROP")}
                  >
                    DROP
                  </Button>
                </div>
                <div className="flex gap-1" data-testid="plan-diagnostics-export">
                  <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport("CSV")}>
                    <Download className="h-3 w-3 mr-1" aria-hidden /> CSV
                  </Button>
                  <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport("XLSX")}>
                    <Download className="h-3 w-3 mr-1" aria-hidden /> XLSX
                  </Button>
                  <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport("PDF")}>
                    <Download className="h-3 w-3 mr-1" aria-hidden /> PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Summary cards: totals + delta vs período anterior */}
            <div className="grid gap-3 sm:grid-cols-2" data-testid="plan-diagnostics-trend-summary">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-muted-foreground">PLAN_STATUS_UNKNOWN ({trendWindow}d)</span>
                  <DeltaBadge delta={summary.deltaUnknownPct} />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono" data-testid="plan-diagnostics-summary-unknown-current">
                    {summary.currentUnknown}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs <strong data-testid="plan-diagnostics-summary-unknown-previous">{summary.previousUnknown}</strong> no período anterior
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-muted-foreground">PLAN_VISIBILITY_DROP ({trendWindow}d)</span>
                  <DeltaBadge delta={summary.deltaDropPct} />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono" data-testid="plan-diagnostics-summary-drop-current">
                    {summary.currentDrop}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs <strong data-testid="plan-diagnostics-summary-drop-previous">{summary.previousDrop}</strong> no período anterior
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendBuckets.length === 0 ? (
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
                    {trendBuckets.map((b) => {
                      const max = Math.max(
                        1,
                        ...trendBuckets.flatMap((x) => [x.PLAN_STATUS_UNKNOWN, x.PLAN_VISIBILITY_DROP]),
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

      {/* Drill-down modal */}
      <Dialog open={!!drillBucket} onOpenChange={(open) => !open && closeDrill()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="plan-diagnostics-drill-modal">
          <DialogHeader>
            <DialogTitle>
              Alertas do bucket{" "}
              <code className="text-sm">{drillBucket?.plan_status}</code> ×{" "}
              <code className="text-sm">{drillBucket?.workspace_id}</code>
            </DialogTitle>
            <DialogDescription>
              Lista paginada de alertas <code>PLAN_STATUS_UNKNOWN</code> dos últimos 90 dias que compõem este agregado.
            </DialogDescription>
          </DialogHeader>

          {drillLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
          ) : drillAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center" data-testid="plan-diagnostics-drill-empty">
              Nenhum alerta encontrado para este bucket nos últimos 90 dias.
              <br />
              <span className="text-xs">
                (Os planos com este status existem em <code>meal_plans</code>, mas o evento de
                detecção pode estar fora da janela ou não foi registrado.)
              </span>
            </p>
          ) : (
            <>
              <ul className="space-y-2" data-testid="plan-diagnostics-drill-list">
                {drillPaged.map((a) => (
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
              <div className="flex items-center justify-between gap-2 mt-3 text-xs" data-testid="plan-diagnostics-drill-pagination">
                <span className="text-muted-foreground">
                  Mostrando <strong>{drillPaged.length}</strong> de <strong>{drillAlerts.length}</strong> alertas.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={drillPage <= 1}
                    onClick={() => setDrillPage((p) => Math.max(1, p - 1))}
                  >
                    ← Anterior
                  </Button>
                  <span className="font-mono text-muted-foreground">
                    pág. {drillPage} / {drillPageCount}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={drillPage >= drillPageCount}
                    onClick={() => setDrillPage((p) => Math.min(drillPageCount, p + 1))}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
