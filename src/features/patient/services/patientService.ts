import { supabase } from "@/integrations/supabase/client";
import { PatientPlan, MealCompletion } from "../types";

export const patientService = {
  async getPlanById(planId: string): Promise<PatientPlan | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        id,
        patient_id,
        meals,
        created_at,
        sharing_token,
        nutritionist_patients (
          name,
          goal,
          calories_target,
          protein_target,
          carbs_target,
          fat_target
        )
      `)
      .eq('id', planId)
      .single();

    if (error || !data) return null;

    const patientData = data.nutritionist_patients as any;

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.name || 'Paciente',
      goal: patientData?.goal || '',
      calories_target: patientData?.calories_target || 0,
      protein_target: patientData?.protein_target || 0,
      carbs_target: patientData?.carbs_target || 0,
      fat_target: patientData?.fat_target || 0,
      meals: data.meals as any[],
      created_at: data.created_at,
      sharing_token: data.sharing_token
    };
  },

  async getPlanByToken(token: string): Promise<PatientPlan | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        id,
        patient_id,
        meals,
        created_at,
        sharing_token,
        nutritionist_patients (
          name,
          goal,
          calories_target,
          protein_target,
          carbs_target,
          fat_target
        )
      `)
      .eq('sharing_token', token)
      .single();

    if (error || !data) return null;

    const patientData = data.nutritionist_patients as any;

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.name || 'Paciente',
      goal: patientData?.goal || '',
      calories_target: patientData?.calories_target || 0,
      protein_target: patientData?.protein_target || 0,
      carbs_target: patientData?.carbs_target || 0,
      fat_target: patientData?.fat_target || 0,
      meals: data.meals as any[],
      created_at: data.created_at,
      sharing_token: data.sharing_token
    };
  },

  async toggleMealCompletion(planId: string, mealId: string, patientId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if exists
    const { data: existing } = await supabase
      .from('patient_meal_completions')
      .select('id')
      .eq('meal_plan_id', planId)
      .eq('meal_id', mealId)
      .eq('completed_at', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('patient_meal_completions')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      await supabase
        .from('patient_meal_completions')
        .insert({
          meal_plan_id: planId,
          meal_id: mealId,
          completed_at: today,
          nutritionist_patient_id: patientId
        });
      return true;
    }
  },

  async getTodayCompletions(planId: string): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('patient_meal_completions')
      .select('meal_id')
      .eq('meal_plan_id', planId)
      .eq('completed_at', today);
    
    return data?.map(c => c.meal_id) || [];
  },

  async logAccess(planId: string, type: 'view' | 'export'): Promise<void> {
    await supabase.from('user_behavior_events').insert({
      event_type: `patient_plan_${type}`,
      metadata: { plan_id: planId },
      created_at: new Date().toISOString()
    });
  }
};
