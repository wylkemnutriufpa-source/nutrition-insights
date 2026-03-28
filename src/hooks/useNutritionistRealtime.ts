/**
 * useNutritionistRealtime — Realtime subscriptions for professional-facing data.
 * 
 * Subscribes to tables that affect the nutritionist's dashboard and invalidates
 * React Query cache on change. Mount in professional dashboard layout.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { invalidateNutritionistQueries } from "@/lib/queryInvalidation";

export function useNutritionistRealtime() {
  const { user, isNutritionist, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || (!isNutritionist && !isAdmin)) return;

    const channelName = `nutri-rt-${user.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const invalidate = () => invalidateNutritionistQueries(queryClient);

    // nutritionist_patients — status changes, new patients
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "nutritionist_patients", filter: `nutritionist_id=eq.${user.id}` },
      invalidate
    );

    // onboarding_pipelines
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "onboarding_pipelines" },
      invalidate
    );

    // patient_checkins
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patient_checkins" },
      () => queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    );

    // clinical_alerts
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "clinical_alerts", filter: `nutritionist_id=eq.${user.id}` },
      invalidate
    );

    // notifications
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
    );

    // chat_messages (received)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ["chat"] })
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isNutritionist, isAdmin, queryClient]);
}
