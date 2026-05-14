import { supabase } from "@/integrations/supabase/client";
import { PatientPlan } from "../types";

export const patientService = {
  async getPlanById(planId: string): Promise<PatientPlan | null> {
    const { data: rawData, error } = await supabase
      .from('meal_plans' as any)
      .select(`
        id,
        patient_id,
        created_at,
        sharing_token,
        editor_version,
        snapshot,
        total_target_calories,
        total_target_protein,
        total_target_carbs,
        total_target_fat,
        nutritionist_patients (
          id,
          notes,
          status
        )
      `)
      .eq('id', planId)
      .maybeSingle();

    if (error || !rawData) return null;
    const data = rawData as any;
    const patientData = data.nutritionist_patients;
    
    // --- FASE 1: SNAPSHOT-FIRST (SOBERANIA V3) ---
    if (data.editor_version === 'v3') {
      const snapshot = data.snapshot as any;
      if (!snapshot || (!snapshot.days && !snapshot.meals)) {
        console.error(`[CRITICAL] V3 Plan ${planId} missing snapshot. Access blocked.`);
        throw new Error("Erro crítico: Os dados deste plano estão indisponíveis no momento (Snapshot Missing).");
      }

      // 🛡️ Blindagem: Suportar estrutura de dias (Soberania V3)
      const currentDow = new Date().getDay();
      const dayData = snapshot.days?.find((d: any) => d.day_of_week === currentDow) || snapshot.days?.[0];
      
      // 🛡️ SOBERANIA V3: Mapear respeitando hierarquia de substituições
      const mappedMeals = (dayData?.meals || snapshot.meals || []).map((m: any) => {
        const allItems = m.items || [];
        // Filtramos apenas itens primários para a lista principal
        const primaryItems = allItems.filter((it: any) => it.is_primary !== false);
        
        return {
          id: m.meal_type || m.id,
          name: m.meal_type || m.name,
          time: '',
          items: primaryItems.map((it: any) => {
            // Buscamos as substituições que pertencem ao mesmo grupo deste item
            const itemSubs = allItems.filter((sub: any) => 
              sub.is_primary === false && 
              sub.substitution_group_id === it.substitution_group_id &&
              it.substitution_group_id !== null &&
              sub.id !== it.id
            ).map((sub: any) => ({
              id: sub.id,
              name: sub.title || sub.name,
              kcal: Number(sub.macros?.kcal || sub.kcal || 0),
              protein: Number(sub.macros?.protein_g || sub.protein || 0),
              carbs: Number(sub.macros?.carbs_g || sub.carbs || 0),
              fat: Number(sub.macros?.fat_g || sub.fat || 0),
              display_quantity: sub.display_quantity || sub.quantity,
              display_unit: sub.display_unit || sub.portionUnitLabel,
              clinical_mass_g: sub.clinical_mass_g
            }));

            return {
              id: it.id || it.instanceId,
              name: it.title || it.name,
              description: it.description || it.notes,
              kcal: Number(it.macros?.kcal || it.kcal || 0),
              protein: Number(it.macros?.protein_g || it.protein || 0),
              carbs: Number(it.macros?.carbs_g || it.carbs || 0),
              fat: Number(it.macros?.fat_g || it.fat || 0),
              quantity: it.quantity || it.display_quantity || 1,
              portionValue: it.display_quantity || it.quantity || 1,
              portionUnitLabel: it.display_unit || it.portionUnitLabel || 'unidade',
              imageUrl: it.image_url || it.imageUrl,
              display_quantity: it.display_quantity,
              display_unit: it.display_unit,
              clinical_mass_g: it.clinical_mass_g,
              substitutions: itemSubs
            };
          })
        };
      });

      return {
        id: data.id,
        patient_id: data.patient_id,
        patient_name: patientData?.notes || 'Paciente',
        goal: patientData?.status || '',
        calories_target: Number(snapshot.targets?.kcal || data.total_target_calories || 0),
        protein_target: Number(snapshot.targets?.protein_g || data.total_target_protein || 0),
        carbs_target: Number(snapshot.targets?.carbs_g || data.total_target_carbs || 0),
        fat_target: Number(snapshot.targets?.fat_g || data.total_target_fat || 0),
        meals: mappedMeals,
        created_at: data.created_at,
        sharing_token: data.sharing_token,
        editor_version: 'v3'
      } as any;
    }

    // Fallback para V1/V2 (Legacy Relational)
    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', planId);

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.notes || 'Paciente',
      goal: patientData?.status || '',
      calories_target: data.total_target_calories || 0,
      protein_target: data.total_target_protein || 0,
      carbs_target: data.total_target_carbs || 0,
      fat_target: data.total_target_fat || 0,
      meals: this.groupItemsIntoMeals(items || []),
      created_at: data.created_at,
      sharing_token: data.sharing_token,
      editor_version: data.editor_version || 'v1'
    };
  },

  async getPlanByToken(token: string): Promise<PatientPlan | null> {
    const { data: rawData, error } = await supabase
      .from('meal_plans' as any)
      .select(`
        id,
        patient_id,
        created_at,
        sharing_token,
        editor_version,
        snapshot,
        total_target_calories,
        total_target_protein,
        total_target_carbs,
        total_target_fat,
        nutritionist_patients (
          id,
          notes,
          status
        )
      `)
      .eq('sharing_token', token)
      .maybeSingle();

    if (error || !rawData) return null;
    const data = rawData as any;
    const patientData = data.nutritionist_patients;

    // --- FASE 1: SNAPSHOT-FIRST (SOBERANIA V3) ---
    if (data.editor_version === 'v3') {
      const snapshot = data.snapshot as any;
      if (!snapshot || (!snapshot.days && !snapshot.meals)) {
        console.error(`[CRITICAL] V3 Plan (token) missing snapshot. Access blocked.`);
        throw new Error("Erro crítico: Os dados deste plano estão indisponíveis no momento (Snapshot Missing).");
      }

      const currentDow = new Date().getDay();
      const dayData = snapshot.days?.find((d: any) => d.day_of_week === currentDow) || snapshot.days?.[0];
      
      // 🛡️ SOBERANIA V3: Mapear respeitando hierarquia de substituições
      const mappedMeals = (dayData?.meals || snapshot.meals || []).map((m: any) => {
        const allItems = m.items || [];
        const primaryItems = allItems.filter((it: any) => it.is_primary !== false);
        
        return {
          id: m.meal_type || m.id,
          name: m.meal_type || m.name,
          time: '',
          items: primaryItems.map((it: any) => {
            const itemSubs = allItems.filter((sub: any) => 
              sub.is_primary === false && 
              sub.substitution_group_id === it.substitution_group_id &&
              it.substitution_group_id !== null &&
              sub.id !== it.id
            ).map((sub: any) => ({
              id: sub.id,
              name: sub.title || sub.name,
              description: sub.description || sub.notes,
              kcal: Number(sub.macros?.kcal || sub.kcal || 0),
              protein: Number(sub.macros?.protein_g || sub.protein || 0),
              carbs: Number(sub.macros?.carbs_g || sub.carbs || 0),
              fat: Number(sub.macros?.fat_g || sub.fat || 0),
              display_quantity: sub.display_quantity || sub.quantity,
              display_unit: sub.display_unit || sub.portionUnitLabel,
              clinical_mass_g: sub.clinical_mass_g
            }));

            return {
              id: it.id || it.instanceId,
              name: it.title || it.name,
              description: it.description || it.notes,
              kcal: Number(it.macros?.kcal || it.kcal || 0),
              protein: Number(it.macros?.protein_g || it.protein || 0),
              carbs: Number(it.macros?.carbs_g || it.carbs || 0),
              fat: Number(it.macros?.fat_g || it.fat || 0),
              portionValue: it.display_quantity || it.quantity || 1,
              portionUnitLabel: it.display_unit || it.portionUnitLabel || 'unidade',
              imageUrl: it.image_url || it.imageUrl,
              display_quantity: it.display_quantity,
              display_unit: it.display_unit,
              clinical_mass_g: it.clinical_mass_g,
              substitutions: itemSubs
            };
          })
        };
      });

      return {
        id: data.id,
        patient_id: data.patient_id,
        patient_name: patientData?.notes || 'Paciente',
        goal: patientData?.status || '',
        calories_target: Number(snapshot.targets?.kcal || data.total_target_calories || 0),
        protein_target: Number(snapshot.targets?.protein_g || data.total_target_protein || 0),
        carbs_target: Number(snapshot.targets?.carbs_g || data.total_target_carbs || 0),
        fat_target: Number(snapshot.targets?.fat_g || data.total_target_fat || 0),
        meals: mappedMeals,
        created_at: data.created_at,
        sharing_token: data.sharing_token,
        editor_version: 'v3'
      } as any;
    }

    // Fallback para V1/V2
    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', data.id);

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.notes || 'Paciente',
      goal: patientData?.status || '',
      calories_target: data.total_target_calories || 0,
      protein_target: data.total_target_protein || 0,
      carbs_target: data.total_target_carbs || 0,
      fat_target: data.total_target_fat || 0,
      meals: this.groupItemsIntoMeals(items || []),
      created_at: data.created_at,
      sharing_token: data.sharing_token,
      editor_version: data.editor_version || 'v1'
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
        kcal: Number(item.calories_target) || 0,
        protein: Number(item.protein_target) || 0,
        carbs: Number(item.carbs_target) || 0,
        fat: Number(item.fat_target) || 0,
        portionValue: 1,
        portionUnitLabel: 'unidade',
        imageUrl: item.image_url
      });
    });

    return Object.values(mealsMap);
  },

  async toggleMealCompletion(planId: string, mealId: string, patientId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existing, error: selectError } = await supabase
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
