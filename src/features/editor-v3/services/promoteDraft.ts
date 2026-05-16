/**
 * Editor V3 — Promotor de Drafts (Wrapper Soberano)
 */
import { planPersistenceService } from './planPersistenceService';
import type { DraftRecord } from './draftService';

export interface PromoteResult {
  ok: boolean;
  mealPlanId?: string;
  sharingToken?: string;
  error?: string;
}

/**
 * Promove um draft para um plano clínico oficial usando o serviço unificado de persistência.
 */
export async function promoteDraftToMealPlan(
  draft: DraftRecord,
  options?: { title?: string }
): Promise<PromoteResult> {
  const result = await planPersistenceService.publishPlan({
    patientId: draft.patient_id,
    nutritionistId: draft.nutritionist_id,
    meals: draft.payload?.meals || [],
    targets: {
      kcal: draft.meta_kcal || draft.payload?.nutritional_score?.totals?.kcal || 0,
      protein: draft.meta_protein || draft.payload?.nutritional_score?.totals?.protein || 0,
      carbs: draft.meta_carbs || draft.payload?.nutritional_score?.totals?.carbs || 0,
      fat: draft.meta_fat || draft.payload?.nutritional_score?.totals?.fat || 0
    },
    title: options?.title,
    draftId: draft.id
  });

  return {
    ok: result.ok,
    mealPlanId: result.planId,
    error: result.error
  };
}
