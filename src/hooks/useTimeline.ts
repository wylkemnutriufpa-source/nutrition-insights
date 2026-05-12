import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useCallback, useRef } from "react";
import { safeChannel, safeSubscribe, safeRemoveChannel } from "@/lib/security-layer/safeRealtime";

const PAGE_SIZE = 20;

export function useTimeline(page = 0) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["timeline-events", page],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data } = await supabase
        .from("timeline_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      return (data || []) as any[];
    },
  });

  // Realtime subscription — protegido contra falhas de WebSocket
  useEffect(() => {
    if (!user) return;
    const channel = safeChannel("timeline-realtime");
    
    if (channel) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "timeline_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["timeline-events"] });
      });
      safeSubscribe(channel);
    }

    return () => { 
      if (channel) safeRemoveChannel(channel); 
    };
  }, [user, queryClient]);

  return { events: data || [], isLoading, isFetching };
}

export function useTimelineReactions(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["timeline-reactions", eventId],
    enabled: !!eventId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await (supabase.from("timeline_reactions") as any)
        .select("*")
        .eq("event_id", eventId);
      return (data || []) as any[];
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!user) return;
      const existing = reactions.find((r: any) => r.user_id === user.id && r.emoji === emoji);
      if (existing) {
        await supabase.from("timeline_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("timeline_reactions").insert({ event_id: eventId, user_id: user.id, emoji } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeline-reactions", eventId] }),
  });

  // Group reactions by emoji
  const grouped = reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r: any) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
    acc[r.emoji].count++;
    if (r.user_id === user?.id) acc[r.emoji].userReacted = true;
    return acc;
  }, {});

  return { grouped, toggleReaction: toggleReaction.mutate };
}

export function useTimelineComments(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["timeline-comments", eventId],
    enabled: !!eventId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("timeline_comments")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      return (data || []) as any[];
    },
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !text.trim()) return;
      await supabase.from("timeline_comments").insert({
        event_id: eventId,
        author_id: user.id,
        comment_text: text.trim().slice(0, 240),
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeline-comments", eventId] }),
  });

  return { comments, isLoading, addComment: addComment.mutate };
}

export function useTimelinePollVote(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: votes = [] } = useQuery({
    queryKey: ["timeline-poll-votes", eventId],
    enabled: !!eventId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("timeline_poll_votes")
        .select("*")
        .eq("event_id", eventId);
      return (data || []) as any[];
    },
  });

  const vote = useMutation({
    mutationFn: async (optionIndex: number) => {
      if (!user) return;
      await supabase.from("timeline_poll_votes").insert({
        event_id: eventId,
        user_id: user.id,
        option_selected: optionIndex,
      } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeline-poll-votes", eventId] }),
  });

  const userVote = votes.find((v: any) => v.user_id === user?.id);
  const voteCounts = votes.reduce<Record<number, number>>((acc, v: any) => {
    acc[v.option_selected] = (acc[v.option_selected] || 0) + 1;
    return acc;
  }, {});

  return { votes, userVote, voteCounts, totalVotes: votes.length, castVote: vote.mutate };
}
