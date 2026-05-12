import type { CoachAlert } from "@/lib/coachAnalysisEngine";
import { ALERT_TYPE_LABELS } from "@/lib/coachAnalysisEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, ShieldAlert, Info } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldAlert, label: "Crítico" },
  high: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Alto" },
  medium: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Bell, label: "Médio" },
  low: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info, label: "Baixo" },
};

interface Props {
  alerts: CoachAlert[];
  compact?: boolean;
}

export default function CoachAlertsList({ alerts, compact = false }: Props) {
  if (alerts.length === 0) {
    return compact ? null : (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4 text-center text-sm text-emerald-400">
          ✅ Nenhum alerta ativo. Atleta em boa condição.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.map((alert, i) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          const Icon = cfg.icon;
          return (
            <Badge key={i} className={cfg.color}>
              <Icon className="h-3 w-3 mr-1" />
              {alert.title}
            </Badge>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Alertas ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((alert, i) => {
          const cfg = SEVERITY_CONFIG[alert.severity];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color.replace("text-", "border-").split(" ")[0]}/20 bg-card`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color.split(" ")[1]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
