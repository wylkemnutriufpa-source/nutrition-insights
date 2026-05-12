/**
 * Centralized Realtime Event Bus
 * 
 * Subscribes to critical patient lifecycle events via Supabase Realtime
 * and invalidates React Query caches so dashboards/lists update instantly.
 * 
 * Includes exponential-backoff polling fallback for reliability.
 * 
 * Mount ONCE in DashboardLayout — all child pages benefit automatically.
 */
import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";

// Tables that drive critical UI updates
const CRITICAL_TABLES = [
  "notifications",
  "onboarding_pipelines",
  "meal_plans",
  "patient_checkins",
  "clinical_alerts",
  "patient_lifecycle_states",
  "patient_protocols",
  "patient_timeline",
  "engagement_signals",
  "nutritionist_patients",
  "ifj_patient_permissions",
  "chat_messages",
  "checklist_tasks",
] as const;

// Map table → query keys to invalidate
const TABLE_QUERY_MAP: Record<string, string[][]> = {
  notifications: [["notifications"]],
  onboarding_pipelines: [["patients"], ["dashboard"]],
  meal_plans: [["patients"], ["dashboard"], ["meal-plans"]],
  patient_checkins: [["patients"], ["dashboard"]],
  clinical_alerts: [["patients"], ["dashboard"], ["engagement"]],
  patient_lifecycle_states: [["patients"], ["dashboard"], ["lifecycle"], ["payment-guard"]],
  patient_protocols: [["patients"], ["protocols"], ["dashboard"]],
  patient_timeline: [["dashboard"]],
  engagement_signals: [["engagement"], ["dashboard"]],
  nutritionist_patients: [["patients"], ["dashboard"], ["lifecycle"], ["payment-guard"], ["patient-detail"]],
  ifj_patient_permissions: [["patients"], ["dashboard"], ["payment-guard"]],
  chat_messages: [["chat"]],
  checklist_tasks: [["checklist"], ["dashboard"]],
};

export function useRealtimeEventBus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pollIntervalRef = useRef(30_000); // start at 30s — realtime is primary
  const lastSyncRef = useRef<string>(new Date().toISOString());
  const isActiveRef = useRef(true);
  const connectionOkRef = useRef(true);

  const invalidateForTable = useCallback(
    (table: string) => {
      const keys = TABLE_QUERY_MAP[table];
      if (!keys) return;
      keys.forEach((qk) => {
        queryClient.invalidateQueries({ queryKey: qk });
      });
    },
    [queryClient],
  );

  // Polling fallback — only kicks in when realtime drops
  const poll = useCallback(async () => {
    if (!isActiveRef.current || !user) return;

    try {
      // Check for new notifications since last sync as a heartbeat
      const { data, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gt("created_at", lastSyncRef.current);

      if (!error && (data as any) !== null) {
        const count = (data as any)?.length ?? 0;
        if (count > 0 || !connectionOkRef.current) {
          // Something new — invalidate everything
          Object.keys(TABLE_QUERY_MAP).forEach(invalidateForTable);
          lastSyncRef.current = new Date().toISOString();
          pollIntervalRef.current = 30_000; // reset
        } else {
          // Nothing new — back off
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 120_000);
        }
      }
    } catch {
      pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 120_000);
    }

    if (isActiveRef.current) {
      pollTimeoutRef.current = setTimeout(poll, pollIntervalRef.current);
    }
  }, [user, invalidateForTable]);

  useEffect(() => {
    if (!user) return;
    isActiveRef.current = true;
    lastSyncRef.current = new Date().toISOString();

    // Primary: Realtime subscriptions for all critical tables
    const channelName = `event-bus-${user.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    CRITICAL_TABLES.forEach((table) => {
      // For notifications, filter by user_id
      if (table === "notifications") {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` },
          () => {
            lastSyncRef.current = new Date().toISOString();
            pollIntervalRef.current = 30_000;
            connectionOkRef.current = true;
            invalidateForTable(table);
          },
        );
      } else {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            lastSyncRef.current = new Date().toISOString();
            pollIntervalRef.current = 30_000;
            connectionOkRef.current = true;
            invalidateForTable(table);
          },
        );
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        connectionOkRef.current = true;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        connectionOkRef.current = false;
        // Accelerate polling when realtime drops
        pollIntervalRef.current = 10_000;
      }
    });

    // Start fallback polling
    pollTimeoutRef.current = setTimeout(poll, pollIntervalRef.current);

    return () => {
      isActiveRef.current = false;
      clearTimeout(pollTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, poll, invalidateForTable]);
}
