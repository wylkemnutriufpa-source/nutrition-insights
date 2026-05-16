
import { supabase } from '@/integrations/supabase/client';
import { Meal, MealItem } from '../types';
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

    console.log(`[Persistence-V3] Iniciando publicação para paciente ${patientId}. Editor: V3.`);

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

      // 2. Higienização Soberana das Imagens (Remover Unsplash Fallbacks automáticos)
      const sanitizedMeals = meals.map(meal => ({
        ...meal,
        items: meal.items.map(item => {
          let imageUrl = item.imageUrl;
          if (imageUrl && imageUrl.includes('source.unsplash.com') && imageUrl.includes('?')) {
            imageUrl = null;
          }
          return {
            ...item,
            imageUrl,
            display_quantity: item.display_quantity || item.quantity,
            display_unit: item.display_unit || item.portionUnitLabel || item.portionLabel || 'g',
            substitutions: (item.substitutions || []).map(sub => {
              let subImg = (sub as any).imageUrl || (sub as any).image_url;
              if (subImg && subImg.includes('source.unsplash.com') && subImg.includes('?')) {
                subImg = null;
              }
              return {
                ...sub,
                imageUrl: subImg,
                display_quantity: (sub as any).display_quantity || sub.quantity || (sub as any).suggestedQuantity || (sub as any).portionValue,
                display_unit: (sub as any).display_unit || (sub as any).portionUnitLabel || (sub as any).portionLabel || (sub as any).portionUnit || 'g'
              };
            })
          };
        })
      }));

      // 3. Construir Snapshot Soberano V3
      const daysList = Array.from(new Set(sanitizedMeals.map(m => m.day_of_week ?? 1))).sort((a, b) => a - b);
      const snapshot = {
        meals: sanitizedMeals,
        targets,
        days: daysList.map(day => ({
          day_of_week: day,
          meals: sanitizedMeals.filter(m => (m.day_of_week ?? 1) === day)
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
        editor_version: 'v3', // 🛡️ FORÇAR V3 SEMPRE
        start_date: new Date().toISOString().split('T')[0],
      };

      // 🛡️ SNAPSHOT VALIDATOR (Anti-Traição)
      // Compara se o payload final preserva os macros calculados pelo nutricionista
      const snapshotKcal = payload.snapshot.targets.kcal;
      const payloadKcal = payload.total_meta_calorias;
      
      if (Math.abs(snapshotKcal - payloadKcal) > 1) {
         console.error(`[CRITICAL] Divergência de Snapshot detectada: Snapshot(${snapshotKcal}) != Payload(${payloadKcal}). Bloqueando publicação.`);
         return { ok: false, error: 'SNAPSHOT VALIDATION FAILED: Divergência de integridade detectada.' };
      }

      let finalPlanId = planId;

      // 4. Persistência Principal
      if (planId) {
        console.log(`[Persistence-V3] Atualizando plano existente ${planId}.`);
        const { error } = await supabase
          .from('meal_plans')
          .update(payload)
          .eq('id', planId);
        if (error) throw error;
      } else {
        console.log(`[Persistence-V3] Criando novo plano para o paciente.`);
        // Desativar planos anteriores
        await supabase
          .from('meal_plans')
          .update({ is_active: false } as any)
          .eq('patient_id', patientId);

        const { data: newPlan, error } = await supabase
          .from('meal_plans')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        finalPlanId = newPlan.id;
      }

      // 5. Persistência Relacional (Somente para compatibilidade de lista, Patient App V3 usa Snapshot)
      if (finalPlanId) {
        await supabase.from('meal_plan_items').delete().eq('meal_plan_id', finalPlanId);
        
        const itemsRows: any[] = [];
        sanitizedMeals.forEach(meal => {
          meal.items.forEach(item => {
            const groupId = item.substitution_group_id || crypto.randomUUID();
            
            itemsRows.push({
              meal_plan_id: finalPlanId,
              tenant_id: tenantId,
              tipo_refeicao: meal.name,
              day_of_week: meal.day_of_week ?? 1,
              title: item.name,
              description: `${item.display_quantity || item.quantity} ${item.display_unit || 'g'}`,
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

            if (item.substitutions) {
              item.substitutions.forEach((sub: any) => {
                itemsRows.push({
                  meal_plan_id: finalPlanId,
                  tenant_id: tenantId,
                  tipo_refeicao: meal.name,
                  day_of_week: meal.day_of_week ?? 1,
                  title: sub.name,
                  description: `${sub.display_quantity || sub.quantity || 100} ${sub.display_unit || 'g'}`,
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

      if (draftId) {
        await supabase
          .from('v3_drafts')
          .update({
            draft_status: 'promoted',
            promoted_meal_plan_id: finalPlanId,
            promoted_at: new Date().toISOString(),
          } as any)
          .eq('id', draftId);
      }

      console.log(`[Persistence-V3] Publicação concluída com sucesso. PlanID: ${finalPlanId}`);
      return { ok: true, planId: finalPlanId };
    } catch (err: any) {
      console.error('[Persistence-V3] Erro fatal:', err);
      return { ok: false, error: err.message };
    }
  }
};
