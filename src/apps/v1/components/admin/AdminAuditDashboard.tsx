import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, History, RefreshCcw, FileSpreadsheet, Loader2, XCircle, CheckCircle, BrainCircuit, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { exportData } from "@/lib/auditExportUtils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClinicalAuditTimeline } from "./ClinicalAuditTimeline";
import { EngineExplainabilityPanel } from "./EngineExplainabilityPanel";
import { ProtocolComparison } from "./ProtocolComparison";

export const AdminAuditDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timelineGroups, setTimelineGroups] = useState<any[]>([]);
  const [exportTasks, setExportTasks] = useState<any[]>([]);
  const [searchCorrelation, setSearchCorrelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<{ ts: string | null; id: string | null }>({ ts: null, id: null });
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [filters, setFilters] = useState({
    alert_type: "all",
    severity: "all",
    tenant_id: "",
    patient_id: "",
    correlation_id: ""
  });
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchAlerts(true);
    fetchExportTasks();
    
    const taskSub = supabase
      .channel('export_tasks_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'export_tasks' }, () => fetchExportTasks())
      .subscribe();

    return () => { supabase.removeChannel(taskSub); };
  }, [filters]);

  const fetchExportTasks = async () => {
    const { data } = await supabase.from('export_tasks').select('*').order('created_at', { ascending: false }).limit(20);
    setExportTasks(data || []);
  };

  const fetchAlerts = async (reset = false) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_advanced_alerts_paginated', {
      p_alert_type: filters.alert_type === 'all' ? null : filters.alert_type,
      p_severity: filters.severity === 'all' ? null : filters.severity,
      p_tenant_id: filters.tenant_id || null,
      p_cursor_timestamp: reset ? null : cursor.ts,
      p_cursor_id: reset ? null : cursor.id,
      p_limit: 11
    }) as { data: any[], error: any };

    if (!error) {
      const results = data || [];
      const more = results.length > 10;
      const displayData = more ? results.slice(0, 10) : results;
      setAlerts(reset ? displayData : [...alerts, ...displayData]);
      setHasMore(more);
      if (displayData.length > 0) {
        const last = displayData[displayData.length - 1];
        setCursor({ ts: last.created_at, id: last.id });
      }
    }
    setLoading(false);
  };

  const fetchStats = async (patientId: string) => {
    const { data } = await supabase.rpc('get_plan_status_distribution', { p_patient_id: patientId }) as { data: any };
    setMetrics(data);
  };

  const handleExport = async (format: 'CSV' | 'PDF' | 'XLSX') => {
    setExporting(true);
    try {
      await exportData({ format, data: alerts, filters, isAsync: true });
      toast.success(`Tarefa de exportação ${format} criada com sucesso.`);
    } catch (e) {
      toast.error("Erro ao solicitar exportação.");
    }
    setExporting(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Central</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('XLSX')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
          <Button onClick={() => handleExport('CSV')}><Download className="mr-2 h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="clinical">Auditoria Clínica</TabsTrigger>
          <TabsTrigger value="compare">Comparador Elite</TabsTrigger>
          <TabsTrigger value="exports">Exportações ({exportTasks.filter(t => t.status === 'processing' || t.status === 'pending').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={filters.alert_type} onValueChange={(v) => setFilters(f => ({...f, alert_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="PLAN_VISIBILITY_DROP">Queda de Visibilidade</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Tenant ID..." value={filters.tenant_id} onChange={(e) => setFilters(f => ({...f, tenant_id: e.target.value}))} />
                <Input placeholder="Patient ID..." value={filters.patient_id} onChange={(e) => setFilters(f => ({...f, patient_id: e.target.value}))} />
                <Input placeholder="Correlation ID..." value={filters.correlation_id} onChange={(e) => setFilters(f => ({...f, correlation_id: e.target.value}))} />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Correlação</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map(alert => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="text-sm font-bold">{alert.alert_type}</div>
                          <div className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString()}</div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{alert.correlation_id}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => alert.metadata?.patient_id && fetchStats(alert.metadata.patient_id)}>
                            <History className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {hasMore && <Button variant="ghost" className="w-full mt-2" onClick={() => fetchAlerts()}>Ver mais</Button>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Métricas e Deltas</CardTitle></CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold border-b pb-2">Distribuição Antes/Depois</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Antes</div>
                        {metrics.before && Object.entries(metrics.before).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs"><span>{k}</span> <span>{v as number}</span></div>
                        ))}
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase">Depois</div>
                        {metrics.after && Object.entries(metrics.after).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs"><span>{k}</span> <span>{v as number}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!metrics && <div className="text-center py-10 text-xs text-muted-foreground">Selecione um alerta</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ClinicalAuditTimeline patientId={filters.patient_id || "79f0616b-1933-4f51-b8ef-f10f448651a1"} />
            </div>
            <div className="space-y-6">
              <EngineExplainabilityPanel 
                metadata={{
                  calories_target: 2150,
                  protein_target: 165,
                  carbs_target: 220,
                  fat_target: 72,
                  protocol: "FitJourney",
                  restrictions_applied: ["Lactose", "Glúten"],
                  clinical_rationale: "Paciente apresenta sensibilidade gástrica reportada. Engine selecionou estratégia de alta densidade nutricional com exclusão de alérgenos comuns para otimizar recuperação muscular."
                }} 
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <ProtocolComparison patientId={filters.patient_id || "79f0616b-1933-4f51-b8ef-f10f448651a1"} />
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader><CardTitle>Fila de Exportação</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell><Badge>{task.format}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(task.status === 'processing' || task.status === 'pending') && <Loader2 className="h-3 w-3 animate-spin" />}
                          {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-500" />}
                          {task.status === 'failed' && <XCircle className="h-3 w-3 text-red-500" />}
                          <span className="capitalize text-xs">{task.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-muted rounded-full h-1.5 max-w-[100px]">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${task.progress || 0}%` }} />
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.status === 'completed' && task.file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={task.file_url} download>Baixar</a>
                          </Button>
                        )}
                        {task.status === 'failed' && (
                          <Button size="sm" variant="ghost">Retry</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
