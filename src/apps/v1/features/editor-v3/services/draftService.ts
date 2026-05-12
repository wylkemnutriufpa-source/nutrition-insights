/**
 * Editor V3 — Draft Service
 * ----------------------------------------------------------------
 * Persistência ISOLADA dos rascunhos do Editor V3 em `v3_drafts`.
 * NUNCA escreve em `meal_plans` / `meal_plan_items` diretamente.
 * A promoção (draft -> plano oficial) acontece em `promoteDraft.ts`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Meal, DraftPayload, AuditLogEntry } from '../types';
import { normalizeMeals } from '../utils/normalization';
import { calculateItemMacros } from '@/lib/nutricore_v2/helpers';

export interface DraftRecord {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  tenant_id: string;
  payload: DraftPayload;
  meta_kcal: number | null;
  meta_protein: number | null;
  meta_carbs: number | null;
  meta_fat: number | null;
  draft_status: 'editing' | 'promoted' | 'discarded';
  promoted_meal_plan_id: string | null;
  sharing_token: string | null;
  updated_at: string;
}

const DRAFT_PAYLOAD_VERSION = 1;

async function logCriticalFailure(eventType: string, errorMessage: string, payload: any = {}) {
  const { data: userRes } = await supabase.auth.getUser();
  if (userRes?.user?.id) {
    await supabase.from('critical_logs').insert({
      event_type: eventType,
      user_id: userRes.user.id,
      error_message: errorMessage,
      payload
    } as any);
  }
}

async function getActiveTenant(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_active_tenant');
    if (error) {
      console.error('[v3-monitor] Critical: RPC get_user_active_tenant failed:', error.message);
      await logCriticalFailure('tenant_failure', error.message);
      return null;
    }
    if (!data) {
      console.warn('[v3-monitor] Warning: No active tenant found for user');
      await logCriticalFailure('tenant_failure', 'No active tenant returned from RPC');
    }
    return (data as string | null) ?? null;
  } catch (err) {
    console.error('[v3-monitor] Error: Unexpected exception fetching active tenant:', err);
    await logCriticalFailure('tenant_failure', err instanceof Error ? err.message : String(err));
    return null;
  }
}

function computeMacros(meals: Meal[]) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const meal of meals) {
    for (const item of meal.items) {
      // 🛡️ REGRA DE OURO: Usar macros entregues pelo motor ou editados manualmente.
      // Evita o loop de distorção (ex: 25.000 kcal) ao salvar.
      kcal += item.kcal ?? 0;
      protein += item.protein ?? 0;
      carbs += item.carbs ?? 0;
      fat += item.fat ?? 0;
    }
  }
  return { kcal, protein, carbs, fat };
}

export async function loadOrCreateDraft(
  patientId: string,
  seedMeals: Meal[] = [],
  mealPlanId?: string | null
): Promise<DraftRecord | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const nutritionistId = userRes.user?.id;
  if (!nutritionistId) return null;

  // Silenciar access_logs 409
  try {
    await supabase.from('access_logs').insert({
      user_id: nutritionistId,
      patient_id: patientId,
      action: 'view',
      resource: 'draft',
      user_agent: navigator.userAgent
    } as any);
  } catch (e) {
    // Silently ignore 409/conflicts in logs
  }

  // 1. Tentar encontrar rascunho ativo
  const { data: existing, error: findErr } = await supabase
    .from('v3_drafts' as any)
    .select('*')
    .eq('nutritionist_id', nutritionistId)
    .eq('patient_id', patientId)
    .eq('draft_status', 'editing')
    .maybeSingle();

  if (findErr) {
    console.warn('[v3-draft] load failed, will fallback to local');
  }

  if (existing) {
    const record = existing as unknown as DraftRecord;
    if (record.payload?.meals) {
      record.payload.meals = normalizeMeals(record.payload.meals);
    }
    return record;
  }

  // 2. Se não houver rascunho e houver mealPlanId, tentar migrar dados do plano oficial (Legado V2 -> V3)
  let initialMealsToUse = seedMeals;
  if (mealPlanId && (!initialMealsToUse || initialMealsToUse.length === 0)) {
    console.info('[v3-draft] No draft found. Attempting to seed from official meal plan:', mealPlanId);
    
    // Tenta carregar o plano oficial (seja ele v2 ou v3)
    const { data: officialPlan } = await supabase
      .from('meal_plans')
      .select('*, meal_plan_items(*)')
      .eq('id', mealPlanId)
      .single();

    if (officialPlan && officialPlan.meal_plan_items) {
      // Agrupar itens por tipo de refeição (V2 agrupa por meal_type)
      const itemsByMealType: Record<string, any[]> = {};
      officialPlan.meal_plan_items.forEach((item: any) => {
        const type = item.meal_type || 'outros';
        if (!itemsByMealType[type]) itemsByMealType[type] = [];
        itemsByMealType[type].push(item);
      });

      const mealTypeLabels: Record<string, string> = {
        breakfast: 'Café da Manhã',
        morning_snack: 'Lanche da Manhã',
        lunch: 'Almoço',
        afternoon_snack: 'Lanche da Tarde',
        dinner: 'Jantar',
        evening_snack: 'Ceia',
        pre_workout: 'Pré-Treino',
        post_workout: 'Pós-Treino'
      };

      const convertedMeals: Meal[] = Object.entries(itemsByMealType).map(([type, items]) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: mealTypeLabels[type] || type,
        time: type === 'breakfast' ? '08:00' : (type === 'lunch' ? '12:00' : (type === 'dinner' ? '20:00' : '00:00')),
        items: items.map((item: any) => {
          const isSubstitution = item.description?.toLowerCase().includes('substituição');
          return {
            id: item.id,
            instanceId: Math.random().toString(36).substring(2, 10),
            name: item.title,
            kcal: item.calories_target || 0,
            calories: item.calories_target || 0,
            protein: item.protein_target || 0,
            carbs: item.carbs_target || 0,
            fat: item.fat_target || 0,
            quantity: 1,
            measurementType: 'unit' as const,
            portionValue: 1,
            portionUnitLabel: 'porção',
            portionUnit: 'porção',
            portionLabel: item.description && !isSubstitution ? item.description : '1 porção',
            substitutions: []
          };
        })
      }));
      
      if (convertedMeals.length > 0) {
        initialMealsToUse = convertedMeals;
      }
    }
  }

  const tenantId = await getActiveTenant();
  if (!tenantId) {
    console.error('[v3-monitor] Blocked: Cannot create draft without valid tenant association');
    return null;
  }

  const payload: DraftPayload = { 
    meals: initialMealsToUse.length > 0 ? initialMealsToUse : seedMeals, 
    version: DRAFT_PAYLOAD_VERSION,
    audit_log: [] 
  };
  const macros = computeMacros(payload.meals);

  const { data: created, error: insErr } = await supabase
    .from('v3_drafts' as any)
    .insert({
      patient_id: patientId,
      nutritionist_id: nutritionistId,
      tenant_id: tenantId,
      payload,
      meta_kcal: macros.kcal,
      meta_protein: macros.protein,
      meta_carbs: macros.carbs,
      meta_fat: macros.fat,
    } as any)
    .select('*')
    .single();

  if (insErr) {
    console.error('[v3-monitor] Draft Creation Failure:', insErr.message);
    await logCriticalFailure('draft_failure', insErr.message, { patientId, nutritionistId, tenantId });
    return null;
  }
  console.info('[v3-draft] draft created successfully:', (created as any)?.id);
  return created as unknown as DraftRecord;
}

export async function saveDraft(
  draftId: string,
  meals: Meal[],
  auditLog: AuditLogEntry[] = []
): Promise<DraftRecord | null> {
  const macros = computeMacros(meals);
  const payload: DraftPayload = {
    meals,
    version: DRAFT_PAYLOAD_VERSION,
    audit_log: auditLog
  };

  const { data, error } = await supabase
    .from('v3_drafts' as any)
    .update({
      payload,
      meta_kcal: macros.kcal,
      meta_protein: macros.protein,
      meta_carbs: macros.carbs,
      meta_fat: macros.fat,
    } as any)
    .eq('id', draftId)
    .select('*')
    .single();

  if (error) {
    console.error('[v3-monitor] Draft Save Failure:', error.message);
    await logCriticalFailure('save_failure', error.message, { draftId, macros });
    return null;
  }
  
  const { data: userRes } = await supabase.auth.getUser();
  if (userRes.user) {
    const record = data as unknown as DraftRecord;
    try {
      await supabase.from('access_logs').insert({
        user_id: userRes.user.id,
        patient_id: record.patient_id,
        action: 'edit',
        resource: 'draft',
        user_agent: navigator.userAgent
      } as any);
    } catch (e) {
      // Silently ignore log conflicts
    }
  }

  return data as unknown as DraftRecord;
}

export async function discardDraft(draftId: string): Promise<void> {
  const { data: draft } = await supabase
    .from('v3_drafts' as any)
    .update({ draft_status: 'discarded' } as any)
    .eq('id', draftId)
    .select('patient_id')
    .single();

  const { data: userRes } = await supabase.auth.getUser();
  if (userRes.user && draft) {
    await supabase.from('access_logs').insert({
      user_id: userRes.user.id,
      patient_id: (draft as any).patient_id,
      action: 'delete',
      resource: 'draft',
      user_agent: navigator.userAgent
    } as any);
  }
}
