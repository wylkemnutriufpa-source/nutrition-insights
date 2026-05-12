/**
 * Realtime Debug Center — FitJourney
 * 
 * Observability panel for realtime sync flow:
 * DB → Realtime → Invalidate → UI
 * 
 * Zero AI. Pure telemetry.
 */
import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTelemetryStore, getRecentStats, TelemetryEvent, RealtimeEvent, InvalidationEvent, RefetchEvent } from "@/lib/telemetryStore";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateCriticalQueries, invalidateNutritionistQueries } from "@/lib/queryInvalidation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  Zap,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  PlayCircle,
  AlertTriangle,
  Radio,
  Database,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour12: false });
}

function EventBadge({ type }: { type: TelemetryEvent["type"] }) {
  switch (type) {
    case "realtime":
      return <Badge variant="default" className="bg-emerald-600 text-xs font-mono">REALTIME</Badge>;
    case "invalidation":
      return <Badge variant="secondary" className="bg-amber-600 text-white text-xs font-mono">INVALIDATE</Badge>;
    case "refetch":
      return <Badge variant="outline" className="text-xs font-mono border-sky-500 text-sky-400">REFETCH</Badge>;
  }
}

function EventLine({ event }: { event: TelemetryEvent }) {
  const ts = event.type === "realtime" ? event.received_at
    : event.type === "invalidation" ? event.timestamp
    : event.started_at;

  let detail = "";
  if (event.type === "realtime") {
    const e = event as RealtimeEvent;
    detail = `${e.event} ${e.table}${e.latency_ms != null ? ` (${e.latency_ms}ms)` : ""}`;
  } else if (event.type === "invalidation") {
    const e = event as InvalidationEvent;
    detail = `[${e.trigger}] ${e.query_keys.join(", ")}`;
  } else {
    const e = event as RefetchEvent;
    detail = `${e.queryKey} (${e.duration_ms}ms) ${e.success ? "✓" : "✗"}`;
  }

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 text-xs font-mono border-b border-border/30 hover:bg-muted/30 transition-colors">
      <span className="text-muted-foreground w-[70px] shrink-0">{formatTime(ts)}</span>
      <EventBadge type={event.type} />
      <span className="text-foreground truncate">{detail}</span>
    </div>
  );
}

export default function RealtimeDebugCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { events, connection, enabled, setEnabled, clearEvents, addInvalidation } = useTelemetryStore();

  const [filterType, setFilterType] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");
  const [, setTick] = useState(0);

  // Refresh stats every second
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const stats = useMemo(() => getRecentStats(events), [events]);

  const timeSinceLastEvent = connection.lastEventAt
    ? Math.round((Date.now() - connection.lastEventAt) / 1000)
    : null;

  // Alerts
  const alerts: string[] = [];
  if (!connection.connected) alerts.push("Realtime desconectado");
  if (timeSinceLastEvent !== null && timeSinceLastEvent > 30) alerts.push(`Sem eventos há ${timeSinceLastEvent}s`);
  if (stats.maxLatency > 2000) alerts.push(`Latência alta: ${stats.maxLatency}ms`);

  // Tables from events for filter
  const tables = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => { if (e.type === "realtime") s.add((e as RealtimeEvent).table); });
    return Array.from(s).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterTable !== "all" && e.type === "realtime" && (e as RealtimeEvent).table !== filterTable) return false;
      return true;
    });
  }, [events, filterType, filterTable]);

  // Simulator
  const handleSimulateEvent = async () => {
    if (!user) return;
    try {
      // Trigger a benign update to force realtime event
      await supabase.from("profiles").update({ updated_at: new Date().toISOString() }).eq("user_id", user.id);
      toast.success("Evento simulado — observe a timeline");
    } catch {
      toast.error("Erro ao simular evento");
    }
  };

  const handleForceInvalidate = () => {
    invalidateCriticalQueries(queryClient, user?.id);
    invalidateNutritionistQueries(queryClient);
    addInvalidation({
      trigger: "manual",
      query_keys: ["patients", "dashboard", "lifecycle", "notifications", "meal-plans"],
      timestamp: Date.now(),
    });
    toast.success("Invalidação forçada executada");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* ── Alerts ── */}
        {alerts.length > 0 && enabled && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="flex flex-wrap gap-2">
                {alerts.map((a, i) => (
                  <Badge key={i} variant="outline" className="border-amber-500 text-amber-400">{a}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Controls ── */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} id="telemetry-toggle" />
            <Label htmlFor="telemetry-toggle" className="font-medium">
              {enabled ? "Telemetria ATIVA" : "Telemetria OFF"}
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={handleSimulateEvent} className="gap-1.5">
            <PlayCircle className="w-4 h-4" /> Simular Evento
          </Button>
          <Button variant="outline" size="sm" onClick={handleForceInvalidate} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Forçar Invalidate
          </Button>
          <Button variant="ghost" size="sm" onClick={clearEvents} className="gap-1.5 text-destructive">
            <Trash2 className="w-4 h-4" /> Limpar Logs
          </Button>
        </div>

        {/* ── Status Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              {connection.connected ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-bold text-sm">
                  {connection.connected ? "Conectado" : "Desconectado"}
                </p>
                <p className="text-xs text-muted-foreground">{connection.activeChannels} canais</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <Radio className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Eventos (60s)</p>
                <p className="font-bold text-lg">{stats.realtimeCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <Database className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Invalidações (60s)</p>
                <p className="font-bold text-lg">{stats.invalidationCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <ArrowDownRight className="w-5 h-5 text-sky-500" />
              <div>
                <p className="text-xs text-muted-foreground">Refetches (60s)</p>
                <p className="font-bold text-lg">{stats.refetchCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Latência média</p>
                <p className="font-bold text-lg">{stats.avgLatency}ms</p>
                <p className="text-xs text-muted-foreground">máx {stats.maxLatency}ms</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Timeline ── */}
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" /> Timeline
              <Badge variant="outline" className="text-xs">{filtered.length} eventos</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="realtime">Realtime</SelectItem>
                  <SelectItem value="invalidation">Invalidação</SelectItem>
                  <SelectItem value="refetch">Refetch</SelectItem>
                </SelectContent>
              </Select>
              {tables.length > 0 && (
                <Select value={filterTable} onValueChange={setFilterTable}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as tabelas</SelectItem>
                    {tables.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            <CardContent className="p-0">
              {!enabled && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  <Zap className="w-4 h-4 mr-2" /> Ative a telemetria para ver eventos
                </div>
              )}
              {enabled && filtered.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Aguardando eventos...
                </div>
              )}
              {filtered.map((e) => (
                <EventLine key={e.id} event={e} />
              ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* ── Connection Info ── */}
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Último evento:</span>
                <br />
                <span className="font-mono">
                  {connection.lastEventAt ? formatTime(connection.lastEventAt) : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Sem evento há:</span>
                <br />
                <span className={`font-mono ${(timeSinceLastEvent ?? 0) > 30 ? "text-amber-500" : ""}`}>
                  {timeSinceLastEvent !== null ? `${timeSinceLastEvent}s` : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total em memória:</span>
                <br />
                <span className="font-mono">{events.length} / 200</span>
              </div>
              <div>
                <span className="text-muted-foreground">Canais ativos:</span>
                <br />
                <span className="font-mono">{connection.activeChannels}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
