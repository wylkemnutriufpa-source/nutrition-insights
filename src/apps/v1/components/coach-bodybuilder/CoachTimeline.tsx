import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { Clock, Activity, Brain, Zap, CheckCircle, XCircle, Eye, Flag, MessageSquare } from "lucide-react";

const EVENT_ICONS: Record<string, any> = {
  checkin: Activity,
  analysis: Brain,
  decision_accepted: CheckCircle,
  decision_rejected: XCircle,
  decision_suggested: Zap,
  phase_change: Flag,
  visual_observation: Eye,
  note: MessageSquare,
};

const EVENT_COLORS: Record<string, string> = {
  checkin: "text-blue-400 bg-blue-500/20",
  analysis: "text-purple-400 bg-purple-500/20",
  decision_accepted: "text-emerald-400 bg-emerald-500/20",
  decision_rejected: "text-red-400 bg-red-500/20",
  decision_suggested: "text-amber-400 bg-amber-500/20",
  phase_change: "text-orange-400 bg-orange-500/20",
  visual_observation: "text-cyan-400 bg-cyan-500/20",
  note: "text-muted-foreground bg-muted",
};

interface Props {
  athleteId: string;
}

export default function CoachTimeline({ athleteId }: Props) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["coach-timeline", athleteId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coach_timeline" as any)
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Timeline de Preparação
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado. Registre check-ins para iniciar a timeline.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {events.map((ev: any) => {
                const Icon = EVENT_ICONS[ev.event_type] || MessageSquare;
                const color = EVENT_COLORS[ev.event_type] || EVENT_COLORS.note;
                const [iconColor, iconBg] = color.split(" ");
                return (
                  <div key={ev.id} className="flex gap-3 relative">
                    <div className={`z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBg}`}>
                      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{ev.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
