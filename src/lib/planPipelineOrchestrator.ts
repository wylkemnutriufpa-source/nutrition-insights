/**
 * Plan Pipeline Orchestrator — FitJourney v2.0
 * 
 * SINGLE SOURCE OF TRUTH for plan generation.
 * 
 * Flow:
 *   template/base → personalization (restrictions, TMB, schedule, rejected)
 *   → visual association → persist plan + items + audit log
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
import {
  loadPersonalizationContext,
  personalizePlanItems,
  type PersonalizationResult,
  type PersonalizationContext,
  type PersonalizationChange,
} from "./planPersonalizationEngine";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Pipeline version ─────────────────────────────────────────
export const PIPELINE_VERSION = "v2.0.0";

// ── Types ────────────────────────────────────────────────────
export interface PipelineInput {
  patientId: string;
  nutritionistId: string;
  tenantId: string;
  templateItems: Partial<MealPlanItem>[];
  planTitle: string;
  planDescription?: string;
  startDate: string;
  endDate?: string;
  totalTargetCalories?: number;
  totalTargetProtein?: number;
  totalTargetCarbs?: number;
  totalTargetFat?: number;
  skipPersonalization?: boolean;
  /** If provided, items will be inserted into this plan instead of creating a new one */
  existingPlanId?: string;
  /** Template slug for audit trail */
  templateSlug?: string;
}

export interface PipelineAuditLog {
  pipeline_version: string;
  generated_at: string;
  template_slug: string | null;
  personalization_applied: boolean;
  personalization_changes: PersonalizationChange[];
  schedule_source: string | null;
  schedule_warnings: string[];
  schedule_resolved: Record<string, string> | null;
  restrictions_applied: string[];
  rejected_foods_applied: string[];
  target_calories: number | null;
  target_protein: number | null;
  goal: string | null;
  warnings: string[];
  items_total: number;
  items_protected: number;
  items_personalized: number;
}

export interface PipelineResult {
  success: boolean;
  planId?: string;
  items: Partial<MealPlanItem>[];
  personalization: PersonalizationResult | null;
  context: PersonalizationContext | null;
  auditLog: PipelineAuditLog;
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

// ── Meal distribution safety: prevent calorie concentration ──
function validateMealDistribution(items: Partial<MealPlanItem>[]): { items: Partial<MealPlanItem>[]; warnings: string[] } {
  const warnings: string[] = [];

  // Group by day
  const dayGroups = new Map<number, Partial<MealPlanItem>[]>();
  for (const item of items) {
    const day = item.day_of_week ?? 0;
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(item);
  }

  for (const [day, dayItems] of dayGroups) {
    const totalCal = dayItems.reduce((s, i) => s + (i.calories_target || 0), 0);
    if (totalCal === 0) continue;

    // Check if any single meal has > 60% of daily calories
    for (const item of dayItems) {
      const itemCal = item.calories_target || 0;
      if (itemCal > 0 && totalCal > 0 && (itemCal / totalCal) > 0.60) {
        warnings.push(
          `Dia ${day}: "${item.title}" concentra ${Math.round((itemCal / totalCal) * 100)}% das calorias diárias — possível erro de distribuição`
        );
      }
    }

    // Check if all items have the same meal_type (all in one slot)
    const mealTypes = new Set(dayItems.map(i => i.meal_type));
    if (mealTypes.size === 1 && dayItems.length > 2) {
      warnings.push(
        `Dia ${day}: Todas as ${dayItems.length} refeições estão no mesmo horário (${[...mealTypes][0]}) — redistribuição recomendada`
      );
    }
  }

  return { items, warnings };
}

// ── Main pipeline ────────────────────────────────────────────
export async function runPlanPipeline(input: PipelineInput): Promise<PipelineResult> {
  const warnings: string[] = [];
  let personalizationResult: PersonalizationResult | null = null;
  let personalizationCtx: PersonalizationContext | null = null;

  // ── Step 1: Start with template items tagged as 'template'
  let items = tagItems(input.templateItems, "template");

  // ── Step 2: Personalize (restrictions, TMB, schedule, rejected foods)
  if (!input.skipPersonalization) {
    personalizationCtx = await loadPersonalizationContext(input.patientId);
    if (personalizationCtx) {
      // Split protected vs unprotected items
      const protectedItems = items.filter(i => isItemProtected(i as any));
      const unprotectedItems = items.filter(i => !isItemProtected(i as any));

      if (unprotectedItems.length > 0) {
        personalizationResult = personalizePlanItems(unprotectedItems, personalizationCtx);
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

  // ── Step 2.5: Validate meal distribution (prevent calorie concentration)
  const distributionCheck = validateMealDistribution(items);
  warnings.push(...distributionCheck.warnings);

  // ── Step 3: Build audit log
  const auditLog: PipelineAuditLog = {
    pipeline_version: PIPELINE_VERSION,
    generated_at: new Date().toISOString(),
    template_slug: input.templateSlug || null,
    personalization_applied: personalizationResult !== null,
    personalization_changes: personalizationResult?.changes || [],
    schedule_source: personalizationCtx?.scheduleSource || null,
    schedule_warnings: personalizationResult?.warnings.filter(w => w.includes("horário") || w.includes("padrão")) || [],
    schedule_resolved: personalizationCtx?.schedule || null,
    restrictions_applied: personalizationCtx?.restrictions || [],
    rejected_foods_applied: personalizationCtx?.rejectedFoods || [],
    target_calories: personalizationCtx?.targetCalories || null,
    target_protein: personalizationCtx?.targetProtein || null,
    goal: personalizationCtx?.goal || null,
    warnings,
    items_total: items.length,
    items_protected: items.filter(i => isItemProtected(i as any)).length,
    items_personalized: personalizationResult?.changes.length || 0,
  };

  // ── Step 4: Save plan (or use existing)
  let planId = input.existingPlanId;

  if (!planId) {
    const planInsert: TablesInsert<"meal_plans"> = {
      title: input.planTitle,
      description: input.planDescription || null,
      patient_id: input.patientId,
      nutritionist_id: input.nutritionistId,
      tenant_id: input.tenantId,
      start_date: input.startDate,
      end_date: input.endDate || null,
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
      generation_metadata: auditLog as any,
    };

    const { data: newPlan, error: planErr } = await supabase
      .from("meal_plans")
      .insert(planInsert)
      .select("id")
      .single();

    if (planErr || !newPlan) {
      console.error("[Pipeline] Failed to create plan:", planErr);
      return {
        success: false, items, personalization: personalizationResult,
        context: personalizationCtx, auditLog,
        warnings: [...warnings, "Falha ao criar plano"],
        pipelineVersion: PIPELINE_VERSION,
      };
    }
    planId = newPlan.id;
  } else {
    // Update existing plan with pipeline metadata
    await supabase.from("meal_plans").update({
      pipeline_version: PIPELINE_VERSION,
      pipeline_completed_at: new Date().toISOString(),
      personalization_applied: personalizationResult !== null,
      generation_metadata: auditLog as any,
    }).eq("id", planId);
  }

  // ── Step 5: Insert items with state flags
  const itemInserts: TablesInsert<"meal_plan_items">[] = items.map(item => ({
    meal_plan_id: planId!,
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
    planId,
    items,
    personalization: personalizationResult,
    context: personalizationCtx,
    auditLog,
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
