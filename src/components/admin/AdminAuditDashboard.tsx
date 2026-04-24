import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, History, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

export const AdminAuditDashboard = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [searchCorrelation, setSearchCorrelation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const channel = supabase
      .channel('system_alerts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_alerts' }, 
        payload => setAlerts(prev => [payload.new, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase.from('system_alerts').select('*').order('created_at', { ascending: false }).limit(20);
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
    const { data, error } = await supabase.rpc('reconcile_published_plans', { p_limit: 5 });
    if (error) toast.error("Falha na reconciliação");
    else toast.success(`Reconciliação concluída: ${data.processed} planos processados`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Audit Central</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={runReconciliation}><RefreshCcw className="mr-2 h-4 w-4" /> Reconciliar</Button>
          <Button onClick={exportDiagnostics}><Download className="mr-2 h-4 w-4" /> Exportar CSV</Button>
        </div>
      </div>

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
