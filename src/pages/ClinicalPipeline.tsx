import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Play, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
  Activity, Zap, BarChart3, Brain, Shield, ArrowRight
} from "lucide-react";

const PIPELINE_STEPS = [
  { order: 1, name: "Seed Daily Checklist", icon: "📋", category: "Ingestão" },
  { order: 2, name: "Detect Adherence Patterns", icon: "📊", category: "Computação" },
  { order: 3, name: "Detect Patient Signals", icon: "📡", category: "Computação" },
  { order: 4, name: "Detect Clinical Alerts", icon: "🚨", category: "Alertas" },
  { order: 5, name: "Clinical Rule Engine", icon: "⚙️", category: "Regras" },
  { order: 6, name: "Compute Behavioral Dropout Risk", icon: "⚠️", category: "Risco" },
  { order: 7, name: "Compute Therapeutic Adjustments", icon: "💊", category: "Ajustes" },
  { order: 8, name: "Compute Weight Trajectory", icon: "📈", category: "Projeção" },
  { order: 9, name: "Compute Metabolic Twin", icon: "🧬", category: "Twin" },
];

const WEEKLY_STEPS = [
  { order: 10, name: "Population Nutrition Intelligence", icon: "🌍", category: "Populacional" },
  { order: 11, name: "Global Adaptive Intelligence", icon: "🧠", category: "Calibração" },
];

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    completed: { variant: "default", label: "Concluído" },
    completed_with_errors: { variant: "destructive", label: "Com Erros" },
    running: { variant: "secondary", label: "Executando..." },
    pending: { variant: "outline", label: "Pendente" },
    failed: { variant: "destructive", label: "Falhou" },
    error: { variant: "destructive", label: "Erro" },
  };
  const s = map[status] || { variant: "outline" as const, label: status };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

