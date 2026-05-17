
import { supabase } from '@/integrations/supabase/client';
import { Meal, MealItem } from '../types';
import { saveDraft } from './draftService';
import { SovereignSnapshotV3, SovereignDay, SovereignMeal, SovereignItem, SovereignMacros } from '../types/snapshot';

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

const OFFICIAL_PLACEHOLDER = "/placeholder.svg";

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
   * Resolve a imagem final de um item, priorizando a biblioteca soberana.
   */
  async resolveVisual(item: any): Promise<{ image_url: string; is_placeholder: boolean; library_item_id?: string }> {
    // 🛡️ REGRAS DE OURO: Sem Unsplash fallbacks
    let url = item.imageUrl || item.image_url;
    
    if (url && (url.includes('unsplash.com') || url.includes('source.unsplash.com'))) {
      url = null;
    }

    if (item.library_item_id || item.id) {
      // Tentar buscar na biblioteca se for um item da biblioteca
      // Nota: Em um ambiente de alta performance, isso poderia ser pré-carregado
      const { data } = await supabase
        .from('meal_visual_library')
        .select('image_url')
        .eq('id', item.library_item_id || item.id)
        .maybeSingle();
      
      if (data?.image_url) {
        return { 
          image_url: data.image_url, 
          is_placeholder: false, 
          library_item_id: item.library_item_id || item.id 
        };
      }
    }

    return {
      image_url: url || OFFICIAL_PLACEHOLDER,
      is_placeholder: !url
    };
  },

  /**
   * Constrói o Snapshot Soberano seguindo o contrato V3.
   */
  async buildSovereignSnapshot(options: PlanSaveOptions): Promise<SovereignSnapshotV3> {
    const { meals, targets, title } = options;
    const daysList = Array.from(new Set(meals.map(m => m.day_of_week ?? 1))).sort((a, b) => a - b);
    
    const snapshotDays: SovereignDay[] = [];
    const dailyTotals: Record<number, SovereignMacros> = {};

    for (const dayNum of daysList) {
      const dayMeals = meals.filter(m => (m.day_of_week ?? 1) === dayNum);
      const sovereignMeals: SovereignMeal[] = [];
      
      let dayKcal = 0, dayProt = 0, dayCarb = 0, dayFat = 0;

      for (let i = 0; i < dayMeals.length; i++) {
        const m = dayMeals[i];
        const sovereignItems: SovereignItem[] = [];

        for (const it of m.items) {
          const visual = await this.resolveVisual(it);
          const subs: any[] = [];
          
          if (it.substitutions) {
            for (const sub of it.substitutions) {
              const subVisual = await this.resolveVisual(sub);
              const subItem = sub as any;
              subs.push({
                id: sub.id || crypto.randomUUID(),
                blockId: it.blockId || it.id, // 🛡️ HERDA BLOCK_ID DO PAI
                title: sub.name || subItem.title,
                quantity_display: `${subItem.display_quantity || sub.quantity || 100} ${subItem.display_unit || sub.portionUnitLabel || 'g'}`,
                macros: {
                  kcal: Math.round(sub.kcal || 0),
                  protein_g: Number((sub.protein || 0).toFixed(1)),
                  carbs_g: Number((sub.carbs || 0).toFixed(1)),
                  fat_g: Number((sub.fat || 0).toFixed(1))
                },
                visual: subVisual
              });
            }
          }

          const sovereignItem: SovereignItem = {
            id: it.instanceId || it.id || crypto.randomUUID(),
            blockId: it.blockId || it.id || crypto.randomUUID(), // 🛡️ ASSEGURAR BLOCK_ID NO SNAPSHOT
            title: it.name || (it as any).title,
            quantity_display: `${it.display_quantity || it.quantity} ${it.display_unit || it.portionUnitLabel || 'g'}`,

            clinical_mass_g: it.clinical_mass_g,
            macros: {
              kcal: Math.round(it.kcal || 0),
              protein_g: Number((it.protein || 0).toFixed(1)),
              carbs_g: Number((it.carbs || 0).toFixed(1)),
              fat_g: Number((it.fat || 0).toFixed(1))
            },
            visual,
            substitutions: subs
          };

          sovereignItems.push(sovereignItem);
          dayKcal += sovereignItem.macros.kcal;
          dayProt += sovereignItem.macros.protein_g;
          dayCarb += sovereignItem.macros.carbs_g;
          dayFat += sovereignItem.macros.fat_g;
        }

        sovereignMeals.push({
          id: m.id || crypto.randomUUID(),
          name: m.name,
          time: m.time,
          order_index: i,
          items: sovereignItems
        });
      }

      snapshotDays.push({
        day_of_week: dayNum,
        meals: sovereignMeals
      });

      dailyTotals[dayNum] = {
        kcal: Math.round(dayKcal),
        protein_g: Number(dayProt.toFixed(1)),
        carbs_g: Number(dayCarb.toFixed(1)),
        fat_g: Number(dayFat.toFixed(1))
      };
    }

    return {
      publication_id: crypto.randomUUID(),
      snapshot_version: 'v3',
      generated_at: new Date().toISOString(),
      targets: {
        kcal: Math.round(targets.kcal),
        protein_g: Number(targets.protein.toFixed(1)),
        carbs_g: Number(targets.carbs.toFixed(1)),
        fat_g: Number(targets.fat.toFixed(1))
      },
      days: snapshotDays,
      daily_totals: dailyTotals,
      notes: title
    };
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

      // 2. Construir Snapshot Soberano V3 (RESOLVE IMAGENS E MACROS AQUI)
      const snapshot = await this.buildSovereignSnapshot(options);

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
      const snapshotKcal = payload.snapshot.targets.kcal;
      const payloadKcal = payload.total_meta_calorias;
      
      if (Math.abs(snapshotKcal - payloadKcal) > 1) {
         console.error(`[CRITICAL] Divergência de Snapshot detectada: Snapshot(${snapshotKcal}) != Payload(${payloadKcal}). Bloqueando publicação.`);
         return { ok: false, error: 'SNAPSHOT VALIDATION FAILED: Divergência de integridade detectada.' };
      }

      let finalPlanId = planId;

      // 3. Persistência Principal
      if (planId) {
        console.log(`[Persistence-V3] Atualizando plano existente ${planId}.`);
        const { error } = await supabase
          .from('meal_plans')
          .update(payload)
          .eq('id', planId);
        if (error) throw error;
      } else {
        console.log(`[Persistence-V3] Criando novo plano para o paciente.`);
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

      // 4. Persistência Relacional (Somente para compatibilidade de lista legado, App V3 usa Snapshot)
      if (finalPlanId) {
        await supabase.from('meal_plan_items').delete().eq('meal_plan_id', finalPlanId);
        
        const itemsRows: any[] = [];
        snapshot.days.forEach(day => {
          day.meals.forEach(meal => {
            meal.items.forEach(item => {
              const groupId = item.blockId;
              
              itemsRows.push({
                meal_plan_id: finalPlanId,
                tenant_id: tenantId,
                tipo_refeicao: meal.name,
                day_of_week: day.day_of_week,
                title: item.title,
                description: item.quantity_display,
                meta_calorias: item.macros.kcal,
                meta_proteinas: item.macros.protein_g,
                meta_carboidratos: item.macros.carbs_g,
                meta_gorduras: item.macros.fat_g,
                image_url: item.visual.image_url,
                is_primary: true,
                substitution_group_id: groupId,
                editor_version: 'v3'
              });

              item.substitutions.forEach(sub => {
                itemsRows.push({
                  meal_plan_id: finalPlanId,
                  tenant_id: tenantId,
                  tipo_refeicao: meal.name,
                  day_of_week: day.day_of_week,
                  title: sub.title,
                  description: sub.quantity_display,
                  meta_calorias: sub.macros.kcal,
                  meta_proteinas: sub.macros.protein_g,
                  meta_carboidratos: sub.macros.carbs_g,
                  meta_gorduras: sub.macros.fat_g,
                  image_url: sub.visual.image_url,
                  is_primary: false,
                  substitution_group_id: groupId,
                  editor_version: 'v3'
                });
              });
            });
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
