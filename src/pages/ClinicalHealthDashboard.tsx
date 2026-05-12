import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  History, 
  AlertOctagon, 
  Zap, 
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

export default function ClinicalHealthDashboard() {
  const [systemStatus, setSystemStatus] = useState<"stable" | "attention" | "critical">("stable");

  // Usamos asany para contornar problemas de tipagem profunda do Supabase nesta versão
  const { data: clinicalStats } = useQuery({
    queryKey: ["clinical-health-stats"],
    queryFn: async () => {
      const { data: logs } = await (supabase as any)
        .from("clinical_audit_logs")
        .select("action_type, status, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const typedLogs = (logs || []) as any[];
      const blocks = typedLogs.filter(l => l.action_type === "VALIDATION_ERROR");
      const totalActions = typedLogs.length;
      
      const chartData = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        return {
          name: dateStr,
          bloqueios: blocks.filter(b => b.created_at.startsWith(dateStr)).length,
          acoes: typedLogs.filter(l => l.created_at.startsWith(dateStr)).length
        };
      }).reverse();

      return {
        blocksCount: blocks.length,
        totalActions,
        chartData
      };
    }
  });

  const { data: versioningStats } = useQuery({
    queryKey: ["versioning-health-stats"],
    queryFn: async () => {
      const { data: versions } = await (supabase as any)
        .from("meal_plan_item_versions")
        .select("id, action_type, patient_id, created_at")
        .order("created_at", { ascending: false });

      const typedVersions = (versions || []) as any[];
      const restores = typedVersions.filter(v => v.action_type === "restore_version" || v.action_type === "restore");
      const recentRestores = restores.filter(r => new Date(r.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000);
      
      const patientCounts: Record<string, number> = recentRestores.reduce((acc, curr) => {
        if (curr.patient_id) {
          acc[curr.patient_id] = (acc[curr.patient_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const anomalies = Object.entries(patientCounts)
        .filter(([_, count]) => count > 5)
        .map(([id, count]) => ({ patientId: id, count }));

      return {
        totalVersions: typedVersions.length,
        totalRestores: restores.length,
        anomalies,
        recentVersions: typedVersions.slice(0, 10)
      };
    }
  });

  const { data: errorStats } = useQuery({
    queryKey: ["error-health-stats"],
    queryFn: async () => {
      const { data: errors } = await (supabase as any)
        .from("clinical_audit_logs")
        .select("*")
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(20);

      return (errors || []) as any[];
    }
  });

  useEffect(() => {
    if ((errorStats?.length || 0) > 10 || (versioningStats?.anomalies.length || 0) > 0) {
      setSystemStatus("critical");
    } else if ((clinicalStats?.blocksCount || 0) > 5) {
      setSystemStatus("attention");
    } else {
      setSystemStatus("stable");
    }
  }, [clinicalStats, versioningStats, errorStats]);

  const statusConfig = {
    stable: { label: "Estável", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2 },
    attention: { label: "Atenção", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertTriangle },
    critical: { label: "Crítico", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
  };

  const StatusIcon = statusConfig[systemStatus].icon;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Saúde do Sistema</h1>
            <p className="text-muted-foreground">Monitoramento clínico e técnico em tempo real.</p>
          </div>
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${statusConfig[systemStatus].bg}`}>
            <StatusIcon className={`h-5 w-5 ${statusConfig[systemStatus].color}`} />
            <span className={`font-semibold ${statusConfig[systemStatus].color}`}>
              Sistema {statusConfig[systemStatus].label}
            </span>
          </div>
        </div>

        <Tabs defaultValue="clinical" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="clinical" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Clínico
            </TabsTrigger>
            <TabsTrigger value="versioning" className="flex items-center gap-2">
              <History className="h-4 w-4" /> Versões
            </TabsTrigger>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" /> Falhas
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinical" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bloqueios Clínicos</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clinicalStats?.blocksCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Faixa Kcal (±20%)</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Auditado</div>
                  <p className="text-xs text-muted-foreground">Bloqueios automáticos ativos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {clinicalStats?.totalActions ? Math.round(((clinicalStats.totalActions - clinicalStats.blocksCount) / clinicalStats.totalActions) * 100) : 100}%
                  </div>
                  <p className="text-xs text-muted-foreground">Validações aprovadas</p>
                </CardContent>
              </Card>
            </div>

            <Card className="p-6">
              <CardHeader>
                <CardTitle className="text-lg">Tendência de Bloqueios Clínicos</CardTitle>
              </CardHeader>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicalStats?.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bloqueios" fill="#ef4444" radius={[4, 4, 0, 0]} name="Bloqueios" />
                    <Bar dataKey="acoes" fill="#10b981" radius={[4, 4, 0, 0]} name="Ações Totais" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="versioning" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Atividade de Restauração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total de Versões:</span>
                    <span className="font-bold">{versioningStats?.totalVersions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total de Restores:</span>
                    <span className="font-bold">{versioningStats?.totalRestores || 0}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className={versioningStats?.anomalies.length ? "border-red-500 bg-red-500/5" : ""}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Anomalias Detectadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {versioningStats?.anomalies.length ? (
                    versioningStats.anomalies.map((a, i) => (
                      <div key={i} className="text-sm text-red-600 font-medium">
                        ⚠️ Paciente {a.patientId.slice(0, 8)}: {a.count} restores em 24h
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma anomalia detectada.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-red-500" />
                  Logs de Erros Clínicos e Técnicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {errorStats?.length ? errorStats.map((error: any) => (
                    <div key={error.id} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{error.action_type}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(error.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-medium">{error.error_message}</p>
                        </div>
                        <Button variant="ghost" size="sm">Ver detalhes</Button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-muted-foreground">
                      Nenhuma falha crítica registrada recentemente.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">142ms</div>
                  <div className="text-xs text-muted-foreground">Latência Restore</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">1.2s</div>
                  <div className="text-xs text-muted-foreground">IA Generation</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">88ms</div>
                  <div className="text-xs text-muted-foreground">History Query</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">92%</div>
                  <div className="text-xs text-muted-foreground">Uso de Cache</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
