/**
 * FitJourney — System Health Live Dashboard
 * Real-time error monitoring for admins.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Activity, Clock, User, Monitor, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorLog {
  id: string;
  user_id: string | null;
  module: string;
  page_route: string | null;
  error_message: string;
  severity: string;
  auto_recovered: boolean;
  created_at: string;
  role: string | null;
}

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-destructive text-destructive-foreground", label: "Crítico" },
  high: { color: "bg-orange-500/20 text-orange-400", label: "Alto" },
  medium: { color: "bg-yellow-500/20 text-yellow-400", label: "Médio" },
  low: { color: "bg-muted text-muted-foreground", label: "Baixo" },
};

export default function SystemHealthLive() {
  const queryClient = useQueryClient();
  const [liveCount, setLiveCount] = useState(0);

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["system-health-errors"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as ErrorLog[];
    },
    refetchInterval: 15000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("system-errors-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_error_logs" },
        () => {
          setLiveCount((c) => c + 1);
          queryClient.invalidateQueries({ queryKey: ["system-health-errors"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const criticalCount = errors.filter((e) => e.severity === "critical" || e.severity === "high").length;
  const recoveredCount = errors.filter((e) => e.auto_recovered).length;

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            System Health — Live
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento de erros em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              +{liveCount} novos
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLiveCount(0);
              queryClient.invalidateQueries({ queryKey: ["system-health-errors"] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{errors.length}</div>
            <div className="text-xs text-muted-foreground">Últimos Erros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <div className="text-xs text-muted-foreground">Críticos/Altos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{recoveredCount}</div>
            <div className="text-xs text-muted-foreground">Auto-recuperados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
            <div className="text-xs text-muted-foreground">Realtime ativo</div>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            Últimos 50 Erros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : errors.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-primary/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum erro registrado. Sistema saudável!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {errors.map((error, i) => {
                const sev = severityConfig[error.severity] || severityConfig.medium;
                return (
                  <motion.div
                    key={error.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={sev.color} variant="secondary">
                            {sev.label}
                          </Badge>
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            {error.module}
                          </span>
                          {error.auto_recovered && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30">
                              Recuperado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground truncate">
                          {error.error_message}
                        </p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          {error.page_route && (
                            <span className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              {error.page_route}
                            </span>
                          )}
                          {error.user_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {error.user_id.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(error.created_at)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
