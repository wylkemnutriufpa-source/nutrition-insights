/**
 * System Diagnostics — Alerts Tab
 * Shows system_alerts with resolve capability.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Bell, CheckCircle2, RefreshCw, Shield, XCircle } from "lucide-react";
import { toast } from "sonner";

const alertTypeLabels: Record<string, string> = {
  TENANT_RESOLUTION_FAILED: "Falha Tenant",
  RLS_VIOLATION: "Violação RLS",
  PIPELINE_FAILURE: "Falha Pipeline",
  PLAN_PUBLISH_ERROR: "Erro Publicação",
  PLAN_ACTIVE_NO_ITEMS: "Plano sem Itens",
  ORPHAN_ONBOARDING: "Onboarding Órfão",
  PLAN_STATUS_INCONSISTENCY: "Status Inconsistente",
  NOTIFICATION_FAILED: "Notificação Falha",
};

const severityStyle: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

export default function AlertsTab() {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["obs-alerts", showResolved],
    queryFn: async () => {
      let q = (supabase as any)
        .from("system_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!showResolved) q = q.eq("is_resolved", false);
      const { data } = await q;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const resolveAlert = async (id: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    await (supabase as any)
      .from("system_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq("id", id);
    toast.success("Alerta resolvido");
    queryClient.invalidateQueries({ queryKey: ["obs-alerts"] });
  };

  const unresolvedCount = alerts.filter((a: any) => !a.is_resolved).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Alertas</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className={`text-2xl font-bold ${unresolvedCount > 0 ? "text-red-500" : "text-emerald-500"}`}>{unresolvedCount}</p>
            <p className="text-[10px] text-muted-foreground">Não Resolvidos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{alerts.filter((a: any) => a.is_resolved).length}</p>
            <p className="text-[10px] text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
        <Card className="glass border-border">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {alerts.filter((a: any) => a.severity === "critical" && !a.is_resolved).length}
            </p>
            <p className="text-[10px] text-muted-foreground">Críticos Ativos</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Alertas do Sistema
            </CardTitle>
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                variant={showResolved ? "default" : "outline"}
                className="text-xs h-7"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? "Ocultar Resolvidos" : "Mostrar Resolvidos"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 px-2">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum alerta ativo. Sistema saudável!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.map((a: any) => (
                  <div key={a.id} className={`p-3 hover:bg-muted/20 transition-colors ${a.is_resolved ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[10px] ${severityStyle[a.severity] || severityStyle.medium}`} variant="outline">
                            {a.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {alertTypeLabels[a.alert_type] || a.alert_type}
                          </Badge>
                          {a.is_resolved && (
                            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Resolvido
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground">{a.message}</p>
                        {a.function_name && (
                          <span className="text-[10px] text-muted-foreground mt-0.5 block font-mono">{a.function_name}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {!a.is_resolved && (
                          <Button size="sm" variant="outline" className="text-[10px] h-5 px-2" onClick={() => resolveAlert(a.id)}>
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
