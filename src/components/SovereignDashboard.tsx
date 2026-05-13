import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, AlertTriangle, Activity, Terminal, CheckCircle2 } from 'lucide-react';

interface SovereignLog {
  id: string;
  created_at: string;
  runtime_source: string;
  event_type: string;
  severity: string;
  message: string;
  metadata: any;
  correlation_id: string;
}

export const SovereignDashboard: React.FC = () => {
  const [logs, setLogs] = useState<SovereignLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Realtime subscription for sovereign alerts
    const channel = supabase
      .channel('sovereign_alerts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sovereign_runtime_logs' 
      }, (payload) => {
        setLogs(prev => [payload.new as SovereignLog, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('sovereign_runtime_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white hover:bg-red-600';
      case 'warning': return 'bg-orange-500 text-white hover:bg-orange-600';
      default: return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const getClassByMetadata = (log: SovereignLog) => {
    return log.metadata?.classification || 'MONITORAMENTO';
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Governança Soberana V3</h1>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex gap-1 items-center">
            <Activity className="w-3 h-3" /> Runtime: Ativo
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <CheckCircle2 className="w-3 h-3 text-green-500" /> V3 Soberano
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Incidentes Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" /> Versão Runtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.4.1-elite</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" /> SRE Clínico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">DETERMINÍSTICO</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" /> Telemetria de Soberania (Realtime)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {loading ? (
              <div className="flex justify-center p-8">Carregando telemetria...</div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                Nenhum incidente detectado no runtime soberano.
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.correlation_id}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {getClassByMetadata(log)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm font-semibold">{log.event_type}</div>
                    <div className="text-sm text-slate-600">{log.message}</div>
                    <div className="text-[10px] font-mono bg-slate-100 p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                      Source: {log.runtime_source} | {JSON.stringify(log.metadata)}
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
};
