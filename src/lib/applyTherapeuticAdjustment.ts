/**
 * Applies a therapeutic intervention to an active meal plan.
 * Creates a version snapshot, scales items, and persists changes.
 */
import { supabase } from "@/integrations/supabase/client";

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

  try {
    // 1. Fetch current plan
    const { data: plan, error: planError } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "Plano não encontrado" };
    }

    // 2. Fetch current items
    const { data: items, error: itemsError } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planId);

    if (itemsError) {
      return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: "Erro ao carregar itens" };
    }

    const currentItems = items || [];

    // 3. Calculate current totals from items
    const beforeCalories = currentItems.reduce((sum, item) => sum + (item.calories_target || 0), 0);
    const beforeProtein = currentItems.reduce((sum, item) => sum + (item.protein_target || 0), 0);
    const beforeCarbs = currentItems.reduce((sum, item) => sum + (item.carbs_target || 0), 0);
    const beforeFat = currentItems.reduce((sum, item) => sum + (item.fat_target || 0), 0);

    // 4. Create version snapshot BEFORE changes
    const { data: version, error: versionError } = await supabase
      .from("meal_plan_versions")
      .insert({
        meal_plan_id: planId,
        snapshot_json: plan as any,
        items_snapshot: currentItems as any,
        changed_by: appliedBy,
        change_reason: `[${interventionType}] ${clinicalReason}`,
        changed_fields: ["calories_target", "protein_target", "carbs_target", "fat_target"],
      })
      .select("id")
      .single();

    const versionId = version?.id ?? null;

    // 5. Calculate adjustment factor
    const factor = 1 + (caloricAdjustmentPercent / 100);
    const changedFields: string[] = [];

    // 6. Scale each meal_plan_item proportionally
    for (const item of currentItems) {
      const newCalories = Math.round((item.calories_target || 0) * factor);
      const newProtein = Math.round(((item.protein_target || 0) * factor) * 10) / 10;
      const newCarbs = Math.round(((item.carbs_target || 0) * factor) * 10) / 10;
      const newFat = Math.round(((item.fat_target || 0) * factor) * 10) / 10;

      await supabase
        .from("meal_plan_items")
        .update({
          calories_target: newCalories,
          protein_target: newProtein,
          carbs_target: newCarbs,
          fat_target: newFat,
        })
        .eq("id", item.id);
    }

    changedFields.push("calories_target", "protein_target", "carbs_target", "fat_target");

    // 7. Update plan-level totals and therapeutic fields
    const afterCalories = Math.round(beforeCalories * factor);
    const afterProtein = Math.round(beforeProtein * factor * 10) / 10;
    const afterCarbs = Math.round(beforeCarbs * factor * 10) / 10;
    const afterFat = Math.round(beforeFat * factor * 10) / 10;

    await supabase
      .from("meal_plans")
      .update({
        total_target_calories: afterCalories,
        total_target_protein: afterProtein,
        total_target_carbs: afterCarbs,
        total_target_fat: afterFat,
        therapeutic_effectiveness_status: interventionType,
        therapeutic_efficacy_score: metadata?.efficacy_score ?? null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", planId);

    // 8. Log in audit trail
    await supabase.from("clinical_auto_adjustment_logs").insert({
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

    return {
      success: true,
      beforeCalories,
      afterCalories,
      changedFields,
      versionId,
    };
  } catch (err: any) {
    console.error("[applyTherapeuticAdjustment]", err);
    return { success: false, beforeCalories: 0, afterCalories: 0, changedFields: [], versionId: null, error: err.message };
  }
}
