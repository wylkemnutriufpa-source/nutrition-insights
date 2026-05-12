/**
 * FitJourney — Operational Health Dashboard (Sprint 4)
 * Painel consolidado: alertas, métricas, runbooks, kill switch.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  AlertTriangle, Activity, Shield, Zap, BookOpen, Power,
  CheckCircle, XCircle, Clock, RefreshCw, TrendingUp,
  PlayCircle, Server, Wifi, Database, HardDrive
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RUNBOOKS, type Runbook } from "@/lib/runbooks";
import { toast } from "sonner";

// ========== Alerts Panel ==========
function AlertsPanel() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["system-alerts"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();
  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await (supabase as any)
        .from("system_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
      toast.success("Alerta resolvido");
    },
  });

  // Realtime subscription for new alerts
  const queryClient2 = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("ops-alerts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_alerts" },
        () => {
          queryClient2.invalidateQueries({ queryKey: ["system-alerts"] });
          queryClient2.invalidateQueries({ queryKey: ["system-metrics-overview"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient2]);

  const unresolvedCount = alerts.filter((a: any) => !a.is_resolved).length;

  const severityColors: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas Operacionais
          </span>
          {unresolvedCount > 0 && (
            <Badge variant="destructive">{unresolvedCount} ativos</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-primary/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum alerta. Sistema saudável!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map((alert: any) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border ${alert.is_resolved ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={severityColors[alert.severity] || severityColors.medium} variant="secondary">
                        {alert.severity}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {alert.function_name}
                      </span>
                      {alert.is_resolved && (
                        <Badge variant="outline" className="text-xs text-primary">Resolvido</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(alert.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!alert.is_resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(alert.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolver
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Kill Switch Panel ==========
function KillSwitchPanel() {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags-admin"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("feature_flags")
        .select("*")
        .order("key");
      return data || [];
    },
  });

  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      await (supabase as any)
        .from("feature_flags")
        .update({ enabled })
        .eq("key", key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags-admin"] });
      toast.success("Flag atualizada");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Power className="h-5 w-5 text-primary" />
          Kill Switch — Controle de Features
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : flags.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma feature flag configurada no banco.</p>
        ) : (
          <div className="space-y-3">
            {flags.map((flag: any) => (
              <div key={flag.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium text-foreground">{flag.key}</p>
                  <p className="text-xs text-muted-foreground">{flag.description}</p>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ key: flag.key, enabled: checked })
                  }
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Runbooks Panel ==========
function RunbooksPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const severityIcons: Record<string, React.ReactNode> = {
    critical: <XCircle className="h-4 w-4 text-destructive" />,
    high: <AlertTriangle className="h-4 w-4 text-orange-400" />,
    medium: <Activity className="h-4 w-4 text-yellow-400" />,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Runbooks Operacionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {RUNBOOKS.map((rb) => (
          <div key={rb.id} className="border rounded-lg">
            <button
              className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(expanded === rb.id ? null : rb.id)}
            >
              <div className="flex items-center gap-2">
                {severityIcons[rb.severity]}
                <span className="text-sm font-medium text-foreground">{rb.title}</span>
              </div>
              <Badge variant="outline" className="text-xs">{rb.severity}</Badge>
            </button>
            {expanded === rb.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-3 pb-3 space-y-3"
              >
                <RunbookSection title="🔍 Sintomas" items={rb.symptoms} />
                <RunbookSection title="🩺 Diagnóstico" items={rb.diagnosis} />
                <RunbookSection title="⚡ Ação Imediata" items={rb.immediateAction} />
                <RunbookSection title="🔧 Ação Definitiva" items={rb.definitiveAction} />
                <RunbookSection title="🛡️ Prevenção" items={rb.preventiveMeasures} />
              </motion.div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RunbookSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
            <span className="text-muted-foreground mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ========== Metrics Panel ==========
function MetricsPanel() {
  const { data: metrics } = useQuery({
    queryKey: ["system-metrics-overview"],
    queryFn: async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [errors1h, errors24h, alerts, rateLimits] = await Promise.all([
        (supabase as any).from("system_error_logs").select("*", { count: "exact", head: true }).gte("created_at", oneHourAgo),
        (supabase as any).from("system_error_logs").select("*", { count: "exact", head: true }).gte("created_at", oneDayAgo),
        (supabase as any).from("system_alerts").select("*", { count: "exact", head: true }).eq("is_resolved", false),
        (supabase as any).from("security_events").select("*", { count: "exact", head: true }).eq("event_type", "rate_limit_exceeded").gte("created_at", oneDayAgo),
      ]);

      return {
        errors1h: errors1h.count ?? 0,
        errors24h: errors24h.count ?? 0,
        activeAlerts: alerts.count ?? 0,
        rateLimits24h: rateLimits.count ?? 0,
      };
    },
    refetchInterval: 60000,
  });

  const cards = [
    { label: "Erros (1h)", value: metrics?.errors1h ?? 0, icon: AlertTriangle, color: (metrics?.errors1h ?? 0) > 10 ? "text-destructive" : "text-primary" },
    { label: "Erros (24h)", value: metrics?.errors24h ?? 0, icon: TrendingUp, color: (metrics?.errors24h ?? 0) > 50 ? "text-destructive" : "text-foreground" },
    { label: "Alertas Ativos", value: metrics?.activeAlerts ?? 0, icon: Zap, color: (metrics?.activeAlerts ?? 0) > 0 ? "text-destructive" : "text-primary" },
    { label: "Rate Limits (24h)", value: metrics?.rateLimits24h ?? 0, icon: Shield, color: (metrics?.rateLimits24h ?? 0) > 5 ? "text-destructive" : "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 text-center">
            <card.icon className={`h-5 w-5 mx-auto mb-1 ${card.color}`} />
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ========== DR Simulation Panel ==========
function DRSimulationPanel() {
  const [results, setResults] = useState<Array<{
    scenario: string;
    status: "pending" | "running" | "ok" | "failed";
    timeMs?: number;
    detail?: string;
  }>>([]);
  const [running, setRunning] = useState(false);

  const scenarios = [
    {
      name: "Edge Function — Resposta",
      icon: Server,
      test: async () => {
        const start = Date.now();
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/system-monitor`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ source: "dr-test" }),
            }
          );
          const elapsed = Date.now() - start;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return { status: "ok" as const, timeMs: elapsed, detail: `Respondeu em ${elapsed}ms` };
        } catch (e: any) {
          return { status: "failed" as const, timeMs: Date.now() - start, detail: e.message };
        }
      },
    },
    {
      name: "Realtime — Canal de Teste",
      icon: Wifi,
      test: async () => {
        const start = Date.now();
        return new Promise<{ status: "ok" | "failed"; timeMs: number; detail: string }>((resolve) => {
          const timeout = setTimeout(() => {
            supabase.removeChannel(ch);
            resolve({ status: "failed", timeMs: Date.now() - start, detail: "Timeout (5s)" });
          }, 5000);

          const ch = supabase
            .channel("dr-test-" + Date.now())
            .on("presence", { event: "sync" }, () => {
              clearTimeout(timeout);
              supabase.removeChannel(ch);
              resolve({ status: "ok", timeMs: Date.now() - start, detail: "Canal conectado" });
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                clearTimeout(timeout);
                supabase.removeChannel(ch);
                resolve({ status: "ok", timeMs: Date.now() - start, detail: "Subscription OK" });
              }
            });
        });
      },
    },
    {
      name: "Database — Query Crítica",
      icon: Database,
      test: async () => {
        const start = Date.now();
        try {
          const { error } = await (supabase as any)
            .from("profiles")
            .select("id", { count: "exact", head: true });
          const elapsed = Date.now() - start;
          if (error) throw error;
          return { status: "ok" as const, timeMs: elapsed, detail: `Query em ${elapsed}ms` };
        } catch (e: any) {
          return { status: "failed" as const, timeMs: Date.now() - start, detail: e.message };
        }
      },
    },
    {
      name: "Storage — Acesso a Bucket",
      icon: HardDrive,
      test: async () => {
        const start = Date.now();
        try {
          const { error } = await supabase.storage.from("avatars").list("", { limit: 1 });
          const elapsed = Date.now() - start;
          if (error) throw error;
          return { status: "ok" as const, timeMs: elapsed, detail: `Storage em ${elapsed}ms` };
        } catch (e: any) {
          return { status: "failed" as const, timeMs: Date.now() - start, detail: e.message };
        }
      },
    },
    {
      name: "Auth — Sessão Ativa",
      icon: Shield,
      test: async () => {
        const start = Date.now();
        try {
          const { data, error } = await supabase.auth.getSession();
          const elapsed = Date.now() - start;
          if (error) throw error;
          const hasSession = !!data?.session;
          return {
            status: "ok" as const,
            timeMs: elapsed,
            detail: hasSession ? `Sessão válida (${elapsed}ms)` : `Sem sessão ativa (${elapsed}ms)`,
          };
        } catch (e: any) {
          return { status: "failed" as const, timeMs: Date.now() - start, detail: e.message };
        }
      },
    },
  ];

  const runAll = async () => {
    setRunning(true);
    const newResults = scenarios.map((s) => ({
      scenario: s.name,
      status: "pending" as const,
    }));
    setResults(newResults);

    for (let i = 0; i < scenarios.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "running" as const } : r))
      );
      const result = await scenarios[i].test();
      setResults((prev) =>
        prev.map((r, idx) =>
          idx === i ? { scenario: r.scenario, ...result } : r
        )
      );
    }
    setRunning(false);
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "ok": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      case "running": return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const allPassed = results.length > 0 && results.every((r) => r.status === "ok");
  const totalTime = results.reduce((sum, r) => sum + (r.timeMs ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            DR Simulation — Teste de Recuperação
          </span>
          <Button size="sm" onClick={runAll} disabled={running}>
            <PlayCircle className="h-4 w-4 mr-1" />
            {running ? "Executando..." : "Executar DR"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-primary/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Clique "Executar DR" para simular falhas e validar recuperação
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r, i) => {
              const ScenarioIcon = scenarios[i]?.icon || Server;
              return (
                <motion.div
                  key={r.scenario}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(r.status)}
                    <ScenarioIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.scenario}</p>
                      {r.detail && (
                        <p className="text-xs text-muted-foreground">{r.detail}</p>
                      )}
                    </div>
                  </div>
                  {r.timeMs !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {r.timeMs}ms
                    </Badge>
                  )}
                </motion.div>
              );
            })}

            {!running && results.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg border-2 text-center ${
                allPassed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-destructive/30 bg-destructive/5"
              }`}>
                {allPassed ? (
                  <>
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      ✅ Todos os cenários passaram — Tempo total: {totalTime}ms
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sistema recuperável e operacional
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      ⚠️ {results.filter((r) => r.status === "failed").length} cenário(s) falharam
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verifique os runbooks para ações corretivas
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Monitor Status Panel ==========
function MonitorStatusPanel() {
  const { data: lastRuns = [] } = useQuery({
    queryKey: ["monitor-last-runs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_diagnostic_logs")
        .select("*")
        .eq("test_type", "system-monitor")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 60000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Monitor Automático — Últimas Execuções
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lastRuns.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhuma execução do monitor ainda. O cron roda a cada 5 minutos.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lastRuns.map((run: any) => (
              <div key={run.id} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  {run.critical_count === 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-xs text-foreground">
                    Score: {run.health_score}/100
                  </span>
                  <span className="text-xs text-muted-foreground">
                    OK: {run.ok_count} | Warn: {run.warning_count} | Crit: {run.critical_count}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== Main Dashboard ==========
export default function OperationalDashboard() {
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Centro de Operações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento, alertas, controle e runbooks
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["system-alerts"] });
            queryClient.invalidateQueries({ queryKey: ["system-metrics-overview"] });
            toast.success("Dados atualizados");
          }}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      <MetricsPanel />

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="dr">DR Test</TabsTrigger>
          <TabsTrigger value="killswitch">Kill Switch</TabsTrigger>
          <TabsTrigger value="runbooks">Runbooks</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel />
        </TabsContent>

        <TabsContent value="monitor" className="mt-4">
          <MonitorStatusPanel />
        </TabsContent>

        <TabsContent value="dr" className="mt-4">
          <DRSimulationPanel />
        </TabsContent>

        <TabsContent value="killswitch" className="mt-4">
          <KillSwitchPanel />
        </TabsContent>

        <TabsContent value="runbooks" className="mt-4">
          <RunbooksPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
