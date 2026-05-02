import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";

export function useEngagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["engagement-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_engagement_stats")
        .select("*")
        .eq("patient_id", user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: checkins, isLoading: loadingCheckins } = useQuery({
    queryKey: ["meal-checkins", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_checkins")
        .select("*")
        .eq("patient_id", user!.id)
        .eq("checkin_date", today);
      
      if (error) throw error;
      return data || [];
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async ({ mealId, completed }: { mealId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("meal_checkins")
        .upsert({
          patient_id: user!.id,
          meal_id: mealId as any,
          checkin_date: today,
          completed,
        }, { onConflict: 'patient_id, meal_id, checkin_date' });

      if (error) throw error;

      // Log usage
      await supabase.from("usage_logs").insert({
        user_id: user!.id,
        event_type: "meal_checkin",
        metadata: { meal_id: mealId, completed }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-checkins", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["engagement-stats", user?.id] });
      toast.success("Check-in realizado com sucesso! ✨");
    },
    onError: (error) => {
      console.error("Checkin error:", error);
      toast.error("Erro ao registrar check-in.");
    }
  });

  const riskLevel: "on_track" | "risco_leve" | "risco_alto" = (() => {
    if (!stats?.last_checkin_date) return "risco_alto";
    
    const lastDate = new Date(stats.last_checkin_date + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "on_track";
    if (diffDays === 1) return "on_track";
    if (diffDays === 2) return "risco_leve";
    return "risco_alto";
  })();

  const achievements = {
    oneDay: stats?.total_checkins >= 1,
    threeDays: stats?.longest_streak >= 3,
    sevenDays: stats?.longest_streak >= 7,
  };

  return {
    stats,
    checkins,
    riskLevel,
    achievements,
    isLoading: loadingStats || loadingCheckins,
    toggleCheckin: (mealId: string, completed: boolean = true) => 
      checkinMutation.mutate({ mealId, completed }),
    isCheckingIn: checkinMutation.isPending
  };
}
