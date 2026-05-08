
import { supabase } from "@/integrations/supabase/client";
import { NutriCoreV2Adapter } from "@/lib/nutricore_v2/adapter";
import { PatientContext, Meal } from "../types";
import { promoteDraftToMealPlan } from "./promoteDraft";

export async function generateAndSaveLocalPlan(
  patientId: string,
  nutritionistId: string,
  tenantId: string
) {
  try {
    // 1. Get patient context and anamnesis targets
    const [{ data: profile }, { data: anamnesis }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single(),
      supabase
        .from('patient_anamnesis')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (!profile) throw new Error("Paciente não encontrado");

    // Get answers from anamnesis to extract more details if available
    const answers = (anamnesis?.answers || {}) as any;

    const context: PatientContext = {
      id: profile.id,
      name: profile.full_name || 'Paciente',
      goal: profile.goal || answers.goal || 'maintain',
      restrictions: profile.restrictions || answers.restrictions || [],
      preferences: profile.preferences || (answers.food_preferences ? [answers.food_preferences] : []),
      weight: profile.current_weight_kg || answers.weight || 70,
      height: profile.current_height_cm || answers.height || 170,
      age: answers.age || 30,
      gender: answers.sex || 'male',
      activityLevel: profile.activity_level || answers.activity_level || 'moderate',
      calories_target: Number(anamnesis?.computed_kcal_target) || 2000,
      protein_target: Number(anamnesis?.computed_protein) || 150,
      carbs_target: Number(anamnesis?.computed_carbs) || 200,
      fat_target: Number(anamnesis?.computed_fat) || 60
    };

    // 2. Generate plan using NutriCore V2 Adapter (LOCAL)
    // We need some available foods, or it will use defaults
    const meals = NutriCoreV2Adapter.generateElitePlan(context, []);

    // 3. Save as a draft then promote, or save directly as a meal plan
    // For simplicity and to follow the current flow, we'll promote a virtual draft
    const draftPayload = {
      meals,
      version: 1,
      patient_context: context,
      nutritional_score: { value: 100, label: 'Ótimo', color: 'text-green-500' },
      confidence: { value: 100, label: 'Alta', color: 'text-green-500' }
    };

    const { data: mealPlan, error: promoteError } = await supabase
      .from('meal_plans')
      .insert({
        patient_id: profile.user_id || patientId,
        nutritionist_id: nutritionistId,
        tenant_id: tenantId,
        title: `Plano NutriCore V2 — ${new Date().toLocaleDateString('pt-BR')}`,
        plan_status: 'draft',
        editor_version: 'v3',
        start_date: new Date().toISOString().split('T')[0]
      } as any)
      .select()
      .single();

    if (promoteError) throw promoteError;

    // Insert items
    for (const meal of meals) {
      for (const item of meal.items) {
        // 🛡️ Usamos os macros diretamente conforme gerado pelo motor Elite
        await supabase.from('meal_plan_items').insert({
          meal_plan_id: mealPlan.id,
          title: item.name,
          meal_type: meal.name.toLowerCase().replace(/ /g, '_') as any,
          calories_target: Math.round(item.kcal),
          protein_target: item.protein,
          carbs_target: item.carbs,
          fat_target: item.fat,
          description: item.portionLabel || `${item.quantity}g`,
          tenant_id: tenantId
        } as any);
      }
    }

    return { success: true, mealPlanId: mealPlan.id };
  } catch (error: any) {
    console.error('[LocalPlanGen] Error:', error);
    return { success: false, error: error.message };
  }
}
