/**
 * FitJourney — Simulations Tab v2.0
 * Cost-controlled simulator with kill switch, admin gates, and impact badges.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  runSimulation, getModeSummary, isSimulatorEnabled, toggleKillSwitch,
  type SimMode, type SimulationRunResult,
} from "@/lib/simulator/simulationEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play, Zap, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, FlaskConical, BarChart3, Shield,
  ShieldOff, Eye, Database, Lock
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

function impactBadge(level: "low" | "medium" | "high") {
  const config = {
    low: { label: "Baixo impacto", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    medium: { label: "Impacto moderado", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    high: { label: "Alto impacto", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  };
  const c = config[level];
  return <Badge variant="outline" className={cn("text-[10px]", c.className)}>{c.label}</Badge>;
}

function costBadge(cost: string) {
  if (cost === "low_cost") return <Badge variant="outline" className="text-[9px] bg-emerald-500/5 text-emerald-400">low</Badge>;
  if (cost === "medium_cost") return <Badge variant="outline" className="text-[9px] bg-amber-500/5 text-amber-400">med</Badge>;
  return <Badge variant="outline" className="text-[9px] bg-red-500/5 text-red-400">high</Badge>;
}

export default function SimulationsTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [activeResult, setActiveResult] = useState<SimulationRunResult | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [killSwitchState, setKillSwitchState] = useState(true);
  const [togglingKS, setTogglingKS] = useState(false);

  const smokeSummary = getModeSummary("smoke_test");
  const fullSummary = getModeSummary("manual");

  // Load kill switch state
  useEffect(() => {
    isSimulatorEnabled().then(setKillSwitchState);
  }, []);

  // Recent runs
  const { data: recentRuns, refetch } = useQuery({
    queryKey: ["simulation-runs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("simulation_runs").select("*")
        .order("created_at", { ascending: false }).limit(15);
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
        .from("simulation_scenario_results").select("*")
        .eq("run_id", selectedRunId).order("created_at", { ascending: true });
      return data ?? [];
    },
    enabled: !!selectedRunId,
  });

  const handleToggleKillSwitch = async () => {
    if (!isAdmin) { toast.error("Apenas administradores podem controlar o kill switch."); return; }
    setTogglingKS(true);
    try {
      const newState = !killSwitchState;
      await toggleKillSwitch(newState);
      setKillSwitchState(newState);
      toast.success(newState ? "Simulador ativado" : "Simulador desativado (kill switch)");
    } catch (err: any) {
      toast.error("Erro ao alterar kill switch: " + err.message);
    } finally {
      setTogglingKS(false);
    }
  };

  const handleRun = async (mode: SimMode) => {
    if (!killSwitchState) { toast.error("Simulador desativado pelo administrador."); return; }
    if (mode === "manual" && !isAdmin) { toast.error("Apenas administradores podem rodar a bateria completa."); return; }

    // Confirmation for full battery
    if (mode === "manual") {
      const confirmed = window.confirm(
        `Bateria Completa: ${fullSummary.count} cenários, ~${fullSummary.totalQueries} queries estimadas.\nImpacto: ${fullSummary.impactLevel}. Limite: 1/dia.\n\nDeseja continuar?`
      );
      if (!confirmed) return;
    }

    setRunning(true);
    setActiveResult(null);
    toast.info(`Iniciando ${mode === "smoke_test" ? "Smoke Test" : "Bateria Completa"}...`);

    try {
      const result = await runSimulation(mode);
      setActiveResult(result);

      if (result.errors.length > 0 && result.runId === null && result.totalScenarios === 0) {
        toast.error(result.errors[0]);
      } else if (result.failed > 0) {
        toast.warning(`${result.passed}/${result.totalScenarios} OK, ${result.failed} falha(s)`);
      } else {
        toast.success(`${result.passed}/${result.totalScenarios} cenários OK ✅`);
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
      {/* Kill Switch */}
      {isAdmin && (
        <Card className="glass border-border">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {killSwitchState ? (
                <Shield className="w-5 h-5 text-emerald-500" />
              ) : (
                <ShieldOff className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">Kill Switch do Simulador</p>
                <p className="text-[10px] text-muted-foreground">
                  {killSwitchState ? "Simulador ativo — execuções permitidas" : "Simulador DESATIVADO — todas as execuções bloqueadas"}
                </p>
              </div>
            </div>
            <Switch
              checked={killSwitchState}
              onCheckedChange={handleToggleKillSwitch}
              disabled={togglingKS}
            />
          </CardContent>
        </Card>
      )}

      {/* Disabled banner */}
      {!killSwitchState && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
          <ShieldOff className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-400">Smoke Test temporariamente desativado pelo administrador</p>
          <p className="text-xs text-muted-foreground mt-1">Todas as execuções estão bloqueadas até reativação.</p>
        </div>
      )}

      {/* Controls */}
      <Card className="glass border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Simulador Automático de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mode summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Smoke Test Card */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" /> Smoke Test
                </span>
                {impactBadge(smokeSummary.impactLevel)}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/60 rounded px-2 py-1">
                  <Database className="w-3 h-3 text-emerald-500" />
                  <span className="font-medium text-foreground">{smokeSummary.count}</span> cenários
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/60 rounded px-2 py-1">
                  <BarChart3 className="w-3 h-3 text-emerald-500" />
                  <span className="font-medium text-foreground">~{smokeSummary.totalQueries}</span> queries
                </div>
                <div className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 text-blue-400 rounded px-2 py-1 font-medium">
                  <Eye className="w-3 h-3" /> 100% read-only
                </div>
                <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded px-2 py-1 font-medium">
                  <Shield className="w-3 h-3" /> Sem writes clínicos
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Limite: {smokeSummary.rateLimit}</p>
            </div>

            {/* Full Battery Card */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-amber-500" /> Bateria Completa
                </span>
                <div className="flex items-center gap-1.5">
                  {impactBadge(fullSummary.impactLevel)}
                  <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/20">
                    <Lock className="w-2.5 h-2.5 mr-0.5" /> Admin-only
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/60 rounded px-2 py-1">
                  <Database className="w-3 h-3 text-amber-500" />
                  <span className="font-medium text-foreground">{fullSummary.count}</span> cenários
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/60 rounded px-2 py-1">
                  <BarChart3 className="w-3 h-3 text-amber-500" />
                  <span className="font-medium text-foreground">~{fullSummary.totalQueries}</span> queries
                </div>
                {fullSummary.allReadOnly && (
                  <div className="flex items-center gap-1.5 text-[10px] bg-blue-500/10 text-blue-400 rounded px-2 py-1 font-medium">
                    <Eye className="w-3 h-3" /> 100% read-only
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded px-2 py-1 font-medium">
                  <Shield className="w-3 h-3" /> Sem writes clínicos
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Limite: {fullSummary.rateLimit} • Requer admin</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => handleRun("smoke_test")}
              disabled={running || !killSwitchState}
              className="gap-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Smoke Test
              <Badge variant="outline" className="text-[10px] ml-1">~{smokeSummary.count} cenários</Badge>
            </Button>
            <Button
              onClick={() => handleRun("manual")}
              disabled={running || !killSwitchState || !isAdmin}
              className="gap-2"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Bateria Completa
              {!isAdmin && <Lock className="w-3.5 h-3.5 ml-1" />}
              <Badge variant="outline" className="text-[10px] ml-1">~{fullSummary.count} cenários</Badge>
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
                  {impactBadge(activeResult.impactLevel)}
                  {activeResult.allReadOnly && (
                    <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-400 border-blue-500/20">
                      <Eye className="w-3 h-3 mr-1" />read-only
                    </Badge>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activeResult.durationMs}ms</span>
                  <span>~{activeResult.totalEstimatedQueries} queries</span>
                  <span className="text-emerald-500">{activeResult.passed} ok</span>
                  <span className="text-red-500">{activeResult.failed} falha(s)</span>
                </div>
              </div>

              <Progress value={(activeResult.passed / Math.max(activeResult.totalScenarios, 1)) * 100} className="h-2" />

              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1">
                  {activeResult.scenarios.map((s, i) => (
                    <div key={i} className={cn("flex items-center gap-2 py-1.5 px-2 rounded text-xs",
                      s.status === "failed" ? "bg-red-500/5" : "bg-emerald-500/5")}>
                      {s.status === "passed" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[9px] shrink-0">{s.group}</Badge>
                      {costBadge(s.costLevel)}
                      {s.readOnly && <Eye className="w-3 h-3 text-blue-400 shrink-0" />}
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
                  <button key={run.id} onClick={() => setSelectedRunId(run.id)}
                    className={cn("w-full text-left p-3 rounded-lg border transition-all text-xs",
                      selectedRunId === run.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
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
                    <div key={d.id} className={cn("flex items-start gap-2 py-1.5 px-2 rounded text-xs",
                      d.status === "failed" ? "bg-red-500/5" : "bg-emerald-500/5")}>
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
                        {d.error_message && <p className="text-red-400 mt-0.5 text-[10px]">{d.error_message}</p>}
                        {d.affected_route && <span className="text-muted-foreground text-[10px]">Rota: {d.affected_route}</span>}
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
