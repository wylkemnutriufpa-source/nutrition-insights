import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, History, RefreshCcw, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { exportData } from "@/lib/auditExportUtils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const AdminAuditDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timelineGroups, setTimelineGroups] = useState<any[]>([]);
  const [searchCorrelation, setSearchCorrelation] = useState("");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<{ ts: string | null; id: string | null }>({ ts: null, id: null });
  const [hasMore, setHasMore] = useState(false);
  
  const [filters, setFilters] = useState({
    alert_type: "all",
    severity: "all",
    tenant_id: ""
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
      p_limit: 11 // Fetch 1 extra to check hasMore
    }) as { data: any[], error: any };

    if (error) {
      toast.error("Erro ao carregar alertas");
    } else {
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

  const fetchTimelineGroups = async (patientId: string) => {
    setLoading(true);
    const { data } = await supabase.rpc('get_patient_event_timeline', { p_patient_id: patientId }) as { data: any };
    setTimelineGroups(data || []);
    setLoading(false);
  };

  const fetchDropMetrics = async (patientId: string) => {
    const { data } = await supabase.rpc('get_plan_drop_metrics', { p_patient_id: patientId }) as { data: any };
    setMetrics(data);
  };

  const runReconciliation = async () => {
    const patientId = alerts[0]?.metadata?.patient_id;
    if (!patientId) return;
    const { data, error } = await supabase.rpc('reconcile_patient_plans', { p_patient_id: patientId }) as { data: any, error: any };
    if (error) toast.error("Falha na reconciliação");
    else toast.success(`Corrigidos: ${data?.count || 0}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Central</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportData({ format: 'XLSX', data: alerts, filters })}><FileSpreadsheet className="mr-2 h-4 w-4" /> Excel</Button>
          <Button onClick={() => exportData({ format: 'CSV', data: alerts, filters })}><Download className="mr-2 h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Select value={filters.alert_type} onValueChange={(v) => setFilters(f => ({...f, alert_type: v}))}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="PLAN_VISIBILITY_DROP">Queda de Visibilidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input 
              className="flex-1"
              placeholder="Tenant ID..." 
              value={filters.tenant_id} 
              onChange={(e) => setFilters(f => ({...f, tenant_id: e.target.value}))} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Alertas (Ordenação Estável)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alerta</TableHead>
                  <TableHead>Correlation</TableHead>
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
                    <TableCell className="text-xs font-mono">{alert.correlation_id?.split('-')[0]}...</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (alert.metadata?.patient_id) {
                          fetchTimelineGroups(alert.metadata.patient_id);
                          fetchDropMetrics(alert.metadata.patient_id);
                        }
                      }}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMore && (
              <Button variant="ghost" className="w-full mt-4" onClick={() => fetchAlerts()}>Ver mais</Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Timeline por Correlação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {metrics && (
              <div className="bg-muted p-2 rounded text-xs">
                Diff: {metrics.diff} (Antes: {metrics.before_cutoff_count} | Depois: {metrics.after_cutoff_count})
              </div>
            )}
            <div className="space-y-6">
              {timelineGroups.map((group, idx) => (
                <div key={idx} className="border-l-2 pl-4 space-y-2">
                  <div className="text-[10px] font-mono text-muted-foreground">ID: {group.correlation_id}</div>
                  {group.events.map((evt: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold">{evt.type}</span>: {evt.status || evt.alert}
                      <div className="text-[9px] opacity-70">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
