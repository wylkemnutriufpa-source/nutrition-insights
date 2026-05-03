import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, AlertCircle, Clock, RefreshCw, RotateCcw, ShieldCheck, History, Trash2, Play, Download, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function JobDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [deadLetter, setDeadLetter] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("jobs");

  const fetchData = async () => {
    const [jobsRes, metricsRes, anomaliesRes, dlqRes, auditRes] = await Promise.all([
      supabase.from("meal_plan_jobs").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("meal_plan_job_metrics").select("*").single(),
      supabase.rpc("check_job_anomalies"),
      supabase.from("meal_plan_job_dead_letter").select("*, patient:profiles(full_name)").order("failure_timestamp", { ascending: false }),
      supabase.from("meal_plan_job_audit_logs").select("*, patient:profiles(full_name)").order("created_at", { ascending: false }).limit(50)
    ]);
    
    if (jobsRes.data) setJobs(jobsRes.data);
    if (metricsRes.data) setMetrics(metricsRes.data);
    if (anomaliesRes.data) setAnomalies(anomaliesRes.data);
    if (dlqRes.data) setDeadLetter(dlqRes.data);
    if (auditRes.data) setAuditLogs(auditRes.data);
    setLoading(false);
  };

  const handleReprocess = async (dlqId: string) => {
    try {
      const { data, error } = await supabase.rpc("reprocess_dead_letter_job", { dlq_id: dlqId });
      if (error) throw error;
      toast.success(`Job reenviado com sucesso! Novo ID: ${data}`);
      fetchData();
    } catch (err: any) {
      toast.error(`Falha ao reprocessar: ${err.message}`);
    }
  };

  const exportAudit = async () => {
    try {
      const { data, error } = await supabase.rpc("export_clinical_audit");
      if (error) throw error;
      
      const csv = [
        ["Paciente", "Horário", "Evento", "Engine", "Plan", "Metadata"],
        ...data.map((row: any) => [
          row.patient_name,
          new Date(row.action_time).toLocaleString(),
          row.event,
          row.engine,
          row.plan,
          JSON.stringify(row.meta)
        ])
      ].map(e => e.join(",")).join("\n");

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `clinical_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Auditoria exportada com sucesso!");
    } catch (err: any) {
      toast.error(`Falha ao exportar: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> 
            Enterprise Governance (Jobs & Lifecycle)
          </h1>
          <p className="text-sm text-muted-foreground">Monitoramento clínico, auditoria e recuperação de desastres.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => supabase.rpc("check_job_system_health")} className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Rodar Health Check
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>
      </div>

      {anomalies.length > 0 && (
        <Card className="border-red-500 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-500 flex items-center gap-2 text-sm uppercase">
              <AlertCircle className="w-4 h-4" /> Alertas Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="text-sm text-red-600 font-medium flex justify-between items-center">
                <span>• {a.details}</span>
                <Badge variant="outline" className="text-red-600 border-red-200">Ação Necessária</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Taxa de Falha" value={`${metrics?.failure_rate_pct?.toFixed(1) || 0}%`} color="text-red-600" />
        <MetricCard title="Latência Média" value={`${metrics?.avg_duration_seconds?.toFixed(1) || 0}s`} color="text-blue-600" />
        <MetricCard title="DLQ Pendente" value={deadLetter.filter(d => !d.resolved).length} color="text-orange-600" />
        <MetricCard title="Audit Logs (24h)" value={auditLogs.length} color="text-zinc-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="jobs">Monitor Ativo</TabsTrigger>
          <TabsTrigger value="dlq" className="flex gap-2">
            Dead Letter
            {deadLetter.filter(d => !d.resolved).length > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {deadLetter.filter(d => !d.resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Auditoria Clínica</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Últimos 50 Jobs</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">Engine v2.0.0</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Versões</th>
                      <th className="p-2 font-medium">Retries</th>
                      <th className="p-2 font-medium">Duração</th>
                      <th className="p-2 font-medium">Horário</th>
                      <th className="p-2 font-medium">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-muted/30">
                        <td className="p-2">
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'outline'}>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-col text-[10px] text-muted-foreground">
                            <span>E: {job.engine_version || '1.0.0'}</span>
                            <span>P: {job.plan_version || '1.0.0'}</span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {job.retries > 0 ? (
                            <span className="flex items-center gap-1 text-orange-600 justify-center">
                              <RotateCcw className="w-3 h-3" /> {job.retries}
                            </span>
                          ) : "0"}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {job.completed_at && job.started_at 
                              ? (Math.abs(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000).toFixed(1) + "s"
                              : "-"}
                          </div>
                        </td>
                        <td className="p-2 text-zinc-500 text-xs">
                          {new Date(job.created_at).toLocaleTimeString()}
                        </td>
                        <td className="p-2 max-w-xs truncate text-muted-foreground italic text-xs" title={job.error}>
                          {job.error || (job.status === 'completed' ? 'Sucesso' : 'Processando...')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fila de Erros Críticos (DLQ)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 font-medium">Paciente</th>
                      <th className="p-2 font-medium">Último Erro</th>
                      <th className="p-2 font-medium">Data Falha</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadLetter.map((dl) => (
                      <tr key={dl.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{dl.patient?.full_name || 'N/A'}</td>
                        <td className="p-2 text-xs text-red-600 italic max-w-xs truncate" title={dl.last_error}>
                          {dl.last_error}
                        </td>
                        <td className="p-2 text-zinc-500 text-xs">
                          {new Date(dl.failure_timestamp).toLocaleString()}
                        </td>
                        <td className="p-2">
                          {dl.resolved ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolvido</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Pendente</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {!dl.resolved && (
                            <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => handleReprocess(dl.id)}>
                              <Play className="w-3 h-3" /> Reprocessar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {deadLetter.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum job na DLQ. Ótima saúde do sistema!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
              <CardTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" /> Histórico de Auditoria Clínica
                </div>
                <Button variant="outline" size="sm" onClick={exportAudit} className="gap-2">
                  <Download className="w-4 h-4" /> Exportar CSV
                </Button>
              </CardTitle>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 font-medium">Paciente</th>
                      <th className="p-2 font-medium">Transição</th>
                      <th className="p-2 font-medium">Step</th>
                      <th className="p-2 font-medium">Metadata</th>
                      <th className="p-2 font-medium">Horário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{log.patient?.full_name || 'N/A'}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">{log.previous_status || 'null'}</span>
                            <span>→</span>
                            <span className="font-semibold">{log.new_status}</span>
                          </div>
                        </td>
                        <td className="p-2 text-xs">
                          {log.new_step || '-'}
                        </td>
                        <td className="p-2 text-[10px] text-muted-foreground font-mono">
                          {JSON.stringify(log.metadata)}
                        </td>
                        <td className="p-2 text-zinc-500 text-xs">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
