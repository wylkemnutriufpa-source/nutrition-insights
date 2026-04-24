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
import { getPlanStatusMeta, KNOWN_PLAN_STATUS_KEYS } from "@/lib/planStatusLabels";

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

export default function AdminPlanLoadingDiagnostics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [activeTotal, setActiveTotal] = useState<number>(0);
  const [buckets, setBuckets] = useState<StatusBucket[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch counts em paralelo
    const [allPlansRes, alertsRes] = await Promise.all([
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
      setAlerts((alertsRes.data || []) as AlertRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unknownStatuses = buckets.filter((b) => !KNOWN_PLAN_STATUS_KEYS.includes(b.plan_status));

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
                      const isUnknown = !KNOWN_PLAN_STATUS_KEYS.includes(b.plan_status);
                      return (
                        <tr key={b.plan_status} className="border-t border-border">
                          <td className="py-2">
                            <code className="text-xs">{b.plan_status}</code>
                            {isUnknown && (
                              <Badge variant="outline" className="ml-2 text-[10px] border-rose-500/40 text-rose-500">
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
