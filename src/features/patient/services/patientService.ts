import { supabase } from "@/integrations/supabase/client";
import { PatientPlan } from "../types";

export const patientService = {
  mapSnapshotPlan(data: any, patientData: any, fallbackEditorVersion = 'snapshot'): PatientPlan {
    const snapshot = data.snapshot as any;
    if (!snapshot || (!snapshot.days && !snapshot.meals)) {
      throw new Error("Erro crítico: Os dados deste plano estão indisponíveis no momento (Snapshot Missing).");
    }

    const currentDow = new Date().getDay();
    const snapshotDays = Array.isArray(snapshot.days) ? snapshot.days : null;
    let dayData = null;
    if (snapshotDays) {
      dayData = snapshotDays.find((d: any) => d.day_of_week === currentDow) || snapshotDays[0];
    } else if (snapshot.meals && Array.isArray(snapshot.meals)) {
      const mealsForDay = snapshot.meals.filter((m: any) => m.day_of_week === currentDow || m.day_of_week === undefined);
      dayData = { meals: mealsForDay.length > 0 ? mealsForDay : snapshot.meals };
    }

    const mappedMeals = (dayData?.meals || snapshot.meals || []).map((m: any) => {
      const allItems = m.items || [];
      const primaryItems = allItems.filter((it: any) => it.is_primary !== false);
      return {
        id: m.tipo_refeicao || m.type || m.name || m.id,
        name: m.tipo_refeicao || m.type || m.name || 'Refeição',
        time: m.time || '',
        items: primaryItems.map((it: any) => ({
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
          substitutions: Array.isArray(it.substitutions) ? it.substitutions : []
        }))
      };
    });

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.notes || 'Paciente',
      goal: patientData?.status || '',
      meta_calorias: Number(snapshot.targets?.kcal || data.total_meta_calorias || 0),
      meta_proteinas: Number(snapshot.targets?.protein_g || data.total_meta_proteinas || 0),
      meta_carboidratos: Number(snapshot.targets?.carbs_g || data.total_meta_carboidratos || 0),
      meta_gorduras: Number(snapshot.targets?.fat_g || data.total_meta_gorduras || 0),
      meals: mappedMeals,
      created_at: data.created_at,
      sharing_token: data.sharing_token,
      editor_version: fallbackEditorVersion
    } as any;
  },

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
        total_meta_calorias,
        total_meta_proteinas,
        total_meta_carboidratos,
        total_meta_gorduras,
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
    
    // --- SNAPSHOT-FIRST: não depende de editor_version ---
    if (data.snapshot && (Array.isArray(data.snapshot.days) || Array.isArray(data.snapshot.meals))) {
      return this.mapSnapshotPlan(data, patientData, data.editor_version || 'snapshot');
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
      meta_calorias: data.total_meta_calorias || 0,
      meta_proteinas: data.total_meta_proteinas || 0,
      meta_carboidratos: data.total_meta_carboidratos || 0,
      meta_gorduras: data.total_meta_gorduras || 0,
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
        total_meta_calorias,
        total_meta_proteinas,
        total_meta_carboidratos,
        total_meta_gorduras,
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
      // 🛡️ SOBERANIA V3: Tenta encontrar o dia atual no snapshot estruturado
      const snapshotDays = Array.isArray(snapshot.days) ? snapshot.days : null;
      let dayData = null;
      
      if (snapshotDays) {
        dayData = snapshotDays.find((d: any) => d.day_of_week === currentDow) || snapshotDays[0];
      } else if (snapshot.meals && Array.isArray(snapshot.meals)) {
        // Fallback para quando o snapshot ainda está no formato flat
        const mealsForDay = snapshot.meals.filter((m: any) => m.day_of_week === currentDow || m.day_of_week === undefined);
        dayData = { meals: mealsForDay.length > 0 ? mealsForDay : snapshot.meals };
      }
      
      // 🛡️ SOBERANIA V3: Mapear respeitando hierarquia de substituições
      const mappedMeals = (dayData?.meals || snapshot.meals || []).map((m: any) => {
        const allItems = m.items || [];
        const primaryItems = allItems.filter((it: any) => it.is_primary !== false);
        
        return {
          id: m.tipo_refeicao || m.id,
          name: m.tipo_refeicao || m.name,
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
        meta_calorias: Number(snapshot.targets?.kcal || data.total_meta_calorias || 0),
        meta_proteinas: Number(snapshot.targets?.protein_g || data.total_meta_proteinas || 0),
        meta_carboidratos: Number(snapshot.targets?.carbs_g || data.total_meta_carboidratos || 0),
        meta_gorduras: Number(snapshot.targets?.fat_g || data.total_meta_gorduras || 0),
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
      meta_calorias: data.total_meta_calorias || 0,
      meta_proteinas: data.total_meta_proteinas || 0,
      meta_carboidratos: data.total_meta_carboidratos || 0,
      meta_gorduras: data.total_meta_gorduras || 0,
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
        kcal: Number(item.meta_calorias) || 0,
        protein: Number(item.meta_proteinas) || 0,
        carbs: Number(item.meta_carboidratos) || 0,
        fat: Number(item.meta_gorduras) || 0,
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
