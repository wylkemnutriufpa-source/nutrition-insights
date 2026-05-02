import { supabase } from "@/integrations/supabase/client";
import { PatientPlan, MealCompletion } from "../types";

export const patientService = {
  async getPlanById(planId: string): Promise<PatientPlan | null> {
    const { data, error } = await supabase
      .from('meal_plans' as any)
      .select(`
        id,
        patient_id,
        created_at,
        sharing_token,
        nutritionist_patients (
          id,
          name:notes,
          goal:status
        )
      `)
      .eq('id', planId)
      .maybeSingle();

    if (error || !data) return null;

    // Fetch items separately since they are in a different table
    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', planId);

    const patientData = (data as any).nutritionist_patients;

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.name || 'Paciente',
      goal: patientData?.goal || '',
      calories_target: (data as any).total_target_calories || 0,
      protein_target: (data as any).total_target_protein || 0,
      carbs_target: (data as any).total_target_carbs || 0,
      fat_target: (data as any).total_target_fat || 0,
      meals: this.groupItemsIntoMeals(items || []),
      created_at: data.created_at,
      sharing_token: data.sharing_token
    };
  },

  async getPlanByToken(token: string): Promise<PatientPlan | null> {
    const { data, error } = await supabase
      .from('meal_plans' as any)
      .select(`
        id,
        patient_id,
        created_at,
        sharing_token,
        nutritionist_patients (
          id,
          name:notes,
          goal:status
        )
      `)
      .eq('sharing_token', token)
      .maybeSingle();

    if (error || !data) return null;

    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', data.id);

    const patientData = (data as any).nutritionist_patients;

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.name || 'Paciente',
      goal: patientData?.goal || '',
      calories_target: (data as any).total_target_calories || 0,
      protein_target: (data as any).total_target_protein || 0,
      carbs_target: (data as any).total_target_carbs || 0,
      fat_target: (data as any).total_target_fat || 0,
      meals: this.groupItemsIntoMeals(items || []),
      created_at: data.created_at,
      sharing_token: data.sharing_token
    };
  },

  groupItemsIntoMeals(items: any[]): any[] {
    const mealsMap: Record<string, any> = {};
    
    items.forEach(item => {
      const mealName = item.title || 'Refeição';
      if (!mealsMap[mealName]) {
        mealsMap[mealName] = {
          id: item.id,
          name: mealName,
          items: [],
          time: ''
        };
      }
      
      mealsMap[mealName].items.push({
        id: item.id,
        name: item.description || 'Alimento',
        kcal: item.calories_target || 0,
        protein: item.protein_target || 0,
        carbs: item.carbs_target || 0,
        fat: item.fat_target || 0,
        portionValue: 1,
        portionUnitLabel: 'unidade',
        imageUrl: item.image_url
      });
    });

    return Object.values(mealsMap);
  },

  async toggleMealCompletion(planId: string, mealId: string, patientId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing } = await supabase
      .from('patient_meal_completions' as any)
      .select('id')
      .eq('meal_plan_id', planId)
      .eq('meal_id', mealId)
      .eq('completed_at', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('patient_meal_completions' as any)
        .delete()
        .eq('id', (existing as any).id);
      return false;
    } else {
      await supabase
        .from('patient_meal_completions' as any)
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
      .from('patient_meal_completions' as any)
      .select('meal_id')
      .eq('meal_plan_id', planId)
      .eq('completed_at', today);
    
    return (data as any[])?.map(c => c.meal_id) || [];
  },

  async logAccess(planId: string, type: 'view' | 'export'): Promise<void> {
    await supabase.from('user_behavior_events' as any).insert({
      event_name: `patient_plan_${type}`,
      context: { plan_id: planId },
      created_at: new Date().toISOString()
    });
  }
};
