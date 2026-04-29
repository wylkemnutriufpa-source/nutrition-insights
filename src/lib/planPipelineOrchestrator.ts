/**
 * Plan Pipeline Orchestrator — FitJourney v3.0 (Wrapper)
 * 
 * DELEGATES all generation to the `generate-meal-plan` Edge Function.
 * This file is a thin wrapper that maintains backward compatibility
 * for callers (e.g. DietTemplates) while routing through the single
 * official engine on the server.
 * 
 * The Edge Function handles:
 *   - TMB/TDEE calculation
 *   - Food selection (DB-driven or preset)
 *   - Macro reconciliation
 *   - Visual library resolution (visual_library_item_id)
 *   - Substitution generation
 *   - Audit logging
 * 
 * Item-level state flags (still honored):
 *   - item_origin: 'template' | 'personalized' | 'auto_corrected' | 'manual'
 *   - is_manually_edited: protects from engine recalculation
 *   - is_locked: hard lock, nothing can touch this item
 *   - was_auto_corrected: audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { friendlyEdgeFunctionError } from "@/lib/edgeFunctionErrorHelper";
import { invokeWithRetry } from "@/lib/api/edgeFunctions";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Pipeline version ─────────────────────────────────────────
export const PIPELINE_VERSION = "v3.0.0";

// ── Types (backward-compatible) ──────────────────────────────
export interface PipelineInput {
  patientId: string;
  nutritionistId: string;
  tenantId: string;
  templateItems?: Partial<MealPlanItem>[];
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
  /** Generation mode passed to the edge function */
  generationMode?: "quick" | "smart" | "clinical";
}

export interface PersonalizationChange {
  type: string;
  detail: string;
  mealType?: string;
  dayOfWeek?: number;
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
  personalization: { changes: PersonalizationChange[] } | null;
  context: null;
  auditLog: PipelineAuditLog;
  warnings: string[];
  pipelineVersion: string;
}

// ── Item origin helpers (still exported for editor/autofix) ──

/** Check if an item should be skipped by engines */
export function isItemProtected(item: Partial<MealPlanItem> & { is_locked?: boolean; is_manually_edited?: boolean }): boolean {
  return Boolean(item.is_locked || item.is_manually_edited);
}

// ── Substitution behavior definition (unchanged) ─────────────
export const SUBSTITUTION_RULES = {
  modifiesOfficialPlan: false,
  defaultTolerancePercent: 10,
  alertOnExcessDeviation: true,
  maxSubstitutionsPerDay: 3,
} as const;

// ── Main pipeline (now delegates to Edge Function) ───────────
export async function runPlanPipeline(input: PipelineInput): Promise<PipelineResult> {
  const emptyAudit: PipelineAuditLog = {
    pipeline_version: PIPELINE_VERSION,
    generated_at: new Date().toISOString(),
    template_slug: input.templateSlug || null,
    personalization_applied: false,
    personalization_changes: [],
    schedule_source: null,
    schedule_warnings: [],
    schedule_resolved: null,
    restrictions_applied: [],
    rejected_foods_applied: [],
    target_calories: input.totalTargetCalories || null,
    target_protein: input.totalTargetProtein || null,
    goal: null,
    warnings: [],
    items_total: 0,
    items_protected: 0,
    items_personalized: 0,
  };

  try {
    const { data, error } = await invokeWithRetry("generate-meal-plan", {
      body: {
        patientId: input.patientId,
        nutritionistId: input.nutritionistId,
        meal_plan_id: input.existingPlanId || undefined,
        generationMode: input.generationMode || "quick",
        isPipeline: false,
        templateSlug: input.templateSlug,
      },
    });


    if (error) {
      const msg = await friendlyEdgeFunctionError(error, "Erro ao gerar plano via engine central");
      console.error("[PipelineWrapper] Edge function error:", error);
      return {
        success: false,
        items: [],
        personalization: null,
        context: null,
        auditLog: { ...emptyAudit, warnings: [msg] },
        warnings: [msg],
        pipelineVersion: PIPELINE_VERSION,
      };
    }

    if (!data?.success) {
      const msg = data?.error || "Erro desconhecido na engine de geração";
      return {
        success: false,
        items: [],
        personalization: null,
        context: null,
        auditLog: { ...emptyAudit, warnings: [msg] },
        warnings: [msg],
        pipelineVersion: PIPELINE_VERSION,
      };
    }

    // Fetch the generated items for backward compatibility
    const planId = data.mealPlanId;
    const { data: generatedItems } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planId);

    const items = (generatedItems || []) as Partial<MealPlanItem>[];

    // Invalidate caches after successful generation
    try {
      const { QueryClient } = await import("@tanstack/react-query");
      const qc = (window as any).__REACT_QUERY_CLIENT__ as import("@tanstack/react-query").QueryClient | undefined;
      if (qc) {
        const { invalidateCriticalQueries } = await import("@/lib/queryInvalidation");
        invalidateCriticalQueries(qc, input.patientId);
      }
      // Clear editor sessionStorage for previous plans
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("meal-plan-editor:")) sessionStorage.removeItem(key);
        }
      } catch {}
    } catch {}

    return {
      success: true,
      planId,
      items,
      personalization: null,
      context: null,
      auditLog: {
        ...emptyAudit,
        items_total: data.items_count || items.length,
        personalization_applied: true,
        warnings: [],
      },
      warnings: [],
      pipelineVersion: PIPELINE_VERSION,
    };
  } catch (err: any) {
    const msg = err.message || "Erro inesperado no pipeline";
    console.error("[PipelineWrapper] Unexpected error:", err);
    return {
      success: false,
      items: [],
      personalization: null,
      context: null,
      auditLog: { ...emptyAudit, warnings: [msg] },
      warnings: [msg],
      pipelineVersion: PIPELINE_VERSION,
    };
  }
}

// ── Mark item as manually edited (unchanged) ─────────────────
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
