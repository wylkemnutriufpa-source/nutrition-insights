/**
 * Hook to load patient context for the Meal Composer Engine.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatientContext } from "@/lib/mealComposer";

export function usePatientComposerContext(patientId: string | null | undefined): {
  ctx: PatientContext | null;
  loading: boolean;
} {
  const [ctx, setCtx] = useState<PatientContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      const allergies: string[] = [];
      const intolerances: string[] = [];
      const restrictions: string[] = [];
      const dislikedFoods: string[] = [];
      const clinicalFlags: string[] = [];
      let objective = "";

      // Load anamnesis
      const { data: anamnesis } = await supabase
        .from("patient_anamnesis")
        .select("food_allergies, food_intolerances, dietary_restrictions, disliked_foods, primary_goal")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesis) {
        if (Array.isArray(anamnesis.food_allergies)) allergies.push(...anamnesis.food_allergies);
        if (Array.isArray(anamnesis.food_intolerances)) intolerances.push(...anamnesis.food_intolerances);
        if (Array.isArray(anamnesis.dietary_restrictions)) restrictions.push(...anamnesis.dietary_restrictions);
        if (Array.isArray(anamnesis.disliked_foods)) dislikedFoods.push(...anamnesis.disliked_foods);
        if (anamnesis.primary_goal) objective = String(anamnesis.primary_goal);
      }

      // Load clinical flags
      const { data: flags } = await supabase
        .from("patient_clinical_flags")
        .select("flag_key")
        .eq("patient_id", patientId)
        .eq("is_active", true);

      if (flags) {
        clinicalFlags.push(...flags.map((f: any) => f.flag_key));
      }

      if (!cancelled) {
        setCtx({
          patientId,
          allergies,
          intolerances,
          restrictions,
          dislikedFoods,
          clinicalFlags,
          objective,
        });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [patientId]);

  return { ctx, loading };
}
