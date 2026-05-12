import { useState, useCallback, useEffect } from "react";
import { useTimeline } from "@v1/hooks/useTimeline";
import { useAuth } from "@v1/lib/auth";
import { ScrollArea } from "@v1/components/ui/scroll-area";
import { Sparkles, Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TimelineEventCard from "./TimelineEventCard";
import CreateTimelinePost from "./CreateTimelinePost";
import { supabase } from "@v1/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function getDateLabel(dateStr: string): string {
  const today = new Date();
  const d = new Date(dateStr);
  const todayStr = today.toLocaleDateString("pt-BR");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("pt-BR");
  const dStr = d.toLocaleDateString("pt-BR");
  if (dStr === todayStr) return "Hoje";
  if (dStr === yesterdayStr) return "Ontem";
  return dStr;
}

interface Props {
  compact?: boolean;
  maxHeight?: string;
}

export default function FitJourneyTimeline({ compact = false, maxHeight = "700px" }: Props) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { events, isLoading, isFetching } = useTimeline(page);

  const { data: userRole } = useQuery({
    queryKey: ["user-role-timeline", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data?.role || "patient";
    },
  });

  useEffect(() => {
    if (events.length > 0) {
      setAllEvents(prev => {
        const ids = new Set(prev.map(e => e.id));
        const newOnes = events.filter((e: any) => !ids.has(e.id));
        return [...prev, ...newOnes].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    }
  }, [events]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("timeline-live-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "timeline_events" }, (payload) => {
        setAllEvents(prev => {
          if (prev.some(e => e.id === payload.new.id)) return prev;
          return [payload.new as any, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const grouped = allEvents.reduce<Record<string, any[]>>((acc, ev) => {
    const label = getDateLabel(ev.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(ev);
    return acc;
  }, {});

  const canLoadMore = events.length === 20;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-5 pt-5 pb-3 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-foreground">Timeline FitJourney</h3>
            <p className="text-[11px] text-muted-foreground">{allEvents.length} publicações</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Post creator */}
              {!compact && <div className="mb-5"><CreateTimelinePost userRole={userRole} /></div>}

              <ScrollArea style={{ maxHeight: maxHeight }} className="pr-1">
                {isLoading && allEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/30 mb-3" />
                    <p className="text-xs text-muted-foreground">Carregando timeline...</p>
                  </div>
                ) : allEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <MessageSquare className="h-7 w-7 text-primary/30" />
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Timeline vazia</h4>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                      Crie a primeira publicação para engajar seus pacientes!
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
                      <div key={dateLabel}>
                        {/* Date separator */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                          <span className="text-[11px] font-bold text-muted-foreground px-3 py-1 rounded-full bg-muted/60 tracking-wide uppercase">
                            {dateLabel}
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        </div>
                        <div className="space-y-3">
                          {dayEvents.map((ev: any, i: number) => (
                            <TimelineEventCard key={ev.id} event={ev} index={i} />
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Load more */}
                    {canLoadMore && (
                      <div className="text-center py-4">
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={isFetching}
                          className="px-5 py-2.5 rounded-xl bg-muted/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
                        >
                          {isFetching ? (
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          ) : null}
                          Carregar mais
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
