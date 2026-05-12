/**
 * System Diagnostics — Production Errors Tab
 * Shows real errors from system_error_logs with filters.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Input } from "@v1/components/ui/input";
import { AlertTriangle, XCircle, Info, Search, RefreshCw } from "lucide-react";

const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"] as const;

const severityStyle: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function ErrorsTab() {
  const [severity, setSeverity] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  const { data: errors = [], isLoading, refetch } = useQuery({
    queryKey: ["obs-errors", severity, moduleFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("system_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (severity !== "all") q = q.eq("severity", severity);
      if (moduleFilter.trim()) q = q.ilike("module", `%${moduleFilter.trim()}%`);
      const { data } = await q;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const displayed = searchText
    ? errors.filter((e: any) =>
        e.error_message?.toLowerCase().includes(searchText.toLowerCase()) ||
        e.module?.toLowerCase().includes(searchText.toLowerCase()) ||
        e.user_id?.includes(searchText)
      )
    : errors;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="glass border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            Erros de Produção
            <Badge variant="outline" className="ml-2 text-xs">{displayed.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SEVERITY_OPTIONS.map(s => (
            <Button
              key={s}
              size="sm"
              variant={severity === s ? "default" : "outline"}
              className="text-xs h-7 px-2.5"
              onClick={() => setSeverity(s)}
            >
              {s === "all" ? "Todos" : s}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar mensagem, módulo ou user_id..."
              className="pl-8 h-8 text-xs"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <Input
            placeholder="Filtrar módulo..."
            className="h-8 text-xs w-40"
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
          ) : displayed.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhum erro encontrado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {displayed.map((err: any) => (
                <div key={err.id} className="p-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`text-[10px] ${severityStyle[err.severity] || severityStyle.medium}`} variant="outline">
                          {err.severity}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">{err.module}</span>
                        {err.auto_recovered && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">recovered</Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground line-clamp-2">{err.error_message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                        {err.page_route && <span>📍 {err.page_route}</span>}
                        {err.user_id && <span>👤 {err.user_id.slice(0, 8)}…</span>}
                        {err.action_attempted && <span>🎯 {err.action_attempted}</span>}
                      </div>
                      {err.stack_trace && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                            Stack trace
                          </summary>
                          <pre className="text-[9px] text-muted-foreground bg-background/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                            {err.stack_trace}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(err.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
