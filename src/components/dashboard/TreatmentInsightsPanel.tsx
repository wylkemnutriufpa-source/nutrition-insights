import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useEngagementSignals } from "@/hooks/queries/useEngagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries/queryKeys";
import { toast } from "sonner";
import {
  AlertTriangle, TrendingDown, Clock, UtensilsCrossed,
  CheckCircle2, Flame, Brain, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const SIGNAL_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
  checklist_drop: { icon: TrendingDown, label: "Queda no Checklist", color: "text-red-500" },
  meal_drop: { icon: UtensilsCrossed, label: "Poucos Registros de Refeição", color: "text-orange-500" },
  login_absence: { icon: Clock, label: "Paciente Ausente", color: "text-yellow-500" },
  streak_break: { icon: Flame, label: "Streak Quebrado", color: "text-red-400" },
  score_drop: { icon: TrendingDown, label: "Score em Queda", color: "text-red-500" },
};

const SEVERITY_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  critical: { variant: "destructive", label: "Crítico" },
  high: { variant: "destructive", label: "Alto" },
  medium: { variant: "default", label: "Médio" },
  low: { variant: "secondary", label: "Baixo" },
};

export function TreatmentInsightsPanel() {
  const { user } = useAuth();
  const { data: signals = [] } = useEngagementSignals(user?.id);
  const queryClient = useQueryClient();

  const grouped = useMemo(() => {
    const byType: Record<string, typeof signals> = {};
    for (const s of signals) {
      const key = s.signal_type;
      if (!byType[key]) byType[key] = [];
      byType[key].push(s);
    }
    return byType;
  }, [signals]);

  const resolveSignal = async (signalId: string) => {
    const { error } = await supabase
      .from("engagement_signals")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", signalId);
    if (error) {
      toast.error("Erro ao resolver sinal");
      return;
    }
    toast.success("Sinal resolvido");
    queryClient.invalidateQueries({ queryKey: queryKeys.engagement.signals(user?.id ?? "") });
  };

  if (signals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Brain className="h-10 w-10 mx-auto mb-3 text-primary/30" />
          <p className="text-sm text-muted-foreground">Nenhum alerta comportamental ativo</p>
          <p className="text-xs text-muted-foreground mt-1">Seus pacientes estão no caminho certo!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Insights Comportamentais
          </CardTitle>
          <Badge variant="outline">{signals.length} alertas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {Object.entries(grouped).map(([type, items]) => {
              const config = SIGNAL_CONFIG[type] || { icon: AlertTriangle, label: type, color: "text-muted-foreground" };
              const Icon = config.icon;
              return (
                <div key={type} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    {config.label}
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  {items.slice(0, 5).map((signal) => {
                    const severity = SEVERITY_BADGE[signal.severity] || SEVERITY_BADGE.medium;
                    const signalData = signal.signal_data as Record<string, unknown> | null;
                    return (
                      <div key={signal.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors ml-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={severity.variant} className="text-[10px]">{severity.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(signal.detected_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {signalData && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {type === "checklist_drop" && `Aderência: ${Math.round(Number(signalData.week_pct) || 0)}%`}
                              {type === "meal_drop" && `${signalData.meals_this_week ?? 0} refeições na semana`}
                              {type === "streak_break" && `Semana anterior: ${Math.round(Number(signalData.prev_week_pct) || 0)}%`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link to={`/patients/${signal.patient_id}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resolveSignal(signal.id)}>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
