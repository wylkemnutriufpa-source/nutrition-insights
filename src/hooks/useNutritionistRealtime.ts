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
import { useTelemetryStore } from "@/lib/telemetryStore";
import { safeChannel, safeSubscribe, safeRemoveChannel } from "@/lib/security-layer/safeRealtime";

export function useNutritionistRealtime() {
  const { user, isNutritionist, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { addRealtimeEvent, addInvalidation, setConnection } = useTelemetryStore();

  useEffect(() => {
    if (!user || (!isNutritionist && !isAdmin)) return;

    const channelName = `nutri-rt-${user.id}-${Date.now()}`;
    const channel = safeChannel(channelName);
    if (!channel) return;

    const trackAndInvalidate = (table: string) => (payload: any) => {
      const now = Date.now();
      invalidateNutritionistQueries(queryClient);
      addRealtimeEvent({
        table,
        event: payload.eventType?.toUpperCase() || "UPDATE",
        user_id: user.id,
        received_at: now,
        latency_ms: payload.commit_timestamp
          ? now - new Date(payload.commit_timestamp).getTime()
          : null,
        payload_size: JSON.stringify(payload).length,
      });
      addInvalidation({
        trigger: "realtime",
        query_keys: ["patients", "dashboard", "protocols", "meal-plans", "notifications"],
        timestamp: now,
      });
    };

    const trackAndInvalidateKey = (table: string, key: string) => (payload: any) => {
      const now = Date.now();
      queryClient.invalidateQueries({ queryKey: [key] });
      addRealtimeEvent({
        table,
        event: payload.eventType?.toUpperCase() || "UPDATE",
        user_id: user.id,
        received_at: now,
        latency_ms: payload.commit_timestamp
          ? now - new Date(payload.commit_timestamp).getTime()
          : null,
        payload_size: JSON.stringify(payload).length,
      });
      addInvalidation({
        trigger: "realtime",
        query_keys: [key],
        timestamp: now,
      });
    };

    // nutritionist_patients — status changes, new patients
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "nutritionist_patients", filter: `nutritionist_id=eq.${user.id}` },
      trackAndInvalidate("nutritionist_patients")
    );

    // onboarding_pipelines
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "onboarding_pipelines" },
      trackAndInvalidate("onboarding_pipelines")
    );

    // patient_checkins
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patient_checkins" },
      trackAndInvalidateKey("patient_checkins", "dashboard")
    );

    // clinical_alerts
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "clinical_alerts", filter: `nutritionist_id=eq.${user.id}` },
      trackAndInvalidate("clinical_alerts")
    );

    // notifications
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      trackAndInvalidateKey("notifications", "notifications")
    );

    // chat_messages (received)
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${user.id}` },
      trackAndInvalidateKey("chat_messages", "chat")
    );

    safeSubscribe(channel);
    
    // Track status if supported
    try {
      (channel as any).subscribe((status: string) => {
        setConnection({
          connected: status === "SUBSCRIBED",
          activeChannels: supabase.getChannels().length,
        });
      });
    } catch {}

    return () => {
      safeRemoveChannel(channel);
      setConnection({ activeChannels: supabase.getChannels().length });
    };
  }, [user, isNutritionist, isAdmin, queryClient]);
}
