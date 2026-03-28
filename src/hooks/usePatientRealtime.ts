/**
 * usePatientRealtime — Realtime subscriptions for patient-facing data.
 * 
 * Subscribes to tables that affect the patient's view and invalidates
 * React Query cache on any change. Mount in patient dashboard layout.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { invalidateCriticalQueries } from "@/lib/queryInvalidation";
import { useTelemetryStore } from "@/lib/telemetryStore";

export function usePatientRealtime() {
  const { user, isPatient } = useAuth();
  const queryClient = useQueryClient();
  const { addRealtimeEvent, addInvalidation, setConnection, enabled: telemetryOn } = useTelemetryStore();

  useEffect(() => {
    if (!user || !isPatient) return;

    const channelName = `patient-rt-${user.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const trackAndInvalidate = (table: string) => (payload: any) => {
      const now = Date.now();
      invalidateCriticalQueries(queryClient, user.id);

      // Telemetry
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
        query_keys: ["patients", "dashboard", "lifecycle", "notifications", "meal-plans"],
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

    // nutritionist_patients — journey_status changes
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "nutritionist_patients", filter: `patient_id=eq.${user.id}` },
      trackAndInvalidate("nutritionist_patients")
    );

    // patient_lifecycle_states
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patient_lifecycle_states", filter: `patient_id=eq.${user.id}` },
      trackAndInvalidate("patient_lifecycle_states")
    );

    // meal_plans — new plan published
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meal_plans", filter: `patient_id=eq.${user.id}` },
      trackAndInvalidate("meal_plans")
    );

    // notifications
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      trackAndInvalidateKey("notifications", "notifications")
    );

    // chat_messages
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${user.id}` },
      trackAndInvalidateKey("chat_messages", "chat")
    );

    // ifj_patient_permissions
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ifj_patient_permissions", filter: `patient_id=eq.${user.id}` },
      trackAndInvalidate("ifj_patient_permissions")
    );

    // checklist_tasks
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "checklist_tasks", filter: `patient_id=eq.${user.id}` },
      trackAndInvalidateKey("checklist_tasks", "checklist")
    );

    channel.subscribe((status) => {
      setConnection({
        connected: status === "SUBSCRIBED",
        activeChannels: supabase.getChannels().length,
      });
    });

    return () => {
      supabase.removeChannel(channel);
      setConnection({ activeChannels: supabase.getChannels().length });
    };
  }, [user, isPatient, queryClient]);
}
