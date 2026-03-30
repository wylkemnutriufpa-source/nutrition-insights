/**
 * Plan Pipeline Orchestrator — FitJourney v1.0
 * 
 * SINGLE SOURCE OF TRUTH for plan generation.
 * 
 * Flow:
 *   template/base → personalization → auto-corrections → validation → save
 * 
 * After pipeline completes, ALL consumers (editor, preview, patient, PDF,
 * publication, audit) read the saved result — they NEVER recalculate.
 * 
 * Item-level state flags:
 *   - item_origin: 'template' | 'personalized' | 'auto_corrected' | 'manual'
 *   - is_manually_edited: protects from engine recalculation
 *   - is_locked: hard lock, nothing can touch this item
 *   - was_auto_corrected: audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { loadPersonalizationContext, personalizePlanItems, type PersonalizationResult } from "./planPersonalizationEngine";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Pipeline version ─────────────────────────────────────────
export const PIPELINE_VERSION = "v1.0.0";

// ── Types ────────────────────────────────────────────────────
export interface PipelineInput {
  patientId: string;
  nutritionistId: string;
  tenantId: string;
  templateItems: Partial<MealPlanItem>[];
  planTitle: string;
  planDescription?: string;
  startDate: string;
  endDate: string;
  totalTargetCalories?: number;
  totalTargetProtein?: number;
  totalTargetCarbs?: number;
  totalTargetFat?: number;
  skipPersonalization?: boolean;
}

export interface PipelineResult {
  success: boolean;
  planId?: string;
  items: Partial<MealPlanItem>[];
  personalization: PersonalizationResult | null;
  warnings: string[];
  pipelineVersion: string;
}

// ── Item origin helpers ──────────────────────────────────────

/** Check if an item should be skipped by engines */
export function isItemProtected(item: Partial<MealPlanItem> & { is_locked?: boolean; is_manually_edited?: boolean }): boolean {
  return Boolean(item.is_locked || item.is_manually_edited);
}

/** Tag items with origin metadata */
function tagItems(
  items: Partial<MealPlanItem>[],
  origin: string,
  wasAutoCorrected = false,
): Partial<MealPlanItem>[] {
  return items.map(item => ({
    ...item,
    item_origin: (item as any).is_manually_edited ? (item as any).item_origin : origin,
    was_auto_corrected: wasAutoCorrected || (item as any).was_auto_corrected || false,
  }));
}

