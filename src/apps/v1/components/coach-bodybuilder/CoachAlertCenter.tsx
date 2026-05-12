import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { ALERT_TYPE_LABELS } from "@v1/lib/coachAnalysisEngine";
import type { CoachAlert } from "@v1/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";
import { Textarea } from "@v1/components/ui/textarea";
import { AlertTriangle, Bell, ShieldAlert, Info, CheckCircle, Eye } from "lucide-react";
import { toast } from "sonner";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldAlert, label: "Crítico" },
  high: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Alto" },
  medium: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Bell, label: "Médio" },
  low: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info, label: "Baixo" },
};

interface Props {
  athleteId: string;
  generatedAlerts: CoachAlert[];
}

export default function CoachAlertCenter({ athleteId, generatedAlerts }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  // Fetch persisted alerts
  const { data: persistedAlerts = [] } = useQuery({
    queryKey: ["coach-alerts-persisted", athleteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_alerts" as any)
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  // Sync generated alerts to DB
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      // Get existing active alert types
      const activeTypes = new Set(
        persistedAlerts.filter((a: any) => a.is_active).map((a: any) => a.alert_type)
      );

      // Insert new alerts that don't already exist as active
      const newAlerts = generatedAlerts.filter(a => !activeTypes.has(a.alert_type));
      if (newAlerts.length === 0) return;

      const { data: athlete } = await supabase
        .from("coach_athletes" as any)
        .select("tenant_id")
        .eq("id", athleteId)
        .single();

      for (const alert of newAlerts) {
        await supabase.from("coach_alerts" as any).insert({
          athlete_id: athleteId,
          coach_id: user.id,
          tenant_id: (athlete as any)?.tenant_id || null,
          alert_type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-alerts-persisted", athleteId] });
    },
  });

  // Auto-sync on mount
  useState(() => { syncMutation.mutate(); });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from("coach_alerts" as any)
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
          coach_note: resolveNote.trim() || null,
        })
        .eq("id", alertId);

      // Timeline event
      const alert = persistedAlerts.find((a: any) => a.id === alertId);
      if (alert && user) {
        await supabase.from("coach_timeline" as any).insert({
          athlete_id: athleteId,
          coach_id: user.id,
          tenant_id: alert.tenant_id,
          event_type: "note",
          title: `Alerta resolvido: ${alert.title}`,
          description: resolveNote.trim() || "Resolvido pelo coach.",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-alerts-persisted", athleteId] });
      queryClient.invalidateQueries({ queryKey: ["coach-timeline", athleteId] });
      setResolveId(null);
      setResolveNote("");
      toast.success("Alerta resolvido!");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await supabase.from("coach_alerts" as any)
        .update({ read_at: new Date().toISOString() })
        .eq("id", alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-alerts-persisted", athleteId] });
    },
  });

  const activeAlerts = persistedAlerts.filter((a: any) => a.is_active);
  const resolvedAlerts = persistedAlerts.filter((a: any) => !a.is_active);

  const sorted = [...activeAlerts].sort((a: any, b: any) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Central de Alertas
            {activeAlerts.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-auto">
                {activeAlerts.length} ativo{activeAlerts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="text-center py-6 text-sm text-emerald-400">
              ✅ Nenhum alerta ativo.
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((alert: any) => {
                const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.medium;
                const Icon = cfg.icon;
                const isResolving = resolveId === alert.id;
                const isUnread = !alert.read_at;

                return (
                  <div key={alert.id} className={`p-3 rounded-lg border bg-card ${isUnread ? "border-primary/30" : "border-border/50"}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color.split(" ")[1]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                          {isUnread && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Novo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>

                        {isResolving ? (
                          <div className="mt-2 space-y-2">
                            <Textarea
                              placeholder="Observação (opcional)..."
                              value={resolveNote}
                              onChange={e => setResolveNote(e.target.value)}
                              rows={2}
                              className="text-xs"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => resolveMutation.mutate(alert.id)} disabled={resolveMutation.isPending} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setResolveId(null)} className="text-xs">Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            {isUnread && (
                              <Button size="sm" variant="ghost" onClick={() => markReadMutation.mutate(alert.id)} className="text-xs h-7">
                                <Eye className="h-3 w-3 mr-1" /> Marcar lido
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setResolveId(alert.id)} className="text-xs h-7">
                              <CheckCircle className="h-3 w-3 mr-1" /> Resolver
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved history */}
      {resolvedAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Alertas Resolvidos ({resolvedAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resolvedAlerts.slice(0, 10).map((alert: any) => (
              <div key={alert.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30">
                <div>
                  <span className="text-foreground">{alert.title}</span>
                  {alert.coach_note && <span className="text-muted-foreground ml-2">— {alert.coach_note}</span>}
                </div>
                <span className="text-muted-foreground shrink-0">
                  {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString("pt-BR") : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
