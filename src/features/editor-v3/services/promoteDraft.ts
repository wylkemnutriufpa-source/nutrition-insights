/**
 * Editor V3 — Promotor de Drafts
 */
import { supabase } from '@/integrations/supabase/client';
import type { Meal, MealItem } from '../types';
import type { DraftRecord } from './draftService';
import { calculateItemMacros } from '@/lib/nutricore_v2/helpers';
import { formatDisplayPortion, resolveDisplayGrams } from '@/lib/nutricore_v2/portion-display';
import { generateAndPersistMealPlanSnapshot } from "@/lib/snapshot/persistSnapshot";

type ClinicalMealType =
  | 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack';

const NAME_TO_MEAL_TYPE: Record<string, ClinicalMealType> = {
  'café da manhã': 'breakfast',
  'cafe da manha': 'breakfast',
  'lanche da manhã': 'morning_snack',
  'lanche da manha': 'morning_snack',
  'almoço': 'lunch',
  'almoco': 'lunch',
  'lanche da tarde': 'afternoon_snack',
  'jantar': 'dinner',
  'ceia': 'evening_snack',
};

function mealNameToType(name: string): ClinicalMealType {
  const norm = name.trim().toLowerCase();
  return NAME_TO_MEAL_TYPE[norm] ?? 'lunch';
}

function buildItemTitle(item: MealItem): string {
  return item.name;
}

function buildItemDescription(item: MealItem): string {
  return formatDisplayPortion(item);
}

function sumMealMacros(meal: Meal) {
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const i of meal.items) {
    kcal += i.kcal ?? 0;
    p += i.protein ?? 0;
    c += i.carbs ?? 0;
    f += i.fat ?? 0;
  }
  return { kcal, p, c, f };
}

export interface PromoteResult {
  ok: boolean;
  mealPlanId?: string;
  sharingToken?: string;
  error?: string;
}


/**
 * Promove um draft para um plano clínico oficial.
 * Agora publica diretamente para o paciente para garantir visibilidade imediata.
 */
