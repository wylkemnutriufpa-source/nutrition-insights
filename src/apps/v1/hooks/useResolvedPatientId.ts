import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a patientId (which may be profiles.id OR profiles.user_id)
 * into the canonical user_id used across all data tables.
 *
 * This fixes the systemic bug where profiles.id != profiles.user_id
 * but navigations/links may pass either one.
 */
export function useResolvedPatientId(patientId: string | undefined) {
  return useQuery({
    queryKey: ["resolved-patient-id", patientId],
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 min — stable mapping
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id")
        .or(`id.eq.${patientId},user_id.eq.${patientId}`)
        .maybeSingle();

      if (error) throw error;

      return {
        /** The auth.users.id — used in nutritionist_patients, meal_plans, etc. */
        canonicalId: data?.user_id ?? patientId!,
        /** The profiles.id — used internally by profiles table */
        profileId: data?.id ?? patientId!,
        /** Both IDs for .in() queries */
        allIds: Array.from(new Set([data?.user_id, data?.id, patientId].filter(Boolean))) as string[],
      };
    },
  });
}