export default function ClinicalPipeline() {
  const queryClient = useQueryClient();
  const [includeWeekly, setIncludeWeekly] = useState(false);

  const { data: runs, isLoading } = useQuery({
    queryKey: ["pipeline-runs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: latestSteps } = useQuery({
    queryKey: ["pipeline-steps", runs?.[0]?.id],
    queryFn: async () => {
      if (!runs?.[0]?.id) return [];
      const { data } = await supabase
        .from("pipeline_step_results")
        .select("*")
        .eq("run_id", runs[0].id)
        .order("step_order", { ascending: true });
      return data || [];
    },
    enabled: !!runs?.[0]?.id,
  });

  const executePipeline = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("clinical-pipeline-orchestrator", {
        body: {
          run_type: includeWeekly ? "full" : "daily",
          triggered_by: "manual",
          include_weekly: includeWeekly,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Pipeline concluído em ${formatDuration(data.duration_ms)}`, {
        description: `${data.steps_completed} etapas OK, ${data.steps_failed} falhas`,
      });
      queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao executar pipeline", { description: err.message });
    },
  });

  const dryRun = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("clinical-pipeline-orchestrator", {
        body: { run_type: "dry_run", triggered_by: "manual_dry_run", dry_run: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Dry run concluído — nenhuma função foi executada");
      queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
    },
    onError: (err: any) => toast.error("Erro no dry run", { description: err.message }),
  });

  const latestRun = runs?.[0];
  const isRunning = latestRun?.status === "running" || executePipeline.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Clinical Processing Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Orquestrador central — executa todos os motores na sequência correta
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => dryRun.mutate()} disabled={isRunning}>
              <Shield className="h-4 w-4 mr-2" />
              Dry Run
            </Button>
            <Button onClick={() => executePipeline.mutate()} disabled={isRunning}>
              {isRunning ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isRunning ? "Executando..." : "Executar Pipeline"}
            </Button>
          </div>
        </div>

        {/* Pipeline Flow Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Sequência de Processamento Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              {PIPELINE_STEPS.map((step, i) => {
                const stepResult = latestSteps?.find((s: any) => s.step_order === step.order);
                const bgClass = stepResult?.status === "completed"
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                  : stepResult?.status === "failed" || stepResult?.status === "error"
                  ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                  : stepResult?.status === "running"
                  ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 animate-pulse"
                  : "bg-muted/30 border-border";

                return (
                  <div key={step.order} className="flex items-center gap-2">
                    <div className={`rounded-lg border p-3 text-center min-w-[120px] ${bgClass}`}>
                      <div className="text-xl mb-1">{step.icon}</div>
                      <div className="text-xs font-medium leading-tight">{step.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{step.category}</div>
                      {stepResult && (
                        <div className="text-[10px] mt-1 font-mono">
                          {formatDuration(stepResult.duration_ms)}
                        </div>
                      )}
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Ciclo Semanal</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIncludeWeekly(!includeWeekly)}
                className={includeWeekly ? "border-primary text-primary" : ""}
              >
                {includeWeekly ? "Incluído ✓" : "Incluir"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 opacity-80">
              {WEEKLY_STEPS.map((step, i) => {
                const stepResult = latestSteps?.find((s: any) => s.step_order === step.order);
                const bgClass = stepResult?.status === "completed"
                  ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                  : "bg-muted/20 border-dashed border-border";
                return (
                  <div key={step.order} className="flex items-center gap-2">
                    <div className={`rounded-lg border p-3 text-center min-w-[140px] ${bgClass}`}>
                      <div className="text-xl mb-1">{step.icon}</div>
                      <div className="text-xs font-medium">{step.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{step.category}</div>
                    </div>
                    {i < WEEKLY_STEPS.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Latest Run Details */}
        {latestRun && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Última Execução
                </span>
                {statusBadge(latestRun.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatDuration(latestRun.duration_ms)}</div>
                  <div className="text-xs text-muted-foreground">Duração</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{latestRun.total_patients_processed || 0}</div>
                  <div className="text-xs text-muted-foreground">Pacientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(latestRun.steps_completed as any[])?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Etapas OK</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(latestRun.steps_failed as any[])?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Falhas</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-mono">{latestRun.triggered_by}</div>
                  <div className="text-xs text-muted-foreground">Trigger</div>
                </div>
              </div>

              {latestSteps && latestSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Detalhes por Etapa</h4>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Etapa</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2 text-right">Duração</th>
                          <th className="p-2 text-right">Pacientes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestSteps.map((step: any) => (
                          <tr key={step.id} className="border-b last:border-0">
                            <td className="p-2 font-mono text-muted-foreground">{step.step_order}</td>
                            <td className="p-2 font-medium">{step.step_name}</td>
                            <td className="p-2 text-center">
                              {step.status === "completed" && <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />}
                              {step.status === "failed" && <XCircle className="h-4 w-4 text-red-600 mx-auto" />}
                              {step.status === "error" && <AlertTriangle className="h-4 w-4 text-amber-600 mx-auto" />}
                              {step.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground mx-auto" />}
                            </td>
                            <td className="p-2 text-right font-mono text-xs">{formatDuration(step.duration_ms)}</td>
                            <td className="p-2 text-right">{step.patients_processed || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Run History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : runs && runs.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-right">Duração</th>
                      <th className="p-2 text-right">Pacientes</th>
                      <th className="p-2 text-left">Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run: any) => (
                      <tr key={run.id} className="border-b last:border-0">
                        <td className="p-2 font-mono text-xs">
                          {new Date(run.started_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="p-2">{run.run_type}</td>
                        <td className="p-2 text-center">{statusBadge(run.status)}</td>
                        <td className="p-2 text-right font-mono text-xs">{formatDuration(run.duration_ms)}</td>
                        <td className="p-2 text-right">{run.total_patients_processed || 0}</td>
                        <td className="p-2 text-xs text-muted-foreground">{run.triggered_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma execução registrada</p>
                <p className="text-xs mt-1">Execute o pipeline para começar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
