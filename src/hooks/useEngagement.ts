import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format, isAfter, setHours, setMinutes } from "date-fns";

const SUCCESS_MESSAGES = [
  "Incrível! Mais um passo rumo ao seu objetivo. 🚀",
  "Mandou bem! A consistência é o segredo. ✨",
  "Sensacional! Continue assim. 💪",
  "Feito! Você está no caminho certo. 🔥",
];

const RISK_MESSAGES = [
  "Não pare agora! Sua evolução depende da sua constância. ⚠️",
  "Sua meta está logo ali. Vamos retomar o foco? 🎯",
  "Um dia de cada vez, mas não deixe passar. ⏳",
  "Sua saúde é sua prioridade. Vamos nessa? 🍎",
];

const NIGHT_MESSAGES = [
  "O dia ainda não acabou! Ainda dá tempo de fechar sua meta. 🌙",
  "Que tal fechar o dia com chave de ouro? Só falta um pouco. ✨",
  "Não deixe para amanhã o que você pode concluir hoje. 🚀",
];

export function useEngagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("goal, full_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      return data;
    },
  });

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

  const { data: planItems } = useQuery({
    queryKey: ["today-plan-items", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const dow = new Date().getDay();
      const { data: activePlan } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("patient_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!activePlan) return [];

      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("id")
        .eq("meal_plan_id", activePlan.id)
        .eq("day_of_week", dow);
      
      return items || [];
    }
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

      await supabase.from("usage_logs").insert({
        user_id: user!.id,
        event_type: "meal_checkin",
        metadata: { meal_id: mealId, completed }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-checkins", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["engagement-stats", user?.id] });
      
      const randomSuccess = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
      toast.success(randomSuccess);
    },
    onError: (error) => {
      console.error("Checkin error:", error);
      toast.error("Erro ao registrar check-in.");
    }
  });

  const totalMeals = planItems?.length || 0;
  const completedMeals = checkins?.filter(c => c.completed).length || 0;
  const progressPct = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;

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

  const isStreakAtRisk = stats?.current_streak > 0 && progressPct < 100 && riskLevel === "on_track";
  const isNearCompletion = progressPct >= 70 && progressPct < 100;
  
  // Future Expectation Logic
  const isNearRecord = stats?.current_streak > 0 && stats?.current_streak >= (stats?.longest_streak - 1);
  const expectationMessage = isNearRecord 
    ? `Você está a apenas 1 dia de bater seu recorde de ${stats?.longest_streak} dias!`
    : progressPct > 0 ? "Você está chegando perto do seu melhor resultado do dia!" : null;

  // Personal Connection Logic
  const personalMessage = profile?.goal 
    ? `Lembre-se do seu objetivo: ${profile.goal}. Cada refeição conta!`
    : "Você está cada vez mais próximo da sua melhor versão!";

  // Critical Moment (Night) Logic
  const isNightTime = isAfter(new Date(), setMinutes(setHours(new Date(), 20), 0));
  const isDayIncomplete = progressPct < 100 && totalMeals > 0;
  const criticalNightMessage = (isNightTime && isDayIncomplete) 
    ? NIGHT_MESSAGES[Math.floor(Math.random() * NIGHT_MESSAGES.length)]
    : null;

  const identityStatus = (() => {
    if (stats?.current_streak >= 10) return "Insuperável";
    if (stats?.current_streak >= 5) return "Consistente";
    if (stats?.weekly_adherence_pct > 80) return "Evoluindo";
    return "Iniciando jornada";
  })();

  const { data: prevWeekStats } = useQuery({
    queryKey: ["prev-week-engagement", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const startOfPrevWeek = new Date(weekAgo);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
      
      const { data } = await supabase
        .from("meal_item_completions")
        .select("adherence_status")
        .eq("patient_id", user!.id)
        .gte("date", startOfPrevWeek.toISOString().split('T')[0])
        .lt("date", weekAgo.toISOString().split('T')[0]);
      
      if (!data?.length) return 0;
      const followed = data.filter(c => c.adherence_status === "followed").length;
      return (followed / data.length) * 100;
    }
  });

  const isBetterThanLastWeek = stats?.weekly_adherence_pct > (prevWeekStats || 0);

  // Progressive Reward Impact
  const rewardImpact: "light" | "medium" | "strong" = (() => {
    if (stats?.current_streak >= 30) return "strong";
    if (stats?.current_streak >= 7) return "medium";
    return "light";
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
    progressPct,
    isStreakAtRisk,
    isNearCompletion,
    expectationMessage,
    personalMessage,
    criticalNightMessage,
    rewardImpact,
    identityStatus,
    isBetterThanLastWeek,
    remainingMeals: totalMeals - completedMeals,
    isLoading: loadingStats || loadingCheckins,
    toggleCheckin: (mealId: string, completed: boolean = true) => 
      checkinMutation.mutate({ mealId, completed }),
    isCheckingIn: checkinMutation.isPending
  };
}
