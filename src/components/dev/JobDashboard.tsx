import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, AlertCircle, Clock, RefreshCw } from "lucide-react";

export default function JobDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [jobsRes, metricsRes] = await Promise.all([
      supabase.rpc("get_meal_plan_job_debug_info"),
      supabase.from("meal_plan_job_metrics").select("*").single()
    ]);
    
    if (jobsRes.data) setJobs(jobsRes.data);
    if (metricsRes.data) setMetrics(metricsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-primary" /> 
          Monitor de Jobs (Dev Mode)
        </h1>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics?.successful_jobs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Taxa de Falha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.failure_rate_percentage?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.avg_duration_seconds?.toFixed(1) || 0}s
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos 100 Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Etapa</th>
                  <th className="p-2 font-medium">Duração</th>
                  <th className="p-2 font-medium">Criado em</th>
                  <th className="p-2 font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-muted/30">
                    <td className="p-2">
                      <Badge variant={
                        job.status === 'completed' ? 'default' : 
                        job.status === 'failed' ? 'destructive' : 
                        'outline'
                      }>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="p-2 capitalize">{job.current_step}</td>
                    <td className="p-2 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {job.duration_seconds?.toFixed(1)}s
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </td>
                    <td className="p-2 max-w-xs truncate text-red-500" title={job.error}>
                      {job.error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
