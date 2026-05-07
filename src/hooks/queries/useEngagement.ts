import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "./queryKeys";

export function useAdherenceScore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.engagement.adherence(user?.id ?? ""),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_daily_adherence")
        .select("*")
        .eq("patient_id", user!.id)
        .order("date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });
}

export function useActiveMissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.engagement.missions(user?.id ?? ""),
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_missions")
        .select("*")
        .eq("patient_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });
}

export function useEngagementSignals(nutritionistId?: string) {
  return useQuery({
    queryKey: queryKeys.engagement.signals(nutritionistId ?? ""),
    enabled: !!nutritionistId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase.from("engagement_signals") as any)
        .select("*")
        .eq("nutritionist_id", nutritionistId!)
        .eq("is_resolved", false)
        .order("detected_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });
}
