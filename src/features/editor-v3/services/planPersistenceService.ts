
import { supabase } from '@/integrations/supabase/client';
import { Meal, MealItem } from '../types';
import { saveDraft } from './draftService';
import { SovereignSnapshotV3, SovereignDay, SovereignMeal, SovereignItem, SovereignMacros, SovereignSubstitution } from '../types/snapshot';

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
 * 🛡️ Constrói quantity_display priorizando massa clínica real sobre
 * o multiplicador "quantity" (que costuma vir como 1 dos templates V3).
 * Evita o bug crônico do "1 g" no PDF e nas telas do paciente.
 */
function buildQuantityDisplay(item: any, fallback: any): string {
  const rawQty = item?.display_quantity ?? fallback?.display_quantity;
  const dUnit = String(item?.display_unit ?? fallback?.display_unit ?? fallback?.portionUnitLabel ?? '').trim();
  const cMass = Number(item?.clinical_mass_g ?? fallback?.clinical_mass_g);
  const qty = Number(item?.quantity ?? fallback?.quantity);
  const kcal = Number(item?.kcal || fallback?.kcal || 0);

  const qStr = rawQty == null ? '' : String(rawQty).trim();
  
  // 🛡️ DEFINIÇÃO DE PLACEHOLDER: Vazio, "1", "1g", "1 g"
  // Se o item tem calorias significativas (> 5) mas quantidade é 1, é um erro de snapshot.
  const isPlaceholder = qStr === '' || /^1\s*g?$/i.test(qStr);

  // Unidade não-grama com display_quantity válido → usa o display textual
  if (dUnit && dUnit !== 'g' && qStr && !isPlaceholder) {
    return `${qStr} ${dUnit}`.trim();
  }

  // Massa clínica é a verdade quando o display é placeholder ou unidade grama irrelevante
  if (isPlaceholder && Number.isFinite(cMass) && cMass > 1) {
    return `${Math.round(cMass)} g`;
  }

  // Display textual já tem unidade embutida (ex.: "3 colheres", "100 g")
  // Mas se for "1 g", ignoramos e tentamos cMass.
  if (qStr && /[a-zà-ú]/i.test(qStr) && !isPlaceholder) return qStr;

  if (qStr && !isPlaceholder) {
    return dUnit ? `${qStr} ${dUnit}`.trim() : `${qStr} g`;
  }

  // Fallbacks Soberanos
  if (Number.isFinite(cMass) && cMass > 1) return `${Math.round(cMass)} g`;
  if (Number.isFinite(qty) && qty > 1) return `${Math.round(qty)} g`;
  
  // Se chegamos aqui e temos kcal, provavelmente é uma porção padrão de 100g
  if (kcal > 5) return `100 g`;
  
  return ``;
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
   * COMPILADOR DE VISUAIS SOBERANO
   * Único ponto de verdade para imagens durante a compilação do snapshot.
   * Proibido fallback dinâmico ou inferência semântica no Patient App.
   */
  async resolveVisual(item: any): Promise<{ image_url: string; is_placeholder: boolean; library_item_id?: string }> {
    const existingUrl = item.imageUrl || item.image_url || item.visual?.image_url;
    if (existingUrl && existingUrl.startsWith('http') && !existingUrl.includes('placeholder')) {
      return {
        image_url: existingUrl,
        is_placeholder: false,
        library_item_id: item.library_item_id || item.id
      };
    }

    const foodName = (item.name || item.title || "").trim();
    if (foodName) {
      const { data: libMatch } = await supabase
        .from('meal_visual_library')
        .select('image_url')
        .eq('name', foodName)
        .limit(1)
        .maybeSingle();

      if (libMatch?.image_url) {
        return {
          image_url: libMatch.image_url,
          is_placeholder: false,
          library_item_id: item.library_item_id || item.id
        };
      }
    }

    return {
      image_url: OFFICIAL_PLACEHOLDER,
      is_placeholder: true,
      library_item_id: item.library_item_id || item.id
    };
  },

  /**
   * COMPILADOR SOBERANO DE SNAPSHOT V3
   * Transforma o estado do editor em um artefato final e auto-suficiente.
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

      // Ordenar refeições por horário ou id para consistência
      const sortedMeals = [...dayMeals].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      for (let i = 0; i < sortedMeals.length; i++) {
        const m = sortedMeals[i];
        const sovereignItems: SovereignItem[] = [];
        let mealKcal = 0, mealProt = 0, mealCarb = 0, mealFat = 0;

        for (const it of m.items) {
          const visual = await this.resolveVisual(it);
          const subs: SovereignSubstitution[] = [];
          
          if (it.substitutions && Array.isArray(it.substitutions)) {
            for (const sub of it.substitutions) {
              const subVisual = await this.resolveVisual(sub);
              const subItem = sub as any;
              
              // 🛡️ MACRO CALCULATION: PURIFICAÇÃO NO COMPILER
              const subMacros = {
                kcal: Math.round(sub.kcal || 0),
                protein_g: Number((sub.protein || 0).toFixed(1)),
                carbs_g: Number((sub.carbs || 0).toFixed(1)),
                fat_g: Number((sub.fat || 0).toFixed(1))
              };

              subs.push({
                id: sub.id || crypto.randomUUID(),
                title: sub.name || subItem.title || "Substituto",
                blockId: it.blockId || it.id, // HERANÇA SOBERANA
                quantity_display: buildQuantityDisplay(subItem, sub),
                macros: subMacros,
                visual: subVisual
              });
            }
          }

          const sovereignItem: SovereignItem = {
            id: it.instanceId || it.id || crypto.randomUUID(),
            blockId: it.blockId || it.id || crypto.randomUUID(),
            title: it.name || (it as any).title || "Alimento",
            quantity_display: buildQuantityDisplay(it as any, it),
            clinical_mass_g: Number((it as any).clinical_mass_g) > 1
              ? Math.round(Number((it as any).clinical_mass_g))
              : (typeof it.quantity === 'number' && it.quantity > 1 ? Math.round(it.quantity) : 100),
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
          
          // Somar totais da refeição
          mealKcal += sovereignItem.macros.kcal;
          mealProt += sovereignItem.macros.protein_g;
          mealCarb += sovereignItem.macros.carbs_g;
          mealFat += sovereignItem.macros.fat_g;
          
          // Somar totais diários (sempre do item primário)
          dayKcal += sovereignItem.macros.kcal;
          dayProt += sovereignItem.macros.protein_g;
          dayCarb += sovereignItem.macros.carbs_g;
          dayFat += sovereignItem.macros.fat_g;
        }

        sovereignMeals.push({
          id: m.id || crypto.randomUUID(),
          name: m.name || "Refeição",
          time: m.time || "00:00",
          order_index: i,
          macros: {
            kcal: Math.round(mealKcal),
            protein_g: Number(mealProt.toFixed(1)),
            carbs_g: Number(mealCarb.toFixed(1)),
            fat_g: Number(mealFat.toFixed(1))
          },
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
