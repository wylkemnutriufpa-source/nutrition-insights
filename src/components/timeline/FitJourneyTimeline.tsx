import { useState, useCallback, useEffect } from "react";
import { useTimeline } from "@/hooks/useTimeline";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";
import TimelineEventCard from "./TimelineEventCard";
import CreateTimelinePost from "./CreateTimelinePost";
import { supabase } from "@/integrations/supabase/client";
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
  const { events, isLoading, isFetching } = useTimeline(page);

  // Get user role
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

  // Accumulate pages
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

  // Realtime: prepend new events
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

  // Group by date
  const grouped = allEvents.reduce<Record<string, any[]>>((acc, ev) => {
    const label = getDateLabel(ev.created_at);
    if (!acc[label]) acc[label] = [];
    acc[label].push(ev);
    return acc;
  }, {});

  const canLoadMore = events.length === 20;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Timeline FitJourney
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Post creator */}
        {!compact && <div className="mb-4"><CreateTimelinePost userRole={userRole} /></div>}

        <ScrollArea style={{ maxHeight }} className="pr-1">
          {isLoading && allEvents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
            </div>
          ) : allEvents.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/20" />
              <p className="text-sm text-muted-foreground">Nenhuma publicação ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Crie a primeira publicação para iniciar a timeline!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([dateLabel, dayEvents]) => (
                <div key={dateLabel}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                      {dateLabel}
                    </span>
                    <div className="h-px flex-1 bg-border" />
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
                    className="px-4 py-2 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all disabled:opacity-50"
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
      </CardContent>
    </Card>
  );
}
