import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Badge } from "@v1/components/ui/badge";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, Filter, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const EVENT_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  mission_completed: { bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Missão" },
  checkin: { bg: "bg-blue-500/10", border: "border-blue-500/30", label: "Check-in" },
  meal_logged: { bg: "bg-green-500/10", border: "border-green-500/30", label: "Refeição" },
  achievement: { bg: "bg-purple-500/10", border: "border-purple-500/30", label: "Conquista" },
  streak_milestone: { bg: "bg-orange-500/10", border: "border-orange-500/30", label: "Streak" },
  motivation: { bg: "bg-pink-500/10", border: "border-pink-500/30", label: "Motivação" },
  body_assessment: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "Avaliação" },
  protocol_started: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", label: "Protocolo" },
  protocol_changed: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", label: "Protocolo" },
  weight_change: { bg: "bg-teal-500/10", border: "border-teal-500/30", label: "Peso" },
  program_enrolled: { bg: "bg-violet-500/10", border: "border-violet-500/30", label: "Programa" },
  phase_transition: { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", label: "Fase" },
  adherence_drop: { bg: "bg-red-500/10", border: "border-red-500/30", label: "Alerta" },
  adherence_recovery: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Recuperação" },
  streak_broken: { bg: "bg-red-400/10", border: "border-red-400/30", label: "Streak" },
  recommendation: { bg: "bg-sky-500/10", border: "border-sky-500/30", label: "Dica" },
  blocked: { bg: "bg-red-600/10", border: "border-red-600/30", label: "Bloqueio" },
  unblocked: { bg: "bg-emerald-600/10", border: "border-emerald-600/30", label: "Desbloqueio" },
  evolution_milestone: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", label: "Marco" },
  photo_submitted: { bg: "bg-cyan-400/10", border: "border-cyan-400/30", label: "Foto" },
  note: { bg: "bg-muted/50", border: "border-border", label: "Nota" },
};

const EVENT_CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "clinical", label: "Clínico", types: ["checkin", "weight_change", "body_assessment", "photo_submitted", "protocol_started", "protocol_changed"] },
  { key: "engagement", label: "Engajamento", types: ["mission_completed", "streak_milestone", "streak_broken", "adherence_drop", "adherence_recovery"] },
  { key: "progress", label: "Progresso", types: ["achievement", "evolution_milestone", "phase_transition", "program_enrolled"] },
  { key: "nutrition", label: "Nutrição", types: ["meal_logged", "recommendation"] },
];

interface JourneyTimelineFeedProps {
  patientId?: string;
  maxEvents?: number;
  compact?: boolean;
  showFilters?: boolean;
  title?: string;
}

export function JourneyTimelineFeed({ patientId, maxEvents = 30, compact = false, showFilters = false, title }: JourneyTimelineFeedProps) {
  const { user } = useAuth();
  const targetId = patientId || user?.id;
  const [activeFilter, setActiveFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["journey-events", targetId, maxEvents],
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

  // Filter events
  const filteredEvents = activeFilter === "all"
    ? events
    : events.filter(e => {
        const cat = EVENT_CATEGORIES.find(c => c.key === activeFilter);
        return cat?.types?.includes(e.event_type);
      });

  // Group events by date
  const grouped = filteredEvents.reduce<Record<string, typeof events>>((acc, event) => {
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
          <p className="text-sm text-muted-foreground">
            {patientId ? "Nenhum evento registrado para este paciente." : "Sua jornada está começando!"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Complete tarefas e registre refeições para construir sua história.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(prev => !prev)}
      >
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title || (compact ? "Jornada" : "Timeline de Jornada")}
            <span className="text-xs font-normal text-muted-foreground">({events.length})</span>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </CardTitle>
      </CardHeader>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <CardContent>
              {/* Filters */}
              {showFilters && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {EVENT_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        activeFilter === cat.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}

              <ScrollArea className={compact ? "max-h-[300px]" : "max-h-[600px]"}>
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
                          <span className="text-[10px] text-muted-foreground/60">({dayEvents.length} eventos)</span>
                        </div>

                        {dayEvents.map((event, i) => {
                          const styles = EVENT_STYLES[event.event_type] || { bg: "bg-muted/50", border: "border-border", label: "Evento" };
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`relative mb-2 ml-2 p-2.5 rounded-lg border ${styles.border} ${styles.bg} ${event.is_highlight ? "ring-1 ring-primary/30" : ""}`}
                            >
                              <div className="absolute -left-[22px] w-2 h-2 rounded-full bg-muted-foreground/30 top-3.5" />
                              <div className="flex items-start gap-2">
                                <span className="text-lg flex-shrink-0">{event.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm font-medium leading-tight">{event.title}</p>
                                    {!compact && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{styles.label}</Badge>
                                    )}
                                  </div>
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

              {filteredEvents.length === 0 && events.length > 0 && (
                <div className="text-center py-4">
                  <Filter className="h-6 w-6 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Nenhum evento nesta categoria.</p>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
