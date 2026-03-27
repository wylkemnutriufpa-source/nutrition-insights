import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./queryKeys";

export function usePatientDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.patient(user?.id ?? ""),
    enabled: !!user,
    staleTime: 5 * 1000, // 5s — fast refresh for lifecycle sync
    queryFn: async () => {
      const userId = user!.id;
      const today = new Date().toISOString().split("T")[0];

      const [statsRes, checkRes, anamRes, aptRes, mealsRes, msgRes] = await Promise.all([
        supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("checklist_tasks").select("*").eq("patient_id", userId).eq("date", today).order("category"),
        supabase.from("patient_anamnesis").select("*").eq("user_id", userId).eq("status", "completed").order("created_at", { ascending: false }).limit(1),
        supabase.from("patient_appointments").select("*").eq("patient_id", userId).gte("appointment_date", new Date().toISOString()).order("appointment_date").limit(1),
        supabase.from("meals").select("*").eq("user_id", userId).order("logged_at", { ascending: false }).limit(3),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
      ]);

      return {
        stats: statsRes.data,
        checklistTasks: checkRes.data || [],
        anamnesis: anamRes.data?.[0] || null,
        nextAppointment: aptRes.data?.[0] || null,
        recentMeals: mealsRes.data || [],
        unreadMessages: msgRes.count || 0,
      };
    },
  });
}
