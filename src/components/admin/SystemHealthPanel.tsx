/**
 * FitJourney — System Health Panel
 * Shows system health score, recent errors, performance, and silent failures.
 * Only visible to admin/professional users.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemHealth } from "@/lib/observability/useSystemHealth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertTriangle, Bug, Eye, Gauge, Shield, Zap } from "lucide-react";

function HealthIndicator({ score, status }: { score: number; status: string }) {
  const color = status === "healthy" ? "text-green-500" : status === "attention" ? "text-yellow-500" : "text-red-500";
  const bg = status === "healthy" ? "bg-green-500/10" : status === "attention" ? "bg-yellow-500/10" : "bg-red-500/10";
  const emoji = status === "healthy" ? "🟢" : status === "attention" ? "🟡" : "🔴";

  return (
    <div className={`flex items-center gap-4 p-6 rounded-xl ${bg}`}>
      <div className="text-4xl font-bold tabular-nums">{score}</div>
      <div>
        <div className={`text-lg font-semibold ${color}`}>
          {emoji} {status === "healthy" ? "Sistema Saudável" : status === "attention" ? "Atenção Operacional" : "Risco Operacional"}
        </div>
        <div className="text-sm text-muted-foreground">Health Score (0–100)</div>
      </div>
    </div>
  );
}

function RecentErrors() {
  const { data: errors } = useQuery({
    queryKey: ["system-errors-recent"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const severityColor: Record<string, string> = {
    critical: "destructive",
    high: "destructive",
    medium: "secondary",
    low: "outline",
  };

  return (
    <div className="space-y-2">
      {(!errors || errors.length === 0) && (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum erro recente 🎉</p>
      )}
      {errors?.map((err: any) => (
        <div key={err.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <Bug className="h-4 w-4 mt-1 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={severityColor[err.severity] as any ?? "secondary"} className="text-xs">
                {err.severity}
              </Badge>
              <span className="text-xs text-muted-foreground">{err.module}</span>
              {err.auto_recovered && <Badge variant="outline" className="text-xs">auto-recovered</Badge>}
            </div>
            <p className="text-sm mt-1 truncate">{err.error_message}</p>
            <p className="text-xs text-muted-foreground">{new Date(err.created_at).toLocaleString("pt-BR")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerfOverview() {
  const { data: perf } = useQuery({
    queryKey: ["system-perf-overview"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_performance_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  // Aggregate by flow_name
  type FlowStat = { total: number; count: number; failures: number };
  const flowStats = (perf ?? []).reduce((acc: Record<string, FlowStat>, entry: any) => {
    if (!acc[entry.flow_name]) acc[entry.flow_name] = { total: 0, count: 0, failures: 0 };
    acc[entry.flow_name].total += entry.execution_time_ms;
    acc[entry.flow_name].count++;
    if (!entry.success) acc[entry.flow_name].failures++;
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.keys(flowStats).length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Sem dados de performance ainda</p>
      )}
      {Object.entries(flowStats).map(([flow, stats]: [string, FlowStat]) => {
        const avg = Math.round(stats.total / stats.count);
        const isSlowQuery = avg > 2000;
        return (
          <div key={flow} className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${isSlowQuery ? "text-yellow-500" : "text-green-500"}`} />
              <span className="text-sm font-medium">{flow}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="tabular-nums">{avg}ms avg</span>
              <span className="text-muted-foreground">{stats.count}x</span>
              {stats.failures > 0 && (
                <Badge variant="destructive" className="text-xs">{stats.failures} falhas</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SilentFailures() {
  const { data: failures } = useQuery({
    queryKey: ["silent-failures-recent"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("silent_failures_monitor")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-2">
      {(!failures || failures.length === 0) && (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma falha silenciosa detectada ✅</p>
      )}
      {failures?.map((f: any) => (
        <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
          <Eye className="h-4 w-4 mt-1 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{f.entity_type}</Badge>
              <Badge variant="outline" className="text-xs">{f.severity}</Badge>
            </div>
            <p className="text-sm mt-1">{f.expected_action}</p>
            <p className="text-xs text-muted-foreground">{f.failure_reason} — {f.days_since_expected}d atrás</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SystemHealthPanel() {
  const { data: health, isLoading } = useSystemHealth();
  const [debugMode, setDebugMode] = useState(false);

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Saúde do Sistema
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setDebugMode(!debugMode)}>
            {debugMode ? "Modo Normal" : "Modo Debug"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-20 animate-pulse bg-muted rounded-xl" />
          ) : health ? (
            <>
              <HealthIndicator score={health.health_score} status={health.status} />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold tabular-nums">{health.recent_critical_errors}</div>
                  <div className="text-xs text-muted-foreground">Erros Críticos (24h)</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold tabular-nums">{health.avg_response_ms}ms</div>
                  <div className="text-xs text-muted-foreground">Tempo Médio</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold tabular-nums">{health.unresolved_silent_failures}</div>
                  <div className="text-xs text-muted-foreground">Falhas Silenciosas</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Dados indisponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Detailed tabs */}
      {debugMode && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="errors">
              <TabsList className="w-full">
                <TabsTrigger value="errors" className="flex-1 gap-1">
                  <AlertTriangle className="h-3 w-3" /> Erros
                </TabsTrigger>
                <TabsTrigger value="perf" className="flex-1 gap-1">
                  <Gauge className="h-3 w-3" /> Performance
                </TabsTrigger>
                <TabsTrigger value="silent" className="flex-1 gap-1">
                  <Activity className="h-3 w-3" /> Silenciosas
                </TabsTrigger>
              </TabsList>
              <TabsContent value="errors"><RecentErrors /></TabsContent>
              <TabsContent value="perf"><PerfOverview /></TabsContent>
              <TabsContent value="silent"><SilentFailures /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
