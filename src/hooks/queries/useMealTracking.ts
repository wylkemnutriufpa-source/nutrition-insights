import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { queryKeys } from "./queryKeys";
import { toast } from "sonner";
import { offlineQueue } from "@v1/lib/offlineSync";

export function useMealCompletions(planId: string | null, date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.mealPlans.completions(user?.id ?? "", date),
    enabled: !!user && !!planId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_item_completions")
        .select("*")
        .eq("patient_id", user!.id)
        .eq("meal_plan_id", planId!)
        .eq("date", date);
      return data || [];
    },
  });
}

export function useToggleMealCompletion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      mealPlanId,
      mealPlanItemId,
      date,
      adherenceStatus,
    }: {
      mealPlanId: string;
      mealPlanItemId: string;
      date: string;
      adherenceStatus: "followed" | "partial" | "not_followed";
    }) => {
      const payload = {
        patient_id: user!.id,
        meal_plan_id: mealPlanId,
        meal_plan_item_id: mealPlanItemId,
        date,
        completed: adherenceStatus === "followed",
        adherence_status: adherenceStatus,
        completed_at: new Date().toISOString(),
      };

      if (!navigator.onLine) {
        offlineQueue.add({
          type: "meal_completion",
          table: "meal_item_completions",
          id: `${mealPlanItemId}_${date}`,
          data: payload,
          timestamp: Date.now(),
        });
        return payload;
      }

      const { data, error } = await supabase
        .from("meal_item_completions")
        .upsert(payload, { onConflict: "patient_id,meal_plan_item_id,date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mealPlans.completions(user?.id ?? "", vars.date),
      });
    },
    onError: () => {
      if (navigator.onLine) toast.error("Erro ao registrar refeição");
    },
  });
}
