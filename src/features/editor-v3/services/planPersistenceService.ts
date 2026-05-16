import { supabase } from '@/integrations/supabase/client';
import type { Meal, DraftPayload } from '../types';
import { saveDraft } from './draftService';

export interface PlanSaveOptions {
  patientId: string;
  nutritionistId: string;
  meals: Meal[];
  targets: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  title?: string;
  planId?: string;
  draftId?: string | null;
}

export interface SaveResult {
  ok: boolean;
  planId?: string;
  error?: string;
}

/**
 * SERVIÇO SOBERANO DE PERSISTÊNCIA V3
 * Único caminho para salvar e publicar planos.
 */
export const planPersistenceService = {
  /**
   * Salva o estado atual como um rascunho (auto-save)
   */
  async saveAsDraft(draftId: string, meals: Meal[], auditLog: any[] = []): Promise<boolean> {
    const result = await saveDraft(draftId, meals, auditLog);
    return !!result;
  },

  /**
   * PUBLICAÇÃO SOBERANA V3
   * Salva o plano oficial e seus itens, garantindo que o Patient App receba um snapshot pronto.
   */
  async publishPlan(options: PlanSaveOptions): Promise<SaveResult> {
    const { patientId, nutritionistId, meals, targets, title, planId, draftId } = options;

    // 🛡️ REGRAS INVIOLÁVEIS: Macros devem ser saudáveis para publicar
    const hasMacros = targets.kcal > 0 && targets.protein > 0;
    if (!hasMacros) {
      return { ok: false, error: 'SNAPSHOT INCOMPLETO: Macros não podem ser zero.' };
    }

    try {
      // 1. Obter Tenant ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', nutritionistId)
        .single();
      const tenantId = profile?.tenant_id || '20081963-8db9-4a6c-8181-6a820b86e12f';

      // 2. Construir Snapshot Soberano V3
      // O Patient App apenas RENDERIZA este objeto.
      const daysList = Array.from(new Set(meals.map(m => m.day_of_week ?? 1))).sort((a, b) => a - b);
      const snapshot = {
        meals, // Flat list para busca rápida
        targets,
        days: daysList.map(day => ({
          day_of_week: day,
          meals: meals.filter(m => (m.day_of_week ?? 1) === day)
        })),
        version: 'v3',
        published_at: new Date().toISOString()
      };

      const payload: any = {
        patient_id: patientId,
        nutritionist_id: nutritionistId,
        tenant_id: tenantId,
        title: title || "Plano Alimentar Soberano V3",
        snapshot,
        total_meta_calorias: Math.round(targets.kcal),
        total_meta_proteinas: Math.round(targets.protein),
        total_meta_carboidratos: Math.round(targets.carbs),
        total_meta_gorduras: Math.round(targets.fat),
        plan_status: 'published_to_patient',
        is_active: true,
        plan_mode: 'weekly',
        editor_version: 'v3',
        start_date: new Date().toISOString().split('T')[0],
      };

      let finalPlanId = planId;

      // 3. Persistência Principal (meal_plans)
      if (planId) {
        const { error } = await supabase
          .from('meal_plans')
          .update(payload as any)
          .eq('id', planId);
        if (error) throw error;
      } else {
        // Desativar planos antigos se for novo
        await supabase
          .from('meal_plans')
          .update({ is_active: false } as any)
          .eq('patient_id', patientId);

        const { data: newPlan, error } = await supabase
          .from('meal_plans')
          .insert([payload as any])
          .select()
          .single();
        if (error) throw error;
        finalPlanId = newPlan.id;
      }

      // 4. Persistência Relacional (meal_plan_items) — Para Shopping List e Relatórios
      if (finalPlanId) {
        await supabase.from('meal_plan_items').delete().eq('meal_plan_id', finalPlanId);
        
        const itemsRows: any[] = [];
        meals.forEach(meal => {
          meal.items.forEach(item => {
            const groupId = item.substitution_group_id || crypto.randomUUID();
            
            // Primário
            itemsRows.push({
              meal_plan_id: finalPlanId,
              tenant_id: tenantId,
              tipo_refeicao: meal.name,
              day_of_week: meal.day_of_week ?? 1,
              title: item.name,
              description: item.portionLabel || `${item.quantity || 1}${item.portionUnit || 'g'}`,
              meta_calorias: Math.round(item.kcal || 0),
              meta_proteinas: Number((item.protein || 0).toFixed(1)),
              meta_carboidratos: Number((item.carbs || 0).toFixed(1)),
              meta_gorduras: Number((item.fat || 0).toFixed(1)),
              image_url: item.imageUrl,
              is_primary: true,
              substitution_group_id: groupId,
              editor_version: 'v3',
              edit_metadata: { ...item, editor_version: 'v3' }
            });

            // Substituições
            if (item.substitutions) {
              item.substitutions.forEach((sub: any) => {
                itemsRows.push({
                  meal_plan_id: finalPlanId,
                  tenant_id: tenantId,
                  tipo_refeicao: meal.name,
                  day_of_week: meal.day_of_week ?? 1,
                  title: sub.name,
                  description: sub.portionLabel || `${sub.quantity || 100}g`,
                  meta_calorias: Math.round(sub.kcal || 0),
                  meta_proteinas: Number((sub.protein || 0).toFixed(1)),
                  meta_carboidratos: Number((sub.carbs || 0).toFixed(1)),
                  meta_gorduras: Number((sub.fat || 0).toFixed(1)),
                  image_url: sub.imageUrl,
                  is_primary: false,
                  substitution_group_id: groupId,
                  editor_version: 'v3',
                  edit_metadata: { ...sub, editor_version: 'v3' }
                });
              });
            }
          });
        });

        if (itemsRows.length > 0) {
          await supabase.from('meal_plan_items').insert(itemsRows);
        }
      }

      // 5. Atualizar Draft (se houver)
      if (draftId) {
        await supabase
          .from('v3_drafts' as any)
          .update({
            draft_status: 'promoted',
            promoted_meal_plan_id: finalPlanId,
            promoted_at: new Date().toISOString(),
          })
          .eq('id', draftId);
      }

      return { ok: true, planId: finalPlanId };
    } catch (err: any) {
      console.error('[Persistence] Erro fatal:', err);
      return { ok: false, error: err.message };
    }
  }
};
