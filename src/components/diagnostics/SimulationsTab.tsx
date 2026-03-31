/**
 * FitJourney — Simulations Tab for System Diagnostics
 * Shows simulation runs, scenarios, and manual trigger buttons.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runSimulation, type SimMode, type SimulationRunResult } from "@/lib/simulator/simulationEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play, Zap, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, FlaskConical, BarChart3
} from "lucide-react";

function statusColor(status: string) {
  if (status === "completed" || status === "passed") return "text-emerald-500";
  if (status === "partial") return "text-amber-500";
  return "text-red-500";
}

function statusBadge(status: string) {
  const variant = status === "completed" || status === "passed" ? "default"
    : status === "partial" ? "secondary" : "destructive";
  return <Badge variant={variant as any} className="text-[10px]">{status}</Badge>;
}

export default function SimulationsTab() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [activeResult, setActiveResult] = useState<SimulationRunResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // Recent runs
  const { data: recentRuns, refetch } = useQuery({
    queryKey: ["simulation-runs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("simulation_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  // Selected run details
  const { data: runDetails } = useQuery({
    queryKey: ["simulation-run-details", selectedRunId],
    queryFn: async () => {
      if (!selectedRunId) return [];
      const { data } = await (supabase as any)
        .from("simulation_scenario_results")
        .select("*")
        .eq("run_id", selectedRunId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!selectedRunId,
  });

  const handleRun = async (mode: SimMode) => {
    setRunning(true);
    setActiveResult(null);
    toast.info(`Iniciando simulação (${mode === "smoke_test" ? "Smoke Test" : "Manual Completo"})...`);

    try {
      const result = await runSimulation(mode);
      setActiveResult(result);

      if (result.errors.length > 0 && result.runId === null && result.totalScenarios === 0) {
        toast.error(result.errors[0]);
      } else if (result.failed > 0) {
        toast.warning(`Simulação concluída: ${result.passed}/${result.totalScenarios} OK, ${result.failed} falha(s)`);
      } else {
        toast.success(`Simulação concluída: ${result.passed}/${result.totalScenarios} cenários OK ✅`);
      }

      if (result.runId) setSelectedRunId(result.runId);
      void refetch();
      queryClient.invalidateQueries({ queryKey: ["system-errors-recent"] });
      queryClient.invalidateQueries({ queryKey: ["system-perf-overview"] });
    } catch (err: any) {
      toast.error("Erro na simulação: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="glass border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Simulador Automático de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Execute cenários controlados para validar fluxos críticos. Máx. 10 execuções/dia.
            Resultados alimentam Erros, Performance e Alertas automaticamente.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleRun("manual")}
              disabled={running}
              className="gap-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Bateria Completa
              <Badge variant="outline" className="text-[10px] ml-1">~17 cenários</Badge>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRun("smoke_test")}
              disabled={running}
              className="gap-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Smoke Test
              <Badge variant="outline" className="text-[10px] ml-1">~6 cenários</Badge>
            </Button>
          </div>

          {/* Live result */}
          {activeResult && (
            <div className="mt-4 p-4 rounded-lg bg-background/50 border border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={cn("text-2xl font-bold", statusColor(activeResult.failed > 0 ? "partial" : "completed"))}>
                    {activeResult.passed}/{activeResult.totalScenarios}
                  </span>
                  {statusBadge(activeResult.failed > 0 ? (activeResult.failed === activeResult.totalScenarios ? "failed" : "partial") : "completed")}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activeResult.durationMs}ms</span>
                  <span className="text-emerald-500">{activeResult.passed} ok</span>
                  <span className="text-red-500">{activeResult.failed} falha(s)</span>
                </div>
              </div>

              <Progress value={(activeResult.passed / Math.max(activeResult.totalScenarios, 1)) * 100} className="h-2" />

              {/* Scenario details */}
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1">
                  {activeResult.scenarios.map((s, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2 rounded text-xs",
                        s.status === "failed" ? "bg-red-500/5" : "bg-emerald-500/5"
                      )}
                    >
                      {s.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[9px] shrink-0">{s.group}</Badge>
                      <span className="flex-1 truncate">{s.name}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0">{s.durationMs}ms</span>
                      {s.error && <span className="text-red-400 truncate max-w-[200px]">{s.error}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {activeResult.warnings.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  {activeResult.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="glass border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Execuções Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {(!recentRuns || recentRuns.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma simulação executada ainda</p>
                )}
                {recentRuns?.map((run: any) => (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRunId(run.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all text-xs",
                      selectedRunId === run.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-lg font-bold", statusColor(run.status))}>
                        {run.scenarios_passed}/{run.scenarios_total}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {statusBadge(run.status)}
                        <Badge variant="outline" className="text-[9px]">{run.mode}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>{run.duration_ms}ms</span>
                      <span className="text-emerald-500">{run.scenarios_passed} ok</span>
                      <span className="text-red-500">{run.scenarios_failed} fail</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(run.created_at).toLocaleString("pt-BR")}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="glass border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" /> Detalhes da Simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] rounded-lg bg-background/50 border border-border p-2">
              {!selectedRunId ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Selecione uma execução para ver os cenários
                </div>
              ) : (!runDetails || runDetails.length === 0) ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Nenhum detalhe disponível
                </div>
              ) : (
                <div className="space-y-1">
                  {runDetails.map((d: any) => (
                    <div
                      key={d.id}
                      className={cn(
                        "flex items-start gap-2 py-1.5 px-2 rounded text-xs",
                        d.status === "failed" ? "bg-red-500/5" : "bg-emerald-500/5"
                      )}
                    >
                      {d.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{d.scenario_group}</Badge>
                          <span className="font-medium">{d.scenario_name}</span>
                          <span className="text-muted-foreground tabular-nums">{d.duration_ms}ms</span>
                        </div>
                        {d.error_message && (
                          <p className="text-red-400 mt-0.5 text-[10px]">{d.error_message}</p>
                        )}
                        {d.affected_route && (
                          <span className="text-muted-foreground text-[10px]">Rota: {d.affected_route}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
