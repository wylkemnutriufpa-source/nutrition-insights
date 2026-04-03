/**
 * Applies a therapeutic intervention to an active meal plan.
 * Creates a version snapshot, scales items, and persists changes.
 */
import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/monitoring";
import type { Json } from "@/integrations/supabase/types";
import { compareMealPlanCollections, haveMealPlanCollectionsChanged } from "@/lib/mealPlanPersistenceGuards";

interface AdjustmentParams {
  planId: string;
  patientId: string;
  interventionId: string;
  interventionType: string;
  caloricAdjustmentPercent: number;
  clinicalReason: string;
  appliedBy: string;
  metadata?: Record<string, any>;
}

interface AdjustmentResult {
  success: boolean;
  beforeCalories: number;
  afterCalories: number;
  changedFields: string[];
  versionId: string | null;
  error?: string;
}

export async function applyTherapeuticAdjustment(params: AdjustmentParams): Promise<AdjustmentResult> {
  const { planId, patientId, interventionId, interventionType, caloricAdjustmentPercent, clinicalReason, appliedBy, metadata } = params;
  const section = "TherapeuticAdjustment";

  try {
    // 1. Fetch current plan
    const { data: plan, error: planError } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      logError(section, "Plano não encontrado", { planId, error: planError?.message });
      return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "Plano alimentar não encontrado. Verifique se o plano ainda existe." };
    }

    // 2. Fetch current items
    const { data: items, error: itemsError } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planId);

    if (itemsError) {
      logError(section, "Falha ao carregar itens do plano", { planId, error: itemsError.message });
      return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "Não foi possível carregar os itens do plano. Tente novamente." };
    }

    const currentItems = items || [];

    if (currentItems.length === 0) {
      logWarn(section, "Plano sem itens para ajustar", { planId });
      return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "O plano não possui refeições para ajustar." };
    }

    // 3. Calculate current totals from items
    const beforeCalories = currentItems.reduce((sum, item) => sum + (item.calories_target || 0), 0);
    const beforeProtein = currentItems.reduce((sum, item) => sum + (item.protein_target || 0), 0);
    const beforeCarbs = currentItems.reduce((sum, item) => sum + (item.carbs_target || 0), 0);
    const beforeFat = currentItems.reduce((sum, item) => sum + (item.fat_target || 0), 0);

    const expectedItems = currentItems.map((item) => ({
      ...item,
      calories_target: Math.round((item.calories_target || 0) * (1 + (caloricAdjustmentPercent / 100))),
      protein_target: Math.round(((item.protein_target || 0) * (1 + (caloricAdjustmentPercent / 100))) * 10) / 10,
      carbs_target: Math.round(((item.carbs_target || 0) * (1 + (caloricAdjustmentPercent / 100))) * 10) / 10,
      fat_target: Math.round(((item.fat_target || 0) * (1 + (caloricAdjustmentPercent / 100))) * 10) / 10,
    }));

    if (!haveMealPlanCollectionsChanged(currentItems, expectedItems)) {
      return { success: false, beforeCalories, afterCalories: beforeCalories, changedFields: [], versionId: null, error: "Nenhuma alteração foi aplicada." };
    }

    // 4. Create version snapshot BEFORE changes
    const { data: version, error: versionError } = await supabase
      .from("meal_plan_versions")
      .insert({
        meal_plan_id: planId,
        snapshot_json: plan as unknown as Json,
        items_snapshot: currentItems as unknown as Json,
        changed_by: appliedBy,
        change_reason: `[${interventionType}] ${clinicalReason}`,
        changed_fields: ["calories_target", "protein_target", "carbs_target", "fat_target"],
      })
      .select("id")
      .single();

    if (versionError) {
      logWarn(section, "Falha ao criar snapshot de versão", { planId, error: versionError.message });
    }

    const versionId = version?.id ?? null;

    // 5. Calculate adjustment factor
    const factor = 1 + (caloricAdjustmentPercent / 100);
    const changedFields = ["calories_target", "protein_target", "carbs_target", "fat_target"];

    // 6. Batch-update all items in a single RPC-style loop (avoid N+1)
    const updatePromises = currentItems.map((item) =>
      supabase
        .from("meal_plan_items")
        .update({
          calories_target: Math.round((item.calories_target || 0) * factor),
          protein_target: Math.round(((item.protein_target || 0) * factor) * 10) / 10,
          carbs_target: Math.round(((item.carbs_target || 0) * factor) * 10) / 10,
          fat_target: Math.round(((item.fat_target || 0) * factor) * 10) / 10,
        })
        .eq("id", item.id)
    );

    const results = await Promise.all(updatePromises);
    const failedUpdates = results.filter((r) => r.error);
    if (failedUpdates.length > 0) {
      logError(section, `${failedUpdates.length}/${currentItems.length} itens falharam ao atualizar`, { planId });
      return { success: false, beforeCalories, afterCalories: beforeCalories, changedFields: [], versionId, error: "Falha ao persistir todos os itens ajustados no banco." };
    }

    // 7. Update plan-level totals and therapeutic fields
    const afterCalories = Math.round(beforeCalories * factor);
    const afterProtein = Math.round(beforeProtein * factor * 10) / 10;
    const afterCarbs = Math.round(beforeCarbs * factor * 10) / 10;
    const afterFat = Math.round(beforeFat * factor * 10) / 10;

    const { error: planUpdateError } = await supabase
      .from("meal_plans")
      .update({
        total_target_calories: afterCalories,
        total_target_protein: afterProtein,
        total_target_carbs: afterCarbs,
        total_target_fat: afterFat,
        therapeutic_effectiveness_status: interventionType,
        therapeutic_efficacy_score: metadata?.efficacy_score ?? null,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", planId);

    if (planUpdateError) {
      logError(section, "Falha ao atualizar totais do plano", { planId, error: planUpdateError.message });
      return { success: false, beforeCalories, afterCalories: beforeCalories, changedFields: [], versionId, error: "Os itens foram alterados, mas os totais do plano não foram confirmados." };
    }

    const { data: persistedItems, error: persistedItemsError } = await supabase
      .from("meal_plan_items")
      .select("title, description, meal_type, day_of_week, calories_target, protein_target, carbs_target, fat_target")
      .eq("meal_plan_id", planId);

    if (persistedItemsError) {
      logError(section, "Falha ao reler itens persistidos", { planId, error: persistedItemsError.message });
      return { success: false, beforeCalories, afterCalories: beforeCalories, changedFields: [], versionId, error: "Falha ao confirmar a persistência do ajuste no banco." };
    }

    const persistenceCheck = compareMealPlanCollections(expectedItems, persistedItems || []);
    if (!persistenceCheck.matches) {
      logError(section, "Diferença entre ajuste esperado e itens persistidos", { planId, persistenceCheck });
      return { success: false, beforeCalories, afterCalories: beforeCalories, changedFields: [], versionId, error: "O sistema não confirmou o diff real no banco após o ajuste." };
    }

    // 8. Log in audit trail
    const { error: auditError } = await supabase.from("clinical_auto_adjustment_logs").insert({
      patient_id: patientId,
      adjustment_type: interventionType,
      triggering_driver: "therapeutic_suggestion",
      adjustment_parameters: {
        intervention_id: interventionId,
        caloric_adjustment_percent: caloricAdjustmentPercent,
        before_calories: beforeCalories,
        after_calories: afterCalories,
        before_protein: beforeProtein,
        after_protein: afterProtein,
        before_carbs: beforeCarbs,
        after_carbs: afterCarbs,
        before_fat: beforeFat,
        after_fat: afterFat,
        version_id: versionId,
      },
      expected_clinical_effect: clinicalReason,
      approved_by_guardrail: true,
      automation_confidence: (metadata?.efficacy_score ?? 0) / 100,
    });

    if (auditError) {
      logWarn(section, "Falha ao gravar log de auditoria", { planId, error: auditError.message });
    }

    console.info(`[FJ:${section}] Ajuste aplicado com sucesso`, {
      planId,
      factor,
      beforeCalories,
      afterCalories,
      itemsUpdated: currentItems.length - failedUpdates.length,
    });

    return {
      success: true,
      beforeCalories,
      afterCalories,
      changedFields,
      versionId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError(section, "Erro inesperado no ajuste terapêutico", { planId, error: message });
    return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "Ocorreu um erro inesperado ao aplicar o ajuste. Tente novamente." };
  }
}
