import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, Shield, History, Activity, Info, 
  AlertTriangle, ShieldAlert, RefreshCw, ScanSearch, 
  Fingerprint, Zap, Bomb, Ghost, Lock, Search 
} from 'lucide-react';
import { format } from 'date-fns';
import { SovereignAuditScanner } from '@/lib/sovereign-audit-scanner';
import { toast } from 'sonner';

interface SovereignLog {
  id: string;
  correlation_id: string;
  runtime_source: string;
  event_type: string;
  severity: string;
  message: string;
  metadata: any;
  editor_version: string;
  snapshot_version: string;
  created_at: string;
}

const SovereignDashboard = () => {
  const [logs, setLogs] = useState<SovereignLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sovereign_runtime_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setLogs(data as any);
    setLoading(false);
  };

  const runAudit = async () => {
    setLoading(true);
    toast.info("Iniciando varredura de soberania...");
    
    try {
      // Busca planos recentes para auditar
      const { data: plans } = await supabase
        .from('meal_plans')
        .select('*')
        .limit(5);

      if (plans) {
        for (const plan of plans) {
          await SovereignAuditScanner.scanPlanIntegrity(plan);
        }
      }
      
      toast.success("Auditoria concluída. Incidentes registrados na telemetria.");
      await fetchLogs();
    } catch (err) {
      toast.error("Falha ao executar auditoria.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Subscribe to new logs
    const channel = supabase
      .channel('sovereign_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sovereign_runtime_logs' }, (payload) => {
        setLogs(prev => [payload.new as SovereignLog, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3" /> CRITICAL</Badge>;
      case 'warning': return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="w-3 h-3" /> WARNING</Badge>;
      default: return <Badge variant="secondary" className="gap-1"><Info className="w-3 h-3" /> INFO</Badge>;
    }
  };

  const getClassificationBadge = (log: SovereignLog) => {
    const classification = log.metadata?.classification;
    if (!classification) return null;

    const colors: Record<string, string> = {
      'LEGADO/ZUMBI': 'bg-purple-500',
      'RISCO OPERACIONAL': 'bg-amber-500',
      'BOMBA RELÓGIO': 'bg-red-600',
      'MUTADOR SILENCIOSO': 'bg-indigo-500',
      'RUNTIME NÃO SOBERANO': 'bg-slate-700'
    };

    const icons: Record<string, any> = {
      'LEGADO/ZUMBI': <Ghost className="w-3 h-3" />,
      'RISCO OPERACIONAL': <Zap className="w-3 h-3" />,
      'BOMBA RELÓGIO': <Bomb className="w-3 h-3" />,
      'MUTADOR SILENCIOSO': <Fingerprint className="w-3 h-3" />,
      'RUNTIME NÃO SOBERANO': <Lock className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[classification] || 'bg-slate-500'} gap-1 text-[10px]`}>
        {icons[classification]} {classification}
      </Badge>
    );
  };

  const getEventBadge = (type: string) => {
    return <Badge variant="outline" className="text-[10px] uppercase font-mono">{type.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="text-primary w-8 h-8" />
            Central de Incidentes Soberana
          </h1>
          <p className="text-muted-foreground">Monitoramento de integridade clínica e runtime determinístico (SRE Clínico).</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} variant="secondary" size="sm" className="gap-2 border-primary/20">
            <ScanSearch className="w-4 h-4" />
            Executar Auditoria Viva
          </Button>
          <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" /> Violatons Críticas (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter(l => l.severity === 'critical').length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" /> Alertas de Legacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.filter(l => l.event_type === 'legacy_detected').length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="w-4 h-4 text-blue-500" /> Eventos Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rastro de Execução (Últimos 50 eventos)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Correlation ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum incidente detectado. Soberania estável.
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-100/50 transition-colors">
                  <TableCell className="font-mono text-[10px]">
                    {format(new Date(log.created_at), 'HH:mm:ss.SSS')}
                  </TableCell>
                  <TableCell className="font-semibold">{log.runtime_source}</TableCell>
                  <TableCell>{getEventBadge(log.event_type)}</TableCell>
                  <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={log.message}>{log.message}</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {log.correlation_id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SovereignDashboard;
