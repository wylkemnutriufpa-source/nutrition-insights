/**
 * System Diagnostics — Pipelines Audit Tab
 * Shows pipeline execution logs from pipeline_execution_logs.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Cpu, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

const statusStyle: Record<string, { icon: React.ReactNode; cls: string }> = {
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, cls: "bg-emerald-500/10 text-emerald-500" },
  started: { icon: <Clock className="w-3.5 h-3.5 text-blue-400" />, cls: "bg-blue-500/10 text-blue-400" },
  partial: { icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />, cls: "bg-amber-500/10 text-amber-500" },
  failed: { icon: <XCircle className="w-3.5 h-3.5 text-red-500" />, cls: "bg-red-500/10 text-red-500" },
};

export default function PipelinesTab() {
  const [filter, setFilter] = useState<string>("all");

  const { data: pipelines = [], isLoading, refetch } = useQuery({
    queryKey: ["obs-pipelines", filter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("pipeline_execution_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("execution_status", filter);
      const { data } = await q;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  // Stats
  const totalRuns = pipelines.length;
  const avgDuration = totalRuns > 0
    ? Math.round(pipelines.reduce((s: number, p: any) => s + (p.duration_ms || 0), 0) / totalRuns)
    : 0;
  const failCount = pipelines.filter((p: any) => p.execution_status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
            <p className="text-[10px] text-muted-foreground">Execuções</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{avgDuration}ms</p>
            <p className="text-[10px] text-muted-foreground">Duração Média</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{failCount}</p>
            <p className="text-[10px] text-muted-foreground">Falhas</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">
              {totalRuns > 0 ? Math.round(((totalRuns - failCount) / totalRuns) * 100) : 100}%
            </p>
            <p className="text-[10px] text-muted-foreground">Taxa de Sucesso</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" /> Execuções de Pipeline
            </CardTitle>
            <div className="flex gap-1.5 items-center">
              {["all", "completed", "started", "partial", "failed"].map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={filter === s ? "default" : "outline"}
                  className="text-[10px] h-6 px-2"
                  onClick={() => setFilter(s)}
                >
                  {s === "all" ? "Todos" : s}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-6 px-2">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : pipelines.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma execução encontrada</div>
            ) : (
              <div className="divide-y divide-border">
                {pipelines.map((p: any) => {
                  const st = statusStyle[p.execution_status] || statusStyle.started;
                  return (
                    <div key={p.id} className="p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {st.icon}
                          <span className="text-xs font-mono font-medium truncate">{p.pipeline_name}</span>
                          <Badge className={`text-[10px] ${st.cls}`} variant="outline">{p.execution_status}</Badge>
                          {p.engine_version && (
                            <span className="text-[10px] text-muted-foreground">v{p.engine_version}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(p.started_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        {p.duration_ms != null && <span>⏱ {p.duration_ms}ms</span>}
                        {p.patients_processed > 0 && <span>👥 {p.patients_processed} pacientes</span>}
                        {p.errors_count > 0 && <span className="text-red-400">❌ {p.errors_count} erro(s)</span>}
                        {p.warnings_count > 0 && <span className="text-amber-400">⚠ {p.warnings_count} aviso(s)</span>}
                        <span className="text-muted-foreground/60">by: {p.triggered_by}</span>
                      </div>
                      {p.error_details && Array.isArray(p.error_details) && p.error_details.length > 0 && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-muted-foreground cursor-pointer">Detalhes</summary>
                          <pre className="text-[9px] bg-background/50 p-2 rounded mt-1 overflow-x-auto max-h-24">
                            {JSON.stringify(p.error_details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
