import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, History, RefreshCcw, FileSpreadsheet, Loader2, XCircle, CheckCircle } from "lucide-react";
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
  }, [filters]);

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
          <Button variant="outline" disabled={exporting} onClick={() => handleExport('XLSX')}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />} Excel
          </Button>
          <Button variant="outline" disabled={exporting} onClick={() => handleExport('PDF')}>
            PDF
          </Button>
          <Button disabled={exporting} onClick={() => handleExport('CSV')}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

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
          <CardHeader><CardTitle>Alertas de Auditoria</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Deltas e Percentuais</CardTitle></CardHeader>
          <CardContent>
            {metrics && (
              <div className="space-y-4">
                <div className="text-xs font-bold border-b pb-2">Distribuição Antes/Depois</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Antes</div>
                    {Object.entries(metrics.before).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span>{k}</span> <span>{v as number}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Depois</div>
                    {Object.entries(metrics.after).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span>{k}</span> <span>{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!metrics && <div className="text-center py-10 text-xs text-muted-foreground">Selecione um alerta para ver métricas</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
