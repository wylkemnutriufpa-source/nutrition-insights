/**
 * Hook to load patient context for the Meal Composer Engine.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatientContext } from "@/lib/mealComposer";

function extractArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter(v => typeof v === "string");
  if (typeof val === "string" && val.trim()) return [val];
  return [];
}

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

      // Load anamnesis — data lives in the `answers` JSONB column
      const { data: anamnesis } = await supabase
        .from("patient_anamnesis")
        .select("answers")
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesis?.answers && typeof anamnesis.answers === "object") {
        const a = anamnesis.answers as Record<string, unknown>;
        allergies.push(...extractArray(a.food_allergies ?? a.allergies));
        intolerances.push(...extractArray(a.food_intolerances ?? a.intolerances));
        restrictions.push(...extractArray(a.dietary_restrictions ?? a.restrictions));
        dislikedFoods.push(...extractArray(a.disliked_foods));
        if (a.primary_goal) objective = String(a.primary_goal);
        else if (a.goal) objective = String(a.goal);
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
