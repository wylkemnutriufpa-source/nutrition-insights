/**
 * FitJourney — System Health Live Dashboard
 * Real-time active monitoring and observability + Incident Governance.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Activity, 
  Clock, 
  User, 
  Monitor, 
  Shield, 
  RefreshCw, 
  Layers, 
  Database,
  ShieldAlert,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStatusIndicator } from "@/components/observability/HealthStatusIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IncidentManager } from "@/components/observability/IncidentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SystemLog {
  id: string;
  created_at: string;
  level: string;
  category: string;
  severity: string;
  section: string;
  message: string;
  stack: string | null;
  route: string | null;
  user_id: string | null;
  correlation_id: string;
  metadata: any;
}

const severityConfig: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: "bg-red-500 text-white animate-pulse", label: "Crítico" },
  HIGH: { color: "bg-orange-500 text-white", label: "Alto" },
  MEDIUM: { color: "bg-yellow-500 text-black", label: "Médio" },
  LOW: { color: "bg-blue-500 text-white", label: "Baixo" },
};

export default function SystemHealthLive() {
  const queryClient = useQueryClient();
  const [liveCount, setLiveCount] = useState(0);

  const { data: healthSummary } = useQuery({
    queryKey: ["system-health-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("system_health_summary").select("*").single();
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["system-logs-live"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as SystemLog[];
    },
    refetchInterval: 20000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("system-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        () => {
          setLiveCount((c) => c + 1);
          queryClient.invalidateQueries({ queryKey: ["system-logs-live"] });
          queryClient.invalidateQueries({ queryKey: ["system-health-summary"] });
          queryClient.invalidateQueries({ queryKey: ["error-incidents"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 md:p-8 space-y-8 font-sans selection:bg-primary/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Health Control Tower</h1>
            <HealthStatusIndicator />
          </div>
          <p className="text-zinc-500 text-sm">
            Governança de incidentes e monitoramento determinístico
          </p>
        </div>
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <Badge variant="destructive" className="animate-pulse bg-red-600 border-none">
              +{liveCount} novos eventos
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            onClick={() => {
              setLiveCount(0);
              queryClient.invalidateQueries({ queryKey: ["system-logs-live"] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800 border-l-red-500 border-l-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-red-400 font-medium uppercase tracking-wider">Incidentes P0</span>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-red-500">{healthSummary?.active_p0 || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 border-l-orange-500 border-l-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-orange-400 font-medium uppercase tracking-wider">Incidentes P1</span>
              <Zap className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-orange-500">{healthSummary?.active_p1 || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Erros (1h)</span>
              <AlertTriangle className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="text-3xl font-bold">{healthSummary?.errors_last_hour || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 border-l-primary/50 border-l-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-primary font-medium uppercase tracking-wider">Status Operacional</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${healthSummary?.status === 'HEALTHY' ? 'bg-primary' : 'bg-red-500'} animate-pulse`} />
              <span className="text-xl font-bold">
                {healthSummary?.status === 'HEALTHY' ? 'Estável' : 'Atenção'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="space-y-6">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger value="incidents" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            <Shield className="h-4 w-4 mr-2" />
            Governança (Incidentes)
          </TabsTrigger>
          <TabsTrigger value="live" className="data-[state=active]:bg-primary data-[state=active]:text-black">
            <Activity className="h-4 w-4 mr-2" />
            Live Feed (Logs)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents">
          <IncidentManager />
        </TabsContent>

        <TabsContent value="live">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Aggregation Panel */}
            <Card className="lg:col-span-1 bg-zinc-900/50 border-zinc-800 h-fit">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-500" />
                  Agregação por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {logs.length > 0 ? (
                  Array.from(new Set(logs.map(l => l.category))).map(cat => (
                    <div key={cat} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">{cat}</div>
                      <div className="text-sm font-bold">{logs.filter(l => l.category === cat).length}x</div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-zinc-600 text-xs italic">Nenhuma agregação disponível</p>
                )}
              </CardContent>
            </Card>

            {/* Live Feed */}
            <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/50">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  Raw Logs (Live)
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-800">
                  {logs.length} logs carregados
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="p-12 text-center text-zinc-600 text-sm">Escaneando logs...</div>
                  ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                      <Shield className="h-12 w-12 text-zinc-800 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm italic">Ambiente limpo. Nenhum erro detectado.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {logs.map((log) => {
                        const sev = severityConfig[log.severity] || severityConfig.MEDIUM;
                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 hover:bg-zinc-800/30 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={`${sev.color} text-[10px] h-5 border-none font-bold uppercase`}>
                                    {sev.label}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-1.5 py-0.5 rounded">
                                    {log.category}
                                  </span>
                                </div>
                                <h4 className="text-sm font-semibold text-zinc-100 mb-1 leading-relaxed">
                                  {log.message}
                                </h4>
                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 font-medium">
                                  <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                                    <Monitor className="h-3 w-3" />
                                    {log.route || '/'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {log.section}
                                  </span>
                                  {log.user_id && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {log.user_id.slice(0, 8)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-1 whitespace-nowrap bg-zinc-900/50 p-1 rounded">
                                <Clock className="h-2.5 w-2.5" />
                                {formatTime(log.created_at)}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

