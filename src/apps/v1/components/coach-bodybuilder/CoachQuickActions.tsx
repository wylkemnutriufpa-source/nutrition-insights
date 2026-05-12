import { Button } from "@v1/components/ui/button";
import { Card, CardContent } from "@v1/components/ui/card";
import { Activity, Camera, Flag, PenLine, AlertTriangle, MessageSquare } from "lucide-react";

interface Props {
  onAction: (action: string) => void;
  alertCount: number;
}

export default function CoachQuickActions({ onAction, alertCount }: Props) {
  const actions = [
    { key: "checkin", label: "Novo Check-in", icon: Activity, color: "text-blue-400" },
    { key: "photos", label: "Ver Fotos", icon: Camera, color: "text-cyan-400" },
    { key: "phase", label: "Trocar Fase", icon: Flag, color: "text-orange-400" },
    { key: "manual_decision", label: "Decisão Manual", icon: PenLine, color: "text-purple-400" },
    { key: "alerts", label: `Alertas${alertCount > 0 ? ` (${alertCount})` : ""}`, icon: AlertTriangle, color: alertCount > 0 ? "text-red-400" : "text-muted-foreground" },
    { key: "note", label: "Observação", icon: MessageSquare, color: "text-emerald-400" },
  ];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button
                key={a.key}
                variant="ghost"
                onClick={() => onAction(a.key)}
                className="flex flex-col items-center gap-1 h-auto py-2.5 px-1"
              >
                <Icon className={`h-4 w-4 ${a.color}`} />
                <span className="text-[10px] text-foreground leading-tight text-center">{a.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
