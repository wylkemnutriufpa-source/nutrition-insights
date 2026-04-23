import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { queryKeys } from "./queryKeys";

export function usePatientDashboard() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Setup Realtime listener for published plans
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`patient_dashboard_sync:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_plans',
          filter: `patient_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Realtime] Meal plan change detected:', payload.eventType);
          
          // Invalidate dashboard query when any plan changes (publish/archive/update)
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.patient(user.id),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_lifecycle_states',
          filter: `patient_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('[Realtime] Lifecycle state change detected');
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard.patient(user.id),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const { data: lifecycleState } = useQuery({
    queryKey: ['lifecycle', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resolve_patient_lifecycle_state', {
        _patient_id: user!.id
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  return useQuery({
    queryKey: [...queryKeys.dashboard.patient(user?.id ?? ""), tenantId, lifecycleState?.state],
    enabled: !!user && !!lifecycleState,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const today = new Date().toISOString().split("T")[0];

      // If patient is paused or closed, we can return early or restricted data
      if (lifecycleState?.state === 'closed' || lifecycleState?.state === 'paused') {
        return {
          stats: null,
          checklistTasks: [],
          recentMeals: [],
          unreadMessages: 0,
          lifecycle: lifecycleState
        };
      }

      // Single RPC for counts + stats
      const { data: rpcStats, error: rpcError } = await supabase.rpc(
        "get_patient_dashboard_stats" as any,
        { _patient_id: userId }
      );

      const [checkRes, anamRes, mealsRes] = await Promise.all([
        withTenantFilter(supabase.from("checklist_tasks").select("*").eq("patient_id", userId).eq("date", today), tenantId).order("category"),
        supabase.from("patient_anamnesis").select("*").eq("user_id", userId).eq("status", "completed").order("created_at", { ascending: false }).limit(1),
        supabase.from("meals").select("*").eq("user_id", userId).order("logged_at", { ascending: false }).limit(3),
      ]);

      const unreadMessages = rpcError ? 0 : ((rpcStats as any)?.unread_messages || 0);
      const stats = rpcError ? null : ((rpcStats as any)?.stats || null);
      const nextAppointment = rpcError ? null : ((rpcStats as any)?.next_appointment || null);

      if (rpcError) {
        const [statsRes, aptRes, msgRes] = await Promise.all([
          supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
          withTenantFilter(supabase.from("patient_appointments").select("*").eq("patient_id", userId).gte("appointment_date", new Date().toISOString()), tenantId).order("appointment_date").limit(1),
          supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
        ]);
        return {
          stats: statsRes.data,
          checklistTasks: checkRes.data || [],
          anamnesis: anamRes.data?.[0] || null,
          nextAppointment: aptRes.data?.[0] || null,
          recentMeals: mealsRes.data || [],
          unreadMessages: msgRes.count || 0,
          lifecycle: lifecycleState
        };
      }

      return {
        stats,
        checklistTasks: checkRes.data || [],
        anamnesis: anamRes.data?.[0] || null,
        nextAppointment,
        recentMeals: mealsRes.data || [],
        unreadMessages,
        lifecycle: lifecycleState
      };
    },
  });
}
