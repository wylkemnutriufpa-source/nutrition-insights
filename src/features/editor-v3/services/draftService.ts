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

async function getActiveTenant(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_active_tenant');
    if (error) {
      console.error('[v3-draft] RPC get_user_active_tenant failed:', error.message);
      return null;
    }
    if (!data) {
      console.warn('[v3-draft] No active tenant found for user');
    }
    return (data as string | null) ?? null;
  } catch (err) {
    console.error('[v3-draft] Unexpected error fetching active tenant:', err);
    return null;
  }
}

function computeMacros(meals: Meal[]) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const meal of meals) {
    for (const item of meal.items) {
      const q = item.quantity ?? 1;
      const baseKcal = Number(item.kcal || item.calories || 0);
      const baseProtein = Number(item.protein || 0);
      const baseCarbs = Number(item.carbs || 0);
      const baseFat = Number(item.fat || 0);
      const factor = (item.measurementType === 'gram' || item.measurementType === 'ml') ? q / 100 : q;

      kcal += baseKcal * factor;
      protein += baseProtein * factor;
      carbs += baseCarbs * factor;
      fat += baseFat * factor;
    }
  }
  return { kcal, protein, carbs, fat };
}

export async function loadOrCreateDraft(
  patientId: string,
  seedMeals: Meal[] = []
): Promise<DraftRecord | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const nutritionistId = userRes.user?.id;
  if (!nutritionistId) return null;

  await supabase.from('access_logs').insert({
    user_id: nutritionistId,
    patient_id: patientId,
    action: 'view',
    resource: 'draft',
    user_agent: navigator.userAgent
  } as any);

  const { data: existing, error: findErr } = await supabase
    .from('v3_drafts' as any)
    .select('*')
    .eq('nutritionist_id', nutritionistId)
    .eq('patient_id', patientId)
    .eq('draft_status', 'editing')
    .maybeSingle();

  if (findErr) {
    console.warn('[v3-draft] load failed, will fallback to local');
    return null;
  }
  if (existing) {
    const record = existing as unknown as DraftRecord;
    if (record.payload?.meals) {
      record.payload.meals = normalizeMeals(record.payload.meals);
    }
    return record;
  }

  const tenantId = await getActiveTenant();
  if (!tenantId) {
    console.warn('[v3-draft] no active tenant — cannot create draft');
    return null;
  }

  const payload: DraftPayload = { 
    meals: seedMeals, 
    version: DRAFT_PAYLOAD_VERSION,
    audit_log: [] 
  };
  const macros = computeMacros(seedMeals);

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
    console.error('[v3-draft] create failed:', insErr.message);
    return null;
  }
  console.info('[v3-draft] draft created successfully:', (created as any)?.id);
  return created as unknown as DraftRecord;
}

export async function saveDraft(
  draftId: string,
  meals: Meal[]
): Promise<DraftRecord | null> {
  const macros = computeMacros(meals);
  const payload: DraftPayload = {
    meals,
    version: DRAFT_PAYLOAD_VERSION,
    audit_log: []
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
    console.warn('[v3-draft] save failed — keeping local fallback', error.message);
    return null;
  }
  
  const { data: userRes } = await supabase.auth.getUser();
  if (userRes.user) {
    const record = data as unknown as DraftRecord;
    await supabase.from('access_logs').insert({
      user_id: userRes.user.id,
      patient_id: record.patient_id,
      action: 'edit',
      resource: 'draft',
      user_agent: navigator.userAgent
    } as any);
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
