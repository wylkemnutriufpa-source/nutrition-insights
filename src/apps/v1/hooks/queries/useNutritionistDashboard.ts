import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { queryKeys } from "./queryKeys";

export function useNutritionistDashboard() {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: [...queryKeys.dashboard.nutritionist(user?.id ?? ""), tenantId],
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const userId = user!.id;

      // Single RPC call replaces 8 parallel queries
      const { data: stats, error: statsError } = await supabase.rpc(
        "get_nutritionist_dashboard_stats" as any,
        { _nutritionist_id: userId }
      );

      // Fallback: if RPC fails, use legacy parallel queries
      if (statsError || !stats) {
        console.warn("[NutritionistDashboard] RPC fallback:", statsError?.message);
        return await legacyFetch(userId);
      }

      // Fetch timeline + programs list (not in RPC — returns rows, not counts)
      const patientIdsRes = await withTenantFilter(supabase
        .from("nutritionist_patients")
        .select("patient_id")
        .eq("nutritionist_id", userId)
        .eq("status", "active"), tenantId);

      const patientIds = (patientIdsRes.data || []).map((p: any) => p.patient_id);

      const [programsListRes, timelineData] = await Promise.all([
        supabase.from("programs").select("id, title").eq("created_by", userId).eq("is_active", true).limit(5),
        fetchTimeline(patientIds),
      ]);

      return {
        patientCount: (stats as any).patient_count || 0,
        protocolCount: (stats as any).protocol_count || 0,
        programCount: (stats as any).program_count || 0,
        mealPlanCount: (stats as any).meal_plan_count || 0,
        appointmentsToday: (stats as any).appointments_today || 0,
        unreadChats: (stats as any).unread_chats || 0,
        pendingCheckins: (stats as any).pending_checkins || 0,
        patientIds,
        programsList: programsListRes.data || [],
        recentTimeline: timelineData,
      };
    },
  });
}

async function fetchTimeline(patientIds: string[]) {
  if (patientIds.length === 0) return [];
  const [timelineRes, profilesRes] = await Promise.all([
    supabase.from("patient_timeline").select("*").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(15),
    // Note: profiles tenant filter requires tenantId passed through — keeping legacy for fetchTimeline
    supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
  ]);
  const nameMap: Record<string, string> = {};
  (profilesRes.data || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
  return (timelineRes.data || []).map((ev: any) => ({
    ...ev,
    patient_name: nameMap[ev.patient_id] || "Paciente",
  }));
}

/** Legacy fallback using parallel client-side queries */
async function legacyFetch(userId: string) {
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
  const recentTimeline = await fetchTimeline(patientIds);

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
}