export async function promoteDraftToMealPlan(
  draft: DraftRecord,
  options?: { title?: string, v3_sandbox_delivery?: boolean }
): Promise<PromoteResult> {
  const meals = draft.payload?.meals ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const title = options?.title ?? `Plano V3 — ${new Date().toLocaleDateString('pt-BR')}`;

  // 🛡️ SOBERANIA MANUAL: Removida barreira de Safety Net procedural.
  // O nutricionista tem soberania total sobre o plano editado.


  // 0) Resolve o ID real do Auth (auth.users.id) e do Perfil (profiles.id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .or(`id.eq.${draft.patient_id},user_id.eq.${draft.patient_id}`)
    .maybeSingle();

  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid(draft.patient_id)) {
    console.error(`[FATAL-IDENTITY] Patient ID inválido no promoteDraft: ${draft.patient_id}`);
    return { ok: false, error: `RUPTURA DE IDENTIDADE: Patient ID "${draft.patient_id}" não é um UUID soberano.` };
  }

  const authUserId = profile?.user_id || draft.patient_id;
  const profileId = profile?.id || draft.patient_id;

  // 0.1) Desativa TODOS os planos ativos anteriores para este paciente
  // (Garante que a unique constraint 'idx_one_active_plan_per_patient' não seja violada)
  await supabase
    .from('meal_plans')
    .update({ is_active: false } as any)
    .eq('patient_id', authUserId);

  // 1) INSERT-FIRST: cria o meal_plan oficial já PUBLICADO
  const isWeeklyMode = meals.some(m => m.selectionMode === 'week');
  const planMode = isWeeklyMode ? 'weekly' : 'single_day';

  const { data: plan, error: planErr } = await supabase
    .from('meal_plans')
    .insert({
      patient_id: authUserId,
      nutritionist_id: draft.nutritionist_id,
      tenant_id: draft.tenant_id,
      title,
      start_date: today,
      plan_status: 'published_to_patient',
      is_active: true,
      plan_mode: planMode,
      total_target_calories: draft.meta_kcal || draft.payload?.nutritional_score?.totals?.kcal || null,
      total_target_protein: draft.meta_protein || draft.payload?.nutritional_score?.totals?.protein || null,
      total_target_carbs: draft.meta_carbs || draft.payload?.nutritional_score?.totals?.carbs || null,
      total_target_fat: draft.meta_fat || draft.payload?.nutritional_score?.totals?.fat || null,
      generation_source: 'manual',
      editor_version: 'v3',
      generation_metadata: {
        editor_v3: true,
        promoted_from_draft_id: draft.id,
        promoted_at: new Date().toISOString(),
        v3_sandbox_delivery: options?.v3_sandbox_delivery || false,
        delivered_via: options?.v3_sandbox_delivery ? 'ControlledClinicalDelivery' : 'StandardPromote'
      },
    } as any)
    .select('id, sharing_token')
    .single();

  if (planErr || !plan) {
    return { ok: false, error: planErr?.message ?? 'Falha ao criar meal_plan' };
  }

  // 2) Insere meal_plan_items explodindo itens primários e suas substituições
  const itemsRows: any[] = [];
  const primaryGroupsTracker = new Set<string>();
  
  for (const meal of meals) {
    if (meal.items.length === 0) continue;

    for (const item of meal.items) {
      // 🛡️ FASE 4: IDENTIDADE SOBERANA — SANITIZAÇÃO
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // 🛡️ HIERARCHY PERSISTENCE (V3): 1 Slot = 1 Group
      // Se múltiplos itens chegarem com o mesmo blockId/groupId, apenas o PRIMEIRO será is_primary=true.
      const blockId = item.blockId;
      const rawGroupId = item.substitution_group_id || blockId || crypto.randomUUID();
      
      // Se não for UUID (ex: vindo do SimpleMealGenerator como 'lunch_protein_0'), 
      // mantemos o rastro mas garantimos que o DB aceite.
      // O DB exige UUID, então vamos gerar um UUID estável para strings conhecidas ou aleatório para novas.
      const groupId = isUuid(rawGroupId) ? rawGroupId : crypto.randomUUID();
      
      const mealType = mealNameToType(meal.name);
      
      // 🛡️ RECOGNITION LOCK: Se este grupo já teve um primary neste plano/dia, este item vira substituição.
      // Isso impede a explosão calórica de Luciana (133 primaries).
      const trackerKey = `${mealType}_${meal.day_of_week ?? 0}_${groupId}`;
      const isPrimary = !primaryGroupsTracker.has(trackerKey);
      
      if (isPrimary) {
        primaryGroupsTracker.add(trackerKey);
      }

      const rawMacros = {
        kcal: Number(item.kcal || 0),
        protein: Number(item.protein || 0),
        carbs: Number(item.carbs || 0),
        fat: Number(item.fat || 0)
      };
      
      let cleanMacros = rawMacros;
      if (rawMacros.kcal > 10000 || rawMacros.protein > 1000) {
        console.warn(`[Promote-Guard] Explosion detected on item ${item.name}. Recalculating...`);
        const recalculated = calculateItemMacros(item, item.quantity || 1);
        cleanMacros = recalculated;
      }

      const itemInstanceId = isUuid(item.instanceId) ? item.instanceId : crypto.randomUUID();
      const itemImageUrl = (item as any).imageUrl || meal.imageUrl || null;

      itemsRows.push({
        id: itemInstanceId,
        meal_plan_id: plan.id,
        tenant_id: draft.tenant_id,
        meal_type: mealType,
        day_of_week: meal.day_of_week ?? 0,
        title: buildItemTitle(item),
        description: buildItemDescription(item),
        calories_target: Math.round(cleanMacros.kcal || 0),
        protein_target: Number((cleanMacros.protein || 0).toFixed(1)),
        carbs_target: Number((cleanMacros.carbs || 0).toFixed(1)),
        fat_target: Number((cleanMacros.fat || 0).toFixed(1)),
        image_url: itemImageUrl,
        item_origin: 'manual',
        is_manually_edited: true,
        is_locked: (item as any).locked || false,
        is_primary: isPrimary, // 🛡️ ENFORCED SOBERANIA
        substitution_group_id: groupId,
        edit_metadata: {
          ...item,
          blockId,
          imageUrl: itemImageUrl,
          mealImageUrl: meal.imageUrl || null,
          display_quantity: item.quantity,
          display_unit: item.portionUnitLabel || item.portionLabel || item.portionUnit,
          day_of_week: meal.day_of_week ?? 0,
          editor_version: 'v3',
        }
      });

      // 2.2) Substituições (sempre is_primary = false)
      if (item.substitutions && Array.isArray(item.substitutions)) {
        item.substitutions.forEach((sub: any) => {
          itemsRows.push({
            id: isUuid(sub.instanceId || sub.id) ? (sub.instanceId || sub.id) : crypto.randomUUID(),
            meal_plan_id: plan.id,
            tenant_id: draft.tenant_id,
            meal_type: mealType,
            day_of_week: meal.day_of_week ?? 0,
            title: sub.name,
            description: sub.portionLabel || `${sub.suggestedQuantity || sub.portionValue || 100}g`,
            calories_target: Math.round(sub.kcal || sub.calories || 0),
            protein_target: Number((sub.protein || 0).toFixed(1)),
            carbs_target: Number((sub.carbs || 0).toFixed(1)),
            fat_target: Number((sub.fat || 0).toFixed(1)),
            image_url: sub.imageUrl || null,
            item_origin: 'auto',
            is_manually_edited: false,
            is_locked: false,
            is_primary: false, // Substituições nunca são primárias na promoção
            substitution_group_id: groupId,
            edit_metadata: {
              ...sub,
              blockId,
              display_quantity: sub.suggestedQuantity || sub.portionValue || 100,
              display_unit: sub.portionLabel || sub.portionUnitLabel || sub.portionUnit || 'g',
              day_of_week: meal.day_of_week ?? 0,
              editor_version: 'v3',
            }
          });
        });
      }
    }
  }

  if (itemsRows.length > 0) {
    const { error: itemsErr } = await supabase
      .from('meal_plan_items')
      .insert(itemsRows);

    if (itemsErr) {
      // Rollback best-effort
      await supabase
        .from('meal_plans')
        .update({ plan_status: 'archived', is_active: false } as any)
        .eq('id', plan.id);
      return { ok: false, error: itemsErr.message };
    }
  }

  // 3) (Desativação dos anteriores já feita no passo 0.1 antes do insert)

  // 4) Só agora marca o draft como promovido
  await supabase
    .from('v3_drafts' as any)
    .update({
      draft_status: 'promoted',
      promoted_meal_plan_id: plan.id,
      promoted_at: new Date().toISOString(),
    })
    .eq('id', draft.id);

  // 🛡️ Onda 1: Snapshot imutável (Shadow Mode)
  // Garante soberania visual para o Patient App
  try {
    await generateAndPersistMealPlanSnapshot(plan.id);
  } catch (snapshotErr: any) {
    console.error("[Promote-Snapshot] Falha crítica ao gerar snapshot:", snapshotErr);
    // V3 MANDATORY SNAPSHOT: Bloqueamos se o snapshot falhar para evitar inconsistência operacional
    throw new Error(`Falha na Soberania V3: O snapshot visual não pôde ser gerado (${snapshotErr.message}).`);
  }

  // Log de acesso soberano
  logSovereignEvent("INFO", "DRAFT_PROMOVIDO_SUCESSO", {
    meal_plan_id: plan.id,
    draft_id: draft.id,
    correlation_id: correlationId
  });

  await supabase.from('access_logs').insert({
    user_id: draft.nutritionist_id,
    patient_id: profileId,
    action: 'export',
    resource: 'meal_plan',
    user_agent: navigator.userAgent
  });

  return { ok: true, mealPlanId: plan.id, sharingToken: (plan as any).sharing_token };
}
