/**
 * System Diagnostics — Performance Tab
 * Shows performance logs from system_performance_logs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Gauge, RefreshCw, TrendingUp, Zap, AlertTriangle } from "lucide-react";

export default function PerformanceTab() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["obs-performance"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_performance_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  // Aggregate stats
  const totalLogs = logs.length;
  const avgTime = totalLogs > 0
    ? Math.round(logs.reduce((s: number, l: any) => s + (l.execution_time_ms || 0), 0) / totalLogs)
    : 0;
  const slowQueries = logs.filter((l: any) => (l.execution_time_ms || 0) > 2000).length;
  const failedFlows = logs.filter((l: any) => !l.success).length;

  // Top slowest flows
  const flowMap = new Map<string, { total: number; count: number }>();
  logs.forEach((l: any) => {
    const existing = flowMap.get(l.flow_name) || { total: 0, count: 0 };
    flowMap.set(l.flow_name, { total: existing.total + (l.execution_time_ms || 0), count: existing.count + 1 });
  });
  const topFlows = Array.from(flowMap.entries())
    .map(([name, v]) => ({ name, avg: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalLogs}</p>
            <p className="text-[10px] text-muted-foreground">Medições</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{avgTime}ms</p>
            <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${slowQueries > 0 ? "text-amber-500" : "text-emerald-500"}`}>{slowQueries}</p>
            <p className="text-[10px] text-muted-foreground">Lentos (&gt;2s)</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${failedFlows > 0 ? "text-red-500" : "text-emerald-500"}`}>{failedFlows}</p>
            <p className="text-[10px] text-muted-foreground">Falhas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Slowest Flows */}
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Fluxos Mais Lentos (Média)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFlows.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {topFlows.map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-mono truncate">{f.name}</span>
                      <Badge variant="outline" className="text-[10px]">{f.count}x</Badge>
                    </div>
                    <span className={`font-mono font-medium ${f.avg > 2000 ? "text-red-400" : f.avg > 1000 ? "text-amber-400" : "text-emerald-400"}`}>
                      {f.avg}ms
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="glass border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Logs Recentes
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-6 px-2">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <div className="divide-y divide-border">
                  {logs.slice(0, 50).map((l: any) => (
                    <div key={l.id} className="p-2.5 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono truncate">{l.flow_name}</span>
                        <div className="flex items-center gap-2">
                          {!l.success && <AlertTriangle className="w-3 h-3 text-red-400" />}
                          <span className={`text-xs font-mono ${
                            (l.execution_time_ms || 0) > 2000 ? "text-red-400" :
                            (l.execution_time_ms || 0) > 1000 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {l.execution_time_ms}ms
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        {l.user_role && <span>Role: {l.user_role}</span>}
                        {l.queries_count > 0 && <span>Queries: {l.queries_count}</span>}
                        {l.api_calls_count > 0 && <span>APIs: {l.api_calls_count}</span>}
                        <span>{new Date(l.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
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
