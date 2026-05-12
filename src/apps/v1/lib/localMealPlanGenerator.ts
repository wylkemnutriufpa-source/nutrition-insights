import { supabase } from "@/integrations/supabase/client";
import { 
  generateMealPlanFromLibrary, 
  loadPatientProfile, 
  slotsToInserts,
  setGenerationSeed 
} from "./mealPlanAutoGenerator";
import { createMealPlanDraft } from "./createMealPlanDraft";
import { getTenantIdForInsert } from "./tenantQueryHelpers";

export interface LocalGenerateParams {
  patientId: string;
  nutritionistId: string;
  weight?: number | null;
  height?: number | null;
  mealCount?: number;
  cookingPreference?: string | null;
  planCount?: number;
  isPipeline?: boolean;
  meal_plan_id?: string;
}

export async function localGenerateMealPlan(params: LocalGenerateParams) {
  console.log("[localGenerateMealPlan] Iniciando geração local NutriCore V2", params);
  
  // 1. Carregar perfil do paciente (anamnese + avaliação física)
  const profile = await loadPatientProfile(params.patientId);
  if (!profile) {
    throw new Error("Não foi possível carregar os dados clínicos do paciente. Verifique se a anamnese ou avaliação física estão completas.");
  }

  // Sobrescrever com parâmetros fornecidos se existirem
  if (params.weight) profile.weight = params.weight;
  
  // 2. Resolver ou Criar o plano no banco
  let planId = params.meal_plan_id;

  if (!planId) {
    const { data: plan, error: planError } = await createMealPlanDraft({
      nutritionistId: params.nutritionistId,
      patientId: params.patientId,
      tenantId: null,
      editorVersion: "v2",
      title: "Plano Gerado (NutriCore V2)"
    });

    if (planError || !plan) {
      throw new Error("Falha ao criar rascunho do plano: " + (planError?.message || "Erro desconhecido"));
    }
    planId = plan.id;
  } else {
    // Se já temos um plano, limpar os itens antigos antes de regenerar
    await supabase.from("meal_plan_items").delete().eq("meal_plan_id", planId);
  }

  // 3. Gerar planos (Suporta multi-plan se solicitado)
  const planCount = params.planCount || 1;
  const generatedPlans = [];

  for (let i = 0; i < planCount; i++) {
    setGenerationSeed(params.patientId, i);
    const result = await generateMealPlanFromLibrary(profile);

    if (result.success && result.slots.length > 0) {
      // Se for o primeiro plano, ou se for plano único, salvamos no plano principal (planId)
      let targetPlanId = planId;
      
      // Se for multi-plan e não for o primeiro, criamos planos adicionais
      if (i > 0) {
        const { data: extraPlan } = await createMealPlanDraft({
          nutritionistId: params.nutritionistId,
          patientId: params.patientId,
          tenantId: null,
          editorVersion: "v2",
          title: `Opção ${i + 1} (NutriCore V2)`
        });
        if (extraPlan) targetPlanId = extraPlan.id;
      }

      const inserts = await slotsToInserts(result.slots, targetPlanId);
      await supabase.from("meal_plan_items").insert(inserts);
      
      await supabase.from("meal_plans").update({
        plan_status: "under_professional_review",
        generation_source: "nutricore_v2_local",
        generation_metadata: result.metadata as any,
        total_target_calories: profile.targetCalories,
        total_target_protein: profile.targetProtein,
        total_target_carbs: profile.targetCarbs,
        total_target_fat: profile.targetFat,
      } as any).eq("id", targetPlanId);

      generatedPlans.push({
        mealPlanId: targetPlanId,
        items_count: result.slots.length,
        metadata: result.metadata
      });
    }
  }

  if (generatedPlans.length === 0) {
    throw new Error("O motor local não conseguiu gerar refeições válidas.");
  }

  return {
    success: true,
    mealPlanId: generatedPlans[0].mealPlanId,
    items_count: generatedPlans[0].items_count,
    metadata: generatedPlans[0].metadata,
    multiPlan: generatedPlans.length > 1,
    plans: generatedPlans
  };
}
