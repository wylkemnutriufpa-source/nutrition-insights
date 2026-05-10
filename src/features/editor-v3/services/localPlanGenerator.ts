
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
    // 1. Get patient profile and resolve correct IDs
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${patientId},user_id.eq.${patientId}`)
      .maybeSingle();

    if (!profile) throw new Error("Paciente não encontrado");

    // 2. Get clinical data (Prioritized Fallback)
    const { data: anamnesis } = await supabase
      .from('patient_anamnesis')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const [{ data: assessment }, { data: weightHistory }] = await Promise.all([
      supabase
        .from('physical_assessments')
        .select('*')
        .eq('patient_id', profile.user_id)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('patient_weight_history')
        .select('weight')
        .eq('patient_id', profile.user_id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    const answers = (anamnesis?.answers || {}) as any;
    
    // 🛡️ Motor de Priorização Antropométrica (Regra de Ouro)
    // 1. Profile (Source of Truth)
    // 2. Histórico de Peso (Check-ins/Feedbacks)
    // 3. Avaliação Física (Medido)
    // 4. Anamnese (Auto-reportado)
    // 5. Fallback 70kg (Segurança final)
    
    let weight = Number(profile.current_weight_kg || 0);
    let weightSource = 'profile';

    if (weight <= 0) {
      if (weightHistory?.weight) {
        weight = Number(weightHistory.weight);
        weightSource = 'weight_history';
      } else if (assessment?.weight) {
        weight = Number(assessment.weight);
        weightSource = 'assessment';
      } else if (answers.weight) {
        weight = Number(answers.weight);
        weightSource = 'anamnesis';
      } else {
        weight = 70;
        weightSource = 'fallback_safety';
      }
    }

    console.log(`[localPlanGenerator] Initial weight (${weight}kg) used. Source: ${weightSource}`);

    let height = Number(profile.current_height_cm || 0);
    if (height <= 0) height = Number(answers.height || 0);
    if (height <= 0 && assessment?.height) height = Number(assessment.height);
    if (height <= 0) height = 170; // Fallback final

    const context: PatientContext = {
      id: profile.id,
      name: profile.full_name || 'Paciente',
      goal: profile.goal || answers.goal || 'maintain',
      restrictions: profile.restrictions || answers.restrictions || [],
      preferences: profile.preferences || (answers.food_preferences ? [answers.food_preferences] : []),
      weight,
      height,
      age: answers.age || 30,
      gender: answers.sex || 'male',
      activityLevel: profile.activity_level || answers.activity_level || 'moderate',
      calories_target: Number(anamnesis?.computed_kcal_target) || Number(assessment?.calories_target) || 2000,
      protein_target: Number(anamnesis?.computed_protein) || Number(assessment?.protein_target) || 150,
      carbs_target: Number(anamnesis?.computed_carbs) || Number(assessment?.carbs_target) || 200,
      fat_target: Number(anamnesis?.computed_fat) || Number(assessment?.fat_target) || 60
    };

    // 2. Generate plan using NutriCore V2 Adapter (LOCAL)
    // We need some available foods, or it will use defaults
    const meals = await NutriCoreV2Adapter.generateElitePlan(context, []);

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
