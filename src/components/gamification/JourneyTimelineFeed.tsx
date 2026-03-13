import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const EVENT_STYLES: Record<string, { bg: string; border: string }> = {
  mission_completed: { bg: "bg-amber-500/10", border: "border-amber-500/30" },
  checkin: { bg: "bg-blue-500/10", border: "border-blue-500/30" },
  meal_logged: { bg: "bg-green-500/10", border: "border-green-500/30" },
  achievement: { bg: "bg-purple-500/10", border: "border-purple-500/30" },
  streak_milestone: { bg: "bg-orange-500/10", border: "border-orange-500/30" },
  motivation: { bg: "bg-pink-500/10", border: "border-pink-500/30" },
  body_assessment: { bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  protocol_started: { bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
  weight_change: { bg: "bg-teal-500/10", border: "border-teal-500/30" },
};

interface JourneyTimelineFeedProps {
  patientId?: string; // if not provided, uses logged-in user
  maxEvents?: number;
  compact?: boolean;
}

export function JourneyTimelineFeed({ patientId, maxEvents = 30, compact = false }: JourneyTimelineFeedProps) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["journey-events", targetId],
    enabled: !!targetId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_journey_events")
        .select("*")
        .eq("patient_id", targetId!)
        .order("created_at", { ascending: false })
        .limit(maxEvents);
      return data || [];
    },
  });

  // Group events by date
  const grouped = events.reduce<Record<string, typeof events>>((acc, event) => {
    const date = new Date(event.created_at).toLocaleDateString("pt-BR");
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/30" />
          <p className="text-sm text-muted-foreground">Sua jornada está começando!</p>
          <p className="text-xs text-muted-foreground mt-1">Complete tarefas e registre refeições para construir sua história.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {compact ? "Jornada" : "Sua Jornada de Transformação"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? "max-h-[300px]" : "max-h-[500px]"}>
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

            <AnimatePresence>
              {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 -ml-6">
                    <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{date}</span>
                  </div>

                  {dayEvents.map((event, i) => {
                    const styles = EVENT_STYLES[event.event_type] || { bg: "bg-muted/50", border: "border-border" };
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`relative mb-2 ml-2 p-2.5 rounded-lg border ${styles.border} ${styles.bg} ${event.is_highlight ? "ring-1 ring-primary/30" : ""}`}
                      >
                        <div className="absolute -left-[22px] w-2 h-2 rounded-full bg-muted-foreground/30 top-3.5" />
                        <div className="flex items-start gap-2">
                          <span className="text-lg flex-shrink-0">{event.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{event.title}</p>
                            {event.description && !compact && (
                              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {(event.xp_earned ?? 0) > 0 && (
                              <Badge variant="secondary" className="text-[10px]">+{event.xp_earned} XP</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
