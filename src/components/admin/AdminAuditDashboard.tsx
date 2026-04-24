import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, History, RefreshCcw, FileText, Filter } from "lucide-react";
import { toast } from "sonner";
import { exportAuditToPDF } from "@/lib/auditExportUtils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const AdminAuditDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [searchCorrelation, setSearchCorrelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    alert_type: "all",
    severity: "all",
    tenant_id: ""
  });
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, [filters]);

  const fetchAlerts = async () => {
    const { data } = await supabase.rpc('get_advanced_alerts', {
      p_alert_type: filters.alert_type === 'all' ? null : filters.alert_type,
      p_severity: filters.severity === 'all' ? null : filters.severity,
      p_tenant_id: filters.tenant_id || null
    }) as { data: any[] };
    setAlerts(data || []);
  };

  const lookupTimeline = async (id: string) => {
    setLoading(true);
    const correlationId = id || searchCorrelation;
    const { data: plans } = await supabase.from('meal_plans').select('*').eq('correlation_id', correlationId);
    const { data: alertLogs } = await supabase.from('system_alerts').select('*').eq('correlation_id', correlationId);
    
    const combined = [
      ...(plans || []).map(p => ({ ...p, type: 'PLAN_UPDATE', timestamp: p.updated_at })),
      ...(alertLogs || []).map(a => ({ ...a, type: 'ALERT', timestamp: a.created_at }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    setTimeline(combined);
    setLoading(false);
  };

  const exportDiagnostics = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["ID,Type,Message,PatientID,CorrelationID,CreatedAt"].join(",") + "\n" +
      alerts.map(a => `${a.id},${a.alert_type},"${a.message}",${a.metadata?.patient_id},${a.correlation_id},${a.created_at}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_diagnostics_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Diagnóstico exportado para CSV");
  };

  const runReconciliation = async () => {
    const patientId = timeline[0]?.patient_id || alerts[0]?.metadata?.patient_id;
    if (!patientId) {
      toast.error("Selecione um alerta para reconciliar por paciente");
      return;
    }
    const { data, error } = await supabase.rpc('reconcile_patient_plans', { 
      p_patient_id: patientId 
    }) as { data: any, error: any };
    
    if (error) toast.error("Falha na reconciliação");
    else toast.success(`Reconciliação manual concluída: ${data?.count || 0} corrigidos. Correlation: ${data?.correlation_id}`);
  };

  const fetchDropMetrics = async (patientId: string) => {
    const { data } = await supabase.rpc('get_plan_drop_metrics', { p_patient_id: patientId }) as { data: any };
    setMetrics(data);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Central</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runReconciliation}><RefreshCcw className="mr-2 h-4 w-4" /> Reconciliar Paciente</Button>
          <Button variant="outline" onClick={() => exportAuditToPDF(alerts, timeline)}>
            <FileText className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
          <Button onClick={exportDiagnostics}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <label className="text-xs font-medium mb-1 block">Tipo de Alerta</label>
              <Select value={filters.alert_type} onValueChange={(v) => setFilters(f => ({...f, alert_type: v}))}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="PLAN_VISIBILITY_DROP">Queda de Visibilidade</SelectItem>
                  <SelectItem value="E2E_CONSISTENCY_ERROR">Erro de Consistência</SelectItem>
                  <SelectItem value="PUBLISH_RACE_CONDITION">Race Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <label className="text-xs font-medium mb-1 block">Severidade</label>
              <Select value={filters.severity} onValueChange={(v) => setFilters(f => ({...f, severity: v}))}>
                <SelectTrigger><SelectValue placeholder="Severidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block">Tenant ID (UUID)</label>
              <Input 
                placeholder="Filtrar por Tenant..." 
                value={filters.tenant_id} 
                onChange={(e) => setFilters(f => ({...f, tenant_id: e.target.value}))} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Alertas em Tempo Real</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alerta</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Correlation</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{alert.alert_type}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{alert.message}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{alert.metadata?.patient_id?.split('-')[0]}...</TableCell>
                    <TableCell className="text-xs font-mono">{alert.correlation_id?.split('-')[0]}...</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => lookupTimeline(alert.correlation_id)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline Inspector</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input placeholder="Correlation ID..." value={searchCorrelation} onChange={e => setSearchCorrelation(e.target.value)} />
              <Button size="icon" onClick={() => lookupTimeline(searchCorrelation)}><Search className="h-4 w-4" /></Button>
            </div>
            <div className="relative border-l-2 border-muted ml-3 space-y-6 py-2">
              {timeline.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">Insira um ID para ver a rastreabilidade</div>}
              {timeline.map((event, i) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary" />
                  <div className="text-xs font-bold text-primary">{event.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</div>
                  <div className="text-sm mt-1">{event.message || `Plan ${event.status}`}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
