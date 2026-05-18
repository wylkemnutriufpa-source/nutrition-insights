import { supabase } from "@/integrations/supabase/client";
import { PatientPlan } from "../types";

export const patientService = {
  mapSnapshotPlan(data: any, patientData: any, fallbackEditorVersion?: string): PatientPlan {
    const snapshot = data.snapshot as any;
    
    // 🛡️ SOBERANIA V3: Se o plano é V3, o snapshot é OBRIGATÓRIO e SOBERANO.
    if (data.editor_version === 'v3' || (snapshot && snapshot.snapshot_version === 'v3')) {
      if (!snapshot) {
        throw new Error("[Sovereign App] CRITICAL: Plano V3 sem Snapshot detectado. Abortando renderização.");
      }
    } else {
      return this.mapLegacyPlan(data, patientData);
    }

    const currentDow = new Date().getDay();
    const snapshotDays = snapshot.days || [];
    
    // 🛡️ SOBERANIA V3: Localizar o dia atual estritamente pelo day_of_week compilado no snapshot.
    // O Patient App não infere mais nada.
    const dayData = snapshotDays.find((d: any) => d.day_of_week === currentDow) || snapshotDays[0];

    if (!dayData) {
      console.error("[Sovereign App] Snapshot V3 está incompleto ou corrompido: Nenhum dia encontrado.");
      return this.mapLegacyPlan(data, patientData);
    }

    // 🛡️ MAPEAMENTO PASSIVO: Apenas de-estruturamos o que o Compiler gerou.
    const mappedMeals = dayData.meals.map((m: any) => ({
      id: m.id,
      name: m.name,
      time: m.time || '',
      items: m.items.map((it: any) => ({
        id: it.id,
        name: it.title,
        description: '', // Descrição agora é responsabilidade do snapshot/instructions
        kcal: it.macros?.kcal || 0,
        protein: it.macros?.protein_g || 0,
        carbs: it.macros?.carbs_g || 0,
        fat: it.macros?.fat_g || 0,
        display_quantity: it.quantity_display,
        clinical_mass_g: it.clinical_mass_g,
        imageUrl: it.visual?.image_url,
        substitutions: (it.substitutions || []).map((sub: any) => ({
          id: sub.id,
          name: sub.title,
          kcal: sub.macros?.kcal || 0,
          protein: sub.macros?.protein_g || 0,
          carbs: sub.macros?.carbs_g || 0,
          fat: sub.macros?.fat_g || 0,
          display_quantity: sub.quantity_display,
          imageUrl: sub.visual?.image_url
        }))
      }))
    }));

    return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.notes || 'Paciente',
      goal: patientData?.status || '',
      // Usar targets compilados no snapshot
      meta_calorias: snapshot.targets?.kcal || 0,
      meta_proteinas: snapshot.targets?.protein_g || 0,
      meta_carboidratos: snapshot.targets?.carbs_g || 0,
      meta_gorduras: snapshot.targets?.fat_g || 0,
      meals: mappedMeals,
      created_at: data.created_at,
      sharing_token: data.sharing_token,
      editor_version: 'v3'
    } as any;
  },

  mapLegacyPlan(data: any, patientData: any): PatientPlan {
     return {
      id: data.id,
      patient_id: data.patient_id,
      patient_name: patientData?.notes || 'Paciente',
      goal: patientData?.status || '',
      meta_calorias: data.total_meta_calorias || 0,
      meta_proteinas: data.total_meta_proteinas || 0,
      meta_carboidratos: data.total_meta_carboidratos || 0,
      meta_gorduras: data.total_meta_gorduras || 0,
      meals: [], // Will be filled by groupItemsIntoMeals
      created_at: data.created_at,
      sharing_token: data.sharing_token,
      editor_version: data.editor_version || 'v1'
    };
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
    
    if (data.snapshot && (data.snapshot.snapshot_version === 'v3' || data.snapshot.days)) {
      return this.mapSnapshotPlan(data, patientData, data.editor_version);
    }

    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', planId);

    const plan = this.mapLegacyPlan(data, patientData);
    plan.meals = this.groupItemsIntoMeals(items || []);
    return plan;
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

    if (data.snapshot && (data.snapshot.snapshot_version === 'v3' || data.snapshot.days)) {
      return this.mapSnapshotPlan(data, patientData, data.editor_version);
    }

    const { data: items } = await supabase
      .from('meal_plan_items' as any)
      .select('*')
      .eq('meal_plan_id', data.id);

    const plan = this.mapLegacyPlan(data, patientData);
    plan.meals = this.groupItemsIntoMeals(items || []);
    return plan;
  },

  groupItemsIntoMeals(items: any[]): any[] {
    const mealsMap: Record<string, any> = {};
    
    items.forEach(item => {
      const mealName = item.tipo_refeicao || item.title || 'Refeição';
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
        name: item.title || 'Alimento',
        kcal: Number(item.meta_calorias) || 0,
        protein: Number(item.meta_proteinas) || 0,
        carbs: Number(item.meta_carboidratos) || 0,
        fat: Number(item.meta_gorduras) || 0,
        display_quantity: item.description,
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