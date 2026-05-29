
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
  const existingDisplay = item?.quantity_display || item?.display_quantity || fallback?.quantity_display || fallback?.display_quantity;
  
  // 🛡️ SOBERANIA V3: Se já temos um display pronto e ele não é "1 g" genérico, respeitamos.
  if (existingDisplay && typeof existingDisplay === 'string' && existingDisplay.length > 0 && !/^1\s*g$/i.test(existingDisplay)) {
    return existingDisplay;
  }

  const dUnit = String(item?.display_unit || fallback?.display_unit || fallback?.portionUnitLabel || '').trim();
  const cMass = Number(item?.clinical_mass_g || fallback?.clinical_mass_g);
  const qty = Number(item?.quantity || fallback?.quantity);
  const kcal = Number(item?.kcal || fallback?.kcal || 0);

  // Se for unidade não-grama (ex: colher, unidade) e tiver multiplicador > 0
  if (dUnit && dUnit.toLowerCase() !== 'g' && qty > 0) {
    return `${qty} ${dUnit}`;
  }

  // Fallback para Massa Clínica
  if (Number.isFinite(cMass) && cMass > 1) {
    return `${Math.round(cMass)}g`;
  }

  // Fallback de segurança para 100g se tiver calorias mas nada definido
  if (kcal > 5) return `100g`;
  
  return existingDisplay || "";
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
   * COMPILADOR DE VISUAIS SOBERANO — BATCH VERSION
   * 🛡️ SPRINT PRODUÇÃO: Substitui resolveVisual individual por batch para eliminar N+1.
   * Uma única query por tipo de nome busca todos os itens de uma vez.
   */
  async resolveVisualBatch(items: any[]): Promise<Map<string, { image_url: string; is_placeholder: boolean }>> {
    const result = new Map<string, { image_url: string; is_placeholder: boolean }>();
    const needsLookup: { key: string; name: string }[] = [];

    // Separar itens que já têm URL dos que precisam de lookup
    for (const item of items) {
      const existingUrl = item.imageUrl || item.image_url || item.visual?.image_url;
      if (existingUrl && existingUrl.startsWith('http') && !existingUrl.includes('placeholder')) {
        result.set(item.instanceId || item.id || item.name, {
          image_url: existingUrl,
          is_placeholder: false,
        });
      } else {
        const foodName = (item.name || item.title || "").trim();
        if (foodName) needsLookup.push({ key: item.instanceId || item.id || foodName, name: foodName });
      }
    }

    // Batch lookup único
    if (needsLookup.length > 0) {
      const names = [...new Set(needsLookup.map(i => i.name))];
      const [libRes, v3Res] = await Promise.all([
        supabase.from('meal_visual_library').select('name, image_url').in('name', names).eq('is_active', true),
        supabase.from('v3_library_items').select('title, images:v3_library_images(image_asset,image_url)').in('title', names).eq('active', true),
      ]);

      const libMap = new Map((libRes.data || []).map(r => [r.name?.toLowerCase(), r.image_url]));
      const v3Map = new Map((v3Res.data || []).map(r => [r.title?.toLowerCase(), (r as any).images?.[0]]));

      for (const { key, name } of needsLookup) {
        const lname = name.toLowerCase();
        const libUrl = libMap.get(lname);
        const v3Img = v3Map.get(lname);
        const url = libUrl || v3Img?.image_asset || v3Img?.image_url || OFFICIAL_PLACEHOLDER;
        result.set(key, { image_url: url, is_placeholder: url === OFFICIAL_PLACEHOLDER });
      }
    }

    return result;
  },

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
      // Busca case-insensitive: tenta match exato primeiro, depois ilike
      const { data: libMatch } = await supabase
        .from('meal_visual_library')
        .select('image_url, slug')
        .ilike('name', foodName)
        .limit(1)
        .maybeSingle();

      if (libMatch?.image_url) {
        return {
          image_url: libMatch.image_url,
          is_placeholder: false,
          library_item_id: item.library_item_id || item.id
        };
      }

      // Tenta também pela v3_library_items com join de imagens
      const { data: v3Match } = await supabase
        .from('v3_library_items')
        .select('images:v3_library_images(image_asset, image_url)')
        .ilike('title', foodName)
        .eq('active', true)
        .limit(1)
        .maybeSingle();

      const v3Img = (v3Match as any)?.images?.[0];
      if (v3Img?.image_asset || v3Img?.image_url) {
        return {
          image_url: v3Img.image_asset || v3Img.image_url,
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
   * 🛡️ SPRINT C: Preserva clinical_metadata original e adiciona histórico de revisões.
   */
  async buildSovereignSnapshot(options: PlanSaveOptions): Promise<SovereignSnapshotV3> {
    const { meals, targets, title, planId } = options;
    const daysList = Array.from(new Set(meals.map(m => m.day_of_week ?? 1))).sort((a, b) => a - b);
    
    // 🛡️ FASE 1 SPRINT C: Buscar clinical_metadata original para preservar
    let originalClinicalMetadata: Record<string, any> | null = null;
    let revisionNumber = 1;
    let versionHistory: any[] = [];

    if (planId) {
      try {
        const { data: existingPlan } = await supabase
          .from('meal_plans')
          .select('snapshot')
          .eq('id', planId)
          .maybeSingle();

        if (existingPlan?.snapshot) {
          const prev = existingPlan.snapshot as any;
          // Preservar clinical_metadata original (nunca sobrescrever)
          originalClinicalMetadata = prev.clinical_metadata || null;
          // Incrementar revision_number
          revisionNumber = (prev.revision_number || 1) + 1;
          // Construir version_history
          versionHistory = [
            ...(prev.version_history || []),
            {
              revision: prev.revision_number || 1,
              published_at: prev.published_at || prev.generated_at,
              targets: prev.targets,
              publication_id: prev.publication_id,
            }
          ].slice(-10); // Manter apenas as últimas 10 versões
        }
      } catch (e) {
        console.warn('[buildSovereignSnapshot] Não foi possível buscar metadados anteriores:', e);
      }
    }
    
    const snapshotDays: SovereignDay[] = [];
    const dailyTotals: Record<number, SovereignMacros> = {};

    // 🛡️ PRODUÇÃO: Pre-fetch TODAS as imagens em batch (elimina N+1)
    // Antes: 168+ queries sequenciais. Agora: 2 queries totais.
    const allItems = meals.flatMap(m => [
      ...m.items,
      ...m.items.flatMap(it => it.substitutions || [])
    ]);
    const visualMap = await this.resolveVisualBatch(allItems);

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
          // 🛡️ PRODUÇÃO: usar visualMap pré-carregado (sem N+1)
          const itemKey = it.instanceId || it.id || it.name || '';
          const visual = visualMap.get(itemKey) || { image_url: OFFICIAL_PLACEHOLDER, is_placeholder: true };
          const subs: SovereignSubstitution[] = [];
          
          if (it.substitutions && Array.isArray(it.substitutions)) {
            for (const sub of it.substitutions) {
              const subKey = (sub as any).instanceId || (sub as any).id || (sub as any).name || '';
              const subVisual = visualMap.get(subKey) || { image_url: OFFICIAL_PLACEHOLDER, is_placeholder: true };
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
            // 🛡️ SPRINT C: canonical_name — nunca slug, nunca vazio
            title: (() => {
              const raw = it.name || (it as any).title || "Alimento";
              // Se parece slug (sem espaços, tem hífen ou underscore), converter
              if (raw && !raw.includes(" ") && (raw.includes("-") || raw.includes("_"))) {
                return raw.replace(/[_-]/g, " ")
                  .split(" ")
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
              }
              return raw;
            })(),
            quantity_display: buildQuantityDisplay(it as any, it),
            clinical_mass_g: Number((it as any).clinical_mass_g) > 0
              ? Math.round(Number((it as any).clinical_mass_g))
              : (typeof it.quantity === 'number' && it.quantity > 0 ? Math.round(it.quantity) : 100),
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
      published_at: new Date().toISOString(),
      revision_number: revisionNumber,
      version_history: versionHistory,
      // 🛡️ SPRINT C: Preservar clinical_metadata original (engine, TMB, TDEE, rationale)
      // Se havia metadata original (plano gerado pelo motor), preservar sem sobrescrever.
      // Na republicação, adicionar apenas republished_at e republished_by.
      clinical_metadata: originalClinicalMetadata
        ? {
            ...originalClinicalMetadata,
            republished_at: new Date().toISOString(),
            republished_by: options.nutritionistId,
            revision_number: revisionNumber,
          }
        : {
            generated_at: new Date().toISOString(),
            engine_version: 'manual_v3',
            published_by: options.nutritionistId,
            revision_number: revisionNumber,
          },
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
   * 🛡️ DELETAR PLANO V3
   */
  async deletePlan(planId: string): Promise<boolean> {
    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', planId);
    
    if (error) {
      console.error('[Persistence-V3] Erro ao deletar plano:', error);
      return false;
    }
    return true;
  },

  /**
   * 🛡️ DESATIVAR/ARQUIVAR PLANO V3
   */
  async deactivatePlan(planId: string): Promise<boolean> {
    const { error } = await supabase
      .from('meal_plans')
      .update({ is_active: false, plan_status: 'inactive' })
      .eq('id', planId);

    if (error) {
      console.error('[Persistence-V3] Erro ao desativar plano:', error);
      return false;
    }
    return true;
  },

  /**
   * PUBLICAÇÃO SOBERANA V3 (ATÔMICA)
   * 🛡️ BUG #2 FIXED: Unifica persistência em uma única RPC para garantir integridade.
   * Salva o plano oficial, sincroniza itens e promove o rascunho em uma transação única.
   */
  async publishPlan(options: PlanSaveOptions): Promise<SaveResult> {
    const { patientId, nutritionistId, meals, targets, title, planId, draftId } = options;
    const { OperationalAuditService } = await import('@/services/OperationalAuditService');

    console.log(`[Persistence-V3] Iniciando publicação ATÔMICA para paciente ${patientId}.`);

    // 🛡️ REGRAS INVIOLÁVEIS: Macros devem ser saudáveis para publicar
    const hasMacros = targets.kcal > 0 && targets.protein > 0;
    if (!hasMacros) {
      await OperationalAuditService.logCriticalError("publish", "SNAPSHOT INCOMPLETO: Macros não podem ser zero.", { targets });
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
      const snapshot = await this.buildSovereignSnapshot(options);

      // 3. Preparar Payload do Plano
      const payload: any = {
        title: title || "Plano Alimentar Soberano V3",
        snapshot,
        total_meta_calorias: Math.round(targets.kcal),
        total_meta_proteinas: Math.round(targets.protein),
        total_meta_carboidratos: Math.round(targets.carbs),
        total_meta_gorduras: Math.round(targets.fat),
        plan_mode: 'weekly',
        start_date: new Date().toISOString().split('T')[0],
      };

      // 🛡️ Helper: Extrai unidade de quantity_display
      const extractUnit = (quantityDisplay: string | null | undefined): string => {
        if (!quantityDisplay) return 'g';
        const displayStr = String(quantityDisplay).toLowerCase();
        const unitMatch = displayStr.match(/\b(unidade|unidades|fatia|fatias|colher|colheres|copo|copos|xicara|xícaras|porção|porções|ml|l|litro|litros)\b/i);
        if (unitMatch) return unitMatch[1];
        if (displayStr.endsWith('g')) return 'g';
        return 'g';
      };

      // 4. Preparar Lista de Itens para Sincronismo (Compatibilidade Legado)
      const itemsRows: any[] = [];
      snapshot.days.forEach(day => {
        day.meals.forEach(meal => {
          meal.items.forEach(item => {
            const groupId = item.blockId;
            
            itemsRows.push({
              tipo_refeicao: meal.name,
              day_of_week: day.day_of_week,
              title: item.title,
              description: item.description,
              display_quantity: item.quantity,
              display_unit: extractUnit(item.quantity_display),
              meta_calorias: item.macros.kcal,
              meta_proteinas: item.macros.protein_g,
              meta_carboidratos: item.macros.carbs_g,
              meta_gorduras: item.macros.fat_g,
              image_url: item.visual.image_url,
              is_primary: true,
              substitution_group_id: groupId
            });

            item.substitutions.forEach(sub => {
              itemsRows.push({
                tipo_refeicao: meal.name,
                day_of_week: day.day_of_week,
                title: sub.title,
                description: sub.description,
                display_quantity: sub.quantity,
                display_unit: extractUnit(sub.quantity_display),
                meta_calorias: sub.macros.kcal,
                meta_proteinas: sub.macros.protein_g,
                meta_carboidratos: sub.macros.carbs_g,
                meta_gorduras: sub.macros.fat_g,
                image_url: sub.visual.image_url,
                is_primary: false,
                substitution_group_id: groupId
              });
            });
          });
        });
      });

      // 🛡️ RE-VALIDAÇÃO: Impedir envio de plano sem itens
      if (itemsRows.length === 0) {
        await OperationalAuditService.logCriticalError("publish", "BLOQUEIO DE SEGURANÇA: Não é permitido publicar um plano sem itens.");
        return { ok: false, error: 'BLOQUEIO DE SEGURANÇA: Não é permitido publicar um plano sem itens.' };
      }

      // 5. CHAMADA ATÔMICA VIA RPC
      const { data, error } = await supabase.rpc('publish_meal_plan_v3', {
        p_plan_id: planId || null,
        p_patient_id: patientId,
        p_nutritionist_id: nutritionistId,
        p_tenant_id: tenantId,
        p_payload: payload,
        p_items: itemsRows,
        p_draft_id: draftId || null
      });

      if (error) {
        console.error('[Persistence-V3] Erro na RPC de publicação:', error);
        await OperationalAuditService.logCriticalError("publish", error, { rpc: 'publish_meal_plan_v3', payload });
        throw error;
      }

      const result = data as { ok: boolean; plan_id: string };
      console.log(`[Persistence-V3] Publicação ATÔMICA concluída. PlanID: ${result.plan_id}`);
      
      await OperationalAuditService.logSuccess("publish", "publish_meal_plan_v3", { planId: result.plan_id });
      return { ok: true, planId: result.plan_id };
    } catch (err: any) {
      console.error('[Persistence-V3] Erro fatal na publicação:', err);
      await OperationalAuditService.logCriticalError("publish", err, { patientId });
      return { ok: false, error: err.message };
    }
  }
};