// ── Main pipeline ────────────────────────────────────────────
export async function runPlanPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  let personalizationResult: PersonalizationResult | null = null;

  // ── Step 1: Start with template items tagged as 'template'
  let items = tagItems(input.templateItems, "template");

  // ── Step 2: Personalize (restrictions, TMB, schedule, rejected foods)
  if (!input.skipPersonalization) {
    const ctx = await loadPersonalizationContext(input.patientId);
    if (ctx) {
      // Split protected vs unprotected items
      const protectedItems = items.filter(i => isItemProtected(i as any));
      const unprotectedItems = items.filter(i => !isItemProtected(i as any));

      if (unprotectedItems.length > 0) {
        personalizationResult = personalizePlanItems(unprotectedItems, ctx);
        const personalizedItems = tagItems(personalizationResult.items, "personalized");
        items = [...protectedItems, ...personalizedItems];
        warnings.push(...personalizationResult.warnings);
      } else {
        warnings.push("Todos os itens estão protegidos — personalização ignorada");
      }
    } else {
      warnings.push("Contexto de personalização não disponível — usando template direto");
    }
  }

  // ── Step 3: Save plan as inactive draft
  const planInsert: TablesInsert<"meal_plans"> = {
    title: input.planTitle,
    description: input.planDescription || null,
    patient_id: input.patientId,
    nutritionist_id: input.nutritionistId,
    tenant_id: input.tenantId,
    start_date: input.startDate,
    end_date: input.endDate,
    plan_status: "draft",
    is_active: false,
    generation_source: "pipeline_orchestrator",
    total_target_calories: input.totalTargetCalories || null,
    total_target_protein: input.totalTargetProtein || null,
    total_target_carbs: input.totalTargetCarbs || null,
    total_target_fat: input.totalTargetFat || null,
    editor_version: "v2",
    pipeline_version: PIPELINE_VERSION,
    pipeline_completed_at: new Date().toISOString(),
    personalization_applied: personalizationResult !== null,
    generation_metadata: {
      engine: "plan_pipeline_orchestrator",
      pipeline_version: PIPELINE_VERSION,
      personalization_changes: personalizationResult?.changes?.length || 0,
      warnings,
      generated_at: new Date().toISOString(),
    } as any,
  };

  const { data: newPlan, error: planErr } = await supabase
    .from("meal_plans")
    .insert(planInsert)
    .select("id")
    .single();

  if (planErr || !newPlan) {
    console.error("[Pipeline] Failed to create plan:", planErr);
    return { success: false, items, personalization: personalizationResult, warnings: [...warnings, "Falha ao criar plano"], pipelineVersion: PIPELINE_VERSION };
  }

  // ── Step 4: Insert items with state flags
  const itemInserts: TablesInsert<"meal_plan_items">[] = items.map(item => ({
    meal_plan_id: newPlan.id,
    title: item.title || "",
    description: item.description || null,
    meal_type: (item.meal_type || "breakfast") as TablesInsert<"meal_plan_items">["meal_type"],
    day_of_week: item.day_of_week ?? 0,
    calories_target: item.calories_target || null,
    protein_target: item.protein_target || null,
    carbs_target: item.carbs_target || null,
    fat_target: item.fat_target || null,
    tenant_id: input.tenantId,
    item_origin: (item as any).item_origin || "template",
    is_manually_edited: (item as any).is_manually_edited || false,
    is_locked: (item as any).is_locked || false,
    was_auto_corrected: (item as any).was_auto_corrected || false,
  }));

  const { error: itemsErr } = await supabase
    .from("meal_plan_items")
    .insert(itemInserts);

  if (itemsErr) {
    console.error("[Pipeline] Failed to insert items:", itemsErr);
    warnings.push("Erro ao salvar itens do plano");
  }

  return {
    success: true,
    planId: newPlan.id,
    items,
    personalization: personalizationResult,
    warnings,
    pipelineVersion: PIPELINE_VERSION,
  };
}

// ── Mark item as manually edited ─────────────────────────────
export async function markItemAsManuallyEdited(
  itemId: string,
  editedBy: string,
  previousValues?: Record<string, any>,
): Promise<boolean> {
  const { error } = await supabase
    .from("meal_plan_items")
    .update({
      is_manually_edited: true,
      is_locked: true,
      item_origin: "manual",
      edit_metadata: {
        edited_by: editedBy,
        edited_at: new Date().toISOString(),
        previous_values: previousValues || null,
      },
    })
    .eq("id", itemId);

  if (error) {
    console.error("[Pipeline] Failed to mark item as edited:", error);
    return false;
  }
  return true;
}

// ── Substitution behavior definition ─────────────────────────
/**
 * Patient substitutions are OVERLAYS — they do NOT modify the official plan.
 * 
 * Behavior rules:
 * 1. substitution.alters_macros = false → visual/behavioral only
 * 2. substitution.alters_macros = true → recalculate macros for patient view
 * 3. substitution.tolerance_percent → acceptable deviation (default 10%)
 * 4. If deviation > tolerance → generate clinical_alert for nutritionist
 * 
 * The official plan (meal_plan_items) is NEVER modified by patient substitutions.
 * The nutritionist sees: original + substitution overlay + caloric delta.
 */
export const SUBSTITUTION_RULES = {
  /** Substitutions are overlays, never modify the plan */
  modifiesOfficialPlan: false,
  /** Default macro tolerance before alert */
  defaultTolerancePercent: 10,
  /** Generate alert if substitution deviates beyond tolerance */
  alertOnExcessDeviation: true,
  /** Maximum substitutions per day before warning */
  maxSubstitutionsPerDay: 3,
} as const;
