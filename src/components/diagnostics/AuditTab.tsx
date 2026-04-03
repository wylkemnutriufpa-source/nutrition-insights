/**
 * System Diagnostics — Plan Audit Tab
 * Shows results from the automated daily audit of active meal plans.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, RefreshCw, AlertTriangle, XCircle, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";

const severityStyle: Record<string, { cls: string; icon: React.ReactNode }> = {
  critical: { cls: "bg-red-500/10 text-red-500", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
  warning: { cls: "bg-amber-500/10 text-amber-500", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
  info: { cls: "bg-blue-500/10 text-blue-400", icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> },
};

const auditTypeLabels: Record<string, string> = {
  active_not_published: "Ativo mas não publicado",
  no_items: "Sem itens",
  missing_nutritionist_binding: "Sem vínculo nutri",
  orphan_draft: "Rascunho órfão",
  macro_inconsistency: "Inconsistência de macros",
};

export default function AuditTab() {
  const [running, setRunning] = useState(false);

  const { data: results = [], isLoading, refetch } = useQuery({
    queryKey: ["plan-audit-results"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("plan_audit_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    refetchInterval: 60000,
  });

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-active-plans");
      if (error) throw error;
      toast.success(`Auditoria concluída: ${data?.issues_found ?? 0} problemas encontrados`);
      refetch();
    } catch (err: any) {
      toast.error("Erro ao executar auditoria: " + (err?.message || String(err)));
    } finally {
      setRunning(false);
    }
  };

  // Stats
  const critical = results.filter((r: any) => r.severity === "critical").length;
  const warning = results.filter((r: any) => r.severity === "warning").length;
  const lastRun = results[0]?.created_at
    ? new Date(results[0].created_at).toLocaleString("pt-BR")
    : "Nunca";

  // Group by run
  const runs = [...new Set(results.map((r: any) => r.audit_run_id))];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{critical}</p>
            <p className="text-[10px] text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{warning}</p>
            <p className="text-[10px] text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{runs.length}</p>
            <p className="text-[10px] text-muted-foreground">Execuções</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground">{lastRun}</p>
            <p className="text-[10px] text-muted-foreground">Última Execução</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Auditoria de Planos
            </CardTitle>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={runAudit}
                disabled={running}
              >
                {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {running ? "Executando..." : "Executar Agora"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 px-2">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum resultado de auditoria. Clique em "Executar Agora" para iniciar.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {results.map((r: any) => {
                  const st = severityStyle[r.severity] || severityStyle.info;
                  return (
                    <div key={r.id} className="p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {st.icon}
                          <span className="text-xs font-medium">
                            {auditTypeLabels[r.audit_type] || r.audit_type}
                          </span>
                          <Badge className={`text-[10px] ${st.cls}`} variant="outline">
                            {r.severity}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("pt-BR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                        {r.plan_id && <span className="font-mono truncate max-w-[120px]">📋 {r.plan_id.slice(0, 8)}</span>}
                        {r.patient_id && <span className="font-mono truncate max-w-[120px]">👤 {r.patient_id.slice(0, 8)}</span>}
                        {r.resolved && <span className="text-emerald-400">✅ Resolvido</span>}
                      </div>
                      {r.details && Object.keys(r.details).length > 0 && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-muted-foreground cursor-pointer">Detalhes</summary>
                          <pre className="text-[9px] bg-background/50 p-2 rounded mt-1 overflow-x-auto max-h-24">
                            {JSON.stringify(r.details, null, 2)}
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
