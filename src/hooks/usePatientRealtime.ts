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

export function usePatientRealtime() {
  const { user, isPatient } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !isPatient) return;

    const channelName = `patient-rt-${user.id}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const invalidate = () => invalidateCriticalQueries(queryClient, user.id);

    // nutritionist_patients — journey_status changes
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "nutritionist_patients", filter: `patient_id=eq.${user.id}` },
      invalidate
    );

    // patient_lifecycle_states
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "patient_lifecycle_states", filter: `patient_id=eq.${user.id}` },
      invalidate
    );

    // meal_plans — new plan published
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meal_plans", filter: `patient_id=eq.${user.id}` },
      invalidate
    );

    // notifications
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
    );

    // chat_messages
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_messages", filter: `receiver_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ["chat"] })
    );

    // ifj_patient_permissions
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ifj_patient_permissions", filter: `patient_id=eq.${user.id}` },
      invalidate
    );

    // checklist_tasks
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "checklist_tasks", filter: `patient_id=eq.${user.id}` },
      () => queryClient.invalidateQueries({ queryKey: ["checklist"] })
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPatient, queryClient]);
}
