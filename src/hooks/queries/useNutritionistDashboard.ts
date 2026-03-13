import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./queryKeys";
import { calculateHealthScore } from "@/components/dashboard/HealthScoreRing";

export function useNutritionistDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.nutritionist(user?.id ?? ""),
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

      const [patientsRes, protocolsRes, programsRes, plansRes, aptsRes, chatsRes, pendingRes, programsListRes] = await Promise.all([
        supabase.from("nutritionist_patients").select("id, patient_id", { count: "exact" }).eq("nutritionist_id", userId).eq("status", "active"),
        supabase.from("protocols").select("id", { count: "exact" }).eq("created_by", userId),
        supabase.from("programs").select("id", { count: "exact" }).eq("created_by", userId).eq("is_active", true),
        supabase.from("meal_plans").select("id", { count: "exact" }).eq("nutritionist_id", userId).eq("is_active", true),
        supabase.from("patient_appointments").select("id", { count: "exact" }).eq("nutritionist_id", userId).gte("appointment_date", todayStart.toISOString()).lte("appointment_date", todayEnd.toISOString()),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("nutritionist_id", userId).eq("status", "pending"),
        supabase.from("programs").select("id, title").eq("created_by", userId).eq("is_active", true).limit(5),
      ]);

      const patientIds = (patientsRes.data || []).map((p: any) => p.patient_id);

      // Fetch timeline
      let recentTimeline: any[] = [];
      if (patientIds.length > 0) {
        const [timelineRes, profilesRes] = await Promise.all([
          supabase.from("patient_timeline").select("*").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(15),
          supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
        ]);
        const nameMap: Record<string, string> = {};
        (profilesRes.data || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
        recentTimeline = (timelineRes.data || []).map((ev: any) => ({
          ...ev,
          patient_name: nameMap[ev.patient_id] || "Paciente",
        }));
      }

      return {
        patientCount: patientsRes.count || 0,
        protocolCount: protocolsRes.count || 0,
        programCount: programsRes.count || 0,
        mealPlanCount: plansRes.count || 0,
        appointmentsToday: aptsRes.count || 0,
        unreadChats: chatsRes.count || 0,
        pendingCheckins: pendingRes.count || 0,
        patientIds,
        programsList: programsListRes.data || [],
        recentTimeline,
      };
    },
  });
}
