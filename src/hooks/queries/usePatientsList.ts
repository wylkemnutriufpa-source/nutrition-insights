import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";

export function usePatientsList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.patients.all(user?.id ?? ""),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const userId = user!.id;
      const today = new Date().toISOString().split("T")[0];

      const { data } = await supabase
        .from("nutritionist_patients")
        .select("*")
        .eq("nutritionist_id", userId)
        .order("created_at", { ascending: false });

      const { data: progs } = await supabase.from("programs")
        .select("id, title").eq("created_by", userId).eq("is_active", true);

      if (!data) return { patients: [], programs: progs || [], prestigePlans: [] };

      const patientIds = data.map(p => p.patient_id);
      if (patientIds.length === 0) return { patients: data, programs: progs || [], prestigePlans: [] };

      const [profilesRes, statsRes, checklistRes, enrollmentsRes, prestigeRes, pPlansRes] = await Promise.all([
        Promise.all(patientIds.map(id =>
          supabase.from("profiles").select("full_name, avatar_url").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("player_stats").select("last_meal_date, total_xp, current_streak").eq("user_id", id).single()
        )),
        Promise.all(patientIds.map(id =>
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", id).eq("date", today)
        )),
        supabase.from("program_patients")
          .select("patient_id, program_id, programs(id, title)")
          .eq("status", "active")
          .in("patient_id", patientIds),
        supabase.from("patient_prestige")
          .select("patient_id, plan_id, prestige_plans(*)")
          .eq("is_active", true)
          .in("patient_id", patientIds),
        supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
      ]);

      const enriched = data.map((p, i) => {
        const profile = profilesRes[i].data;
        const stats = statsRes[i].data;
        const tasks = checklistRes[i].data || [];
        const total = tasks.length;
        const completed = tasks.filter((t: any) => t.completed).length;
        const checklistAdherence = total > 0 ? Math.round((completed / total) * 100) : 0;

        const enrollments = (enrollmentsRes.data || [])
          .filter((e: any) => e.patient_id === p.patient_id)
          .map((e: any) => e.programs)
          .filter(Boolean);

        const prestige = (prestigeRes.data || []).find((pp: any) => pp.patient_id === p.patient_id);

        return {
          ...p,
          profile,
          stats,
          checklistAdherence,
          programs: enrollments,
          prestigePlan: prestige ? prestige.prestige_plans : null,
        };
      });

      return {
        patients: enriched,
        programs: progs || [],
        prestigePlans: (pPlansRes.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          color: d.color,
          icon: d.icon,
          badge_icon: d.badge_icon,
          crown_enabled: d.crown_enabled,
          is_active: d.is_active,
          display_order: d.display_order,
        })),
      };
    },
  });
}

export function useTogglePatientStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ linkId, currentStatus }: { linkId: string; currentStatus: string }) => {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("nutritionist_patients")
        .update({ status: newStatus })
        .eq("id", linkId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all(user?.id ?? "") });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
