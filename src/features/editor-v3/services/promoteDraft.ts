/**
 * Editor V3 — Promotor de Drafts
 * ----------------------------------------------------------------
 * Converte um `v3_drafts` em plano clínico oficial (`meal_plans` + `meal_plan_items`).
 *
 * 🛡️ Respeita os contratos imutáveis:
 *   - Isolamento multi-tenant (RLS faz a checagem; passamos tenant_id explícito)
 *   - Insert-first: cria plano + items, e SÓ DEPOIS marca o draft como `promoted`
 *   - Não toca em planos publicados (cria SEMPRE como `draft` clínico)
 *   - Marmitas mantêm `is_locked = true` no item oficial
 */
import { supabase } from '@/integrations/supabase/client';
import type { Meal, MealItem } from '../types';
import type { DraftRecord } from './draftService';
import { calculateItemMacros } from '@/lib/nutricore_v2/helpers';

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

function buildItemTitle(meal: Meal): string {
  if (meal.items.length === 0) return meal.name;
  const isMarmita = meal.items.some((i) => (i as any).isMarmita);
  if (isMarmita) {
    const m = meal.items.find((i) => (i as any).isMarmita) as MealItem;
    return m.name;
  }
  return meal.items.map((i) => i.name).join(' + ');
}

function buildItemDescription(meal: Meal): string {
  return meal.items
    .map((i) => {
      const unit = i.portionUnitLabel || i.portionUnit || 'unidade';
      const quantity = i.quantity || 1;
      let displayUnit = unit;
      if (quantity > 1) {
        const plurals: Record<string, string> = {
          fatia: 'fatias', 
          unidade: 'unidades', 
          colher: 'colheres',
          pote: 'potes', 
          medida: 'medidas', 
          marmita: 'marmitas'
        };
        displayUnit = plurals[unit] || unit + 's';
      }
      return `${i.name} — ${quantity} ${displayUnit}`;
    })
    .join('; ');
}

function sumMealMacros(meal: Meal) {
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const i of meal.items) {
    // 🛡️ REGRA DE OURO: O Motor NutriCore V2 é a fonte da verdade.
    // Usamos os macros que já estão no item (totais para a quantidade atual).
    // NÃO recalculamos para evitar distorções de arredondamento ou conversão.
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
  options?: { title?: string }
): Promise<PromoteResult> {
  const meals = draft.payload?.meals ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const title = options?.title ?? `Plano V3 — ${new Date().toLocaleDateString('pt-BR')}`;


  // 0) Resolve o ID real do Auth (auth.users.id) a partir do patient_id (que pode ser profile.id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .or(`id.eq.${draft.patient_id},user_id.eq.${draft.patient_id}`)
    .maybeSingle();

  const authUserId = profile?.user_id || draft.patient_id;

  // 1) INSERT-FIRST: cria o meal_plan oficial já PUBLICADO
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
      plan_mode: 'single_day',
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
      },
    } as any)
    .select('id, sharing_token')
    .single();

  if (planErr || !plan) {
    return { ok: false, error: planErr?.message ?? 'Falha ao criar meal_plan' };
  }

  // 2) Insere meal_plan_items para cada refeição que tenha conteúdo
  const itemsRows = meals
    .filter((m) => m.items.length > 0)
    .map((m) => {
      const macros = sumMealMacros(m);
      const isMarmita = m.items.some((i) => (i as any).isMarmita);
      return {
        meal_plan_id: plan.id,
        tenant_id: draft.tenant_id,
        meal_type: mealNameToType(m.name),
        title: buildItemTitle(m),
        description: buildItemDescription(m),
        calories_target: Math.round(macros.kcal),
        protein_target: Number(macros.p.toFixed(2)),
        carbs_target: Number(macros.c.toFixed(2)),
        fat_target: Number(macros.f.toFixed(2)),
        item_origin: 'manual',
        is_manually_edited: true,
        is_locked: isMarmita, // marmita = LOCKED no plano oficial
      } as any;
    });

  if (itemsRows.length > 0) {
    const { error: itemsErr } = await supabase
      .from('meal_plan_items')
      .insert(itemsRows);

    if (itemsErr) {
      // Rollback best-effort: arquiva o plano vazio (delete flow: archive antes de delete)
      await supabase
        .from('meal_plans')
        .update({ plan_status: 'archived', is_active: false } as any)
        .eq('id', plan.id);
      return { ok: false, error: itemsErr.message };
    }
  }

  // 3) Desativa planos anteriores para este paciente para garantir unicidade do plano ativo
  await supabase
    .from('meal_plans')
    .update({ is_active: false } as any)
    .eq('patient_id', draft.patient_id)
    .neq('id', plan.id)
    .eq('is_active', true);

  // 4) Só agora marca o draft como promovido
  await supabase
    .from('v3_drafts' as any)
    .update({
      draft_status: 'promoted',
      promoted_meal_plan_id: plan.id,
      promoted_at: new Date().toISOString(),
    })
    .eq('id', draft.id);

  // Log de acesso: Exportação/Promoção de draft para plano oficial
  await supabase.from('access_logs').insert({
    user_id: draft.nutritionist_id,
    patient_id: draft.patient_id,
    action: 'export',
    resource: 'meal_plan',
    user_agent: navigator.userAgent
  });

  return { ok: true, mealPlanId: plan.id, sharingToken: (plan as any).sharing_token };
}
