/**
 * FitJourney — System Health Score Hook
 * Calls the get_system_health_score RPC.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@v1/integrations/supabase/client";

interface SystemHealth {
  health_score: number;
  recent_critical_errors: number;
  avg_response_ms: number;
  unresolved_silent_failures: number;
  status: "healthy" | "attention" | "critical";
  computed_at: string;
}

export function useSystemHealth(enabled = true) {
  return useQuery<SystemHealth>({
    queryKey: ["system-health-score"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_system_health_score");
      if (error) throw error;
      return data as unknown as SystemHealth;
    },
    enabled,
    refetchInterval: 60_000, // Every minute
    staleTime: 30_000,
  });
}
