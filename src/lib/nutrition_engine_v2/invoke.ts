/**
 * Helper de invocação do motor V2.
 *
 * Feature flag POR PLANO: o consumidor decide na hora se usa V2 ou o motor antigo.
 * Não há flag persistida — cada chamada é explícita.
 *
 * Exemplo:
 *   import { generateWithEngineV2 } from "@/lib/nutrition_engine_v2/invoke";
 *   const r = await generateWithEngineV2({ patient_id, dry_run: true });
 *   console.log(r.metrics.target_kcal);
 */

import { supabase } from "@/integrations/supabase/client";
import type { Goal, Sex, ActivityLevel } from "./constants";

export interface EngineV2Request {
  patient_id: string;
  /** Se omitido, a função busca em profiles. */
  patient_input?: {
    weight_kg: number;
    height_cm: number;
    sex: Sex;
    birth_date?: string | null;
    age?: number | null;
    activity_level: ActivityLevel;
    goal: Goal;
  };
  /** true = só calcula, não persiste plano. */
  dry_run?: boolean;
  plan_title?: string;
  /** Se passado, popula este plano em vez de criar um novo. */
  existing_plan_id?: string;
}

export async function generateWithEngineV2(req: EngineV2Request) {
  const { data, error } = await supabase.functions.invoke("generate-meal-plan-v2", {
    body: req,
  });
  if (error) throw error;
  return data as {
    success?: boolean;
    plan_id?: string;
    engine_version: string;
    metrics: {
      age: number; imc: number; tmb: number; get: number;
      target_kcal: number; protein_g: number; carb_g: number; fat_g: number;
    };
    meals: Array<{
      type: string; name: string; target_kcal: number;
      items: Array<{ food_id: string; food_name: string; grams: number; kcal: number; protein: number; carb: number; fat: number; fiber: number }>;
      totals: { kcal: number; protein: number; carb: number; fat: number; fiber: number };
    }>;
    unresolved_items: string[];
  };
}
