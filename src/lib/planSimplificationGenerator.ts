/**
 * Gerador de Versão Simplificada de Plano Alimentar — FitJourney v3.0
 * 
 * Lê o plano atual, detecta problemas, substitui alimentos bloqueados
 * e gera um draft simplificado preservando metas nutricionais.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  calculatePlanSimplicityScore,
  getSimpleBrazilianReplacement,
  BRAZILIAN_REPLACEMENTS,
  type MealItemForAudit,
  type SimplicityScore,
  type SimplicityIssue,
} from "./planSimplicityEngine";
import { BLOCKED_FOODS } from "./mealPlanFoodRules";

type MealPlan = Tables<"meal_plans">;
type MealPlanItem = Tables<"meal_plan_items">;

// ── Types ────────────────────────────────────────────────────

export interface SimplificationResult {
  success: boolean;
  originalScore: SimplicityScore;
  simplifiedScore: SimplicityScore;
  newPlanId?: string;
  replacements: Array<{
    itemId: string;
    originalTitle: string;
    originalDescription: string | null;
    newTitle: string;
    newDescription: string | null;
  }>;
  issues: SimplicityIssue[];
  warnings: string[];
}

export interface SimplificationPreview {
  originalItems: MealPlanItem[];
  simplifiedItems: Array<MealPlanItem & { _modified?: boolean; _replacements?: string[] }>;
  originalScore: SimplicityScore;
  projectedScore: SimplicityScore;
  replacementsApplied: number;
  issuesResolved: number;
}

// ── Normalize helper ─────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// ── Apply text replacements to a food description ────────────

function applyTextReplacements(text: string): { newText: string; replacements: string[] } {
  let result = text;
  const replacements: string[] = [];

  for (const [key, value] of Object.entries(BRAZILIAN_REPLACEMENTS)) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result)) {
      result = result.replace(regex, value.replacement);
      replacements.push(`${key} → ${value.replacement}`);
    }
  }

  // Also check BLOCKED_FOODS that aren't in the replacement map
  for (const blocked of BLOCKED_FOODS) {
    const regex = new RegExp(blocked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result) && !replacements.some(r => r.startsWith(blocked))) {
      const replacement = getSimpleBrazilianReplacement(blocked);
      if (replacement && replacement.replacement !== "remover") {
        result = result.replace(regex, replacement.replacement);
        replacements.push(`${blocked} → ${replacement.replacement}`);
      } else {
        // Remove the blocked food entirely
        result = result.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
        replacements.push(`${blocked} → removido`);
      }
    }
  }

  return { newText: result, replacements };
}

// ── Generate Simplification Preview (no DB writes) ───────────

export function generateSimplificationPreview(
  items: MealPlanItem[]
): SimplificationPreview {
  const auditItems: MealItemForAudit[] = items.map(i => ({
    id: i.id,
    title: i.title,
    description: i.description,
    meal_type: i.meal_type,
    day_of_week: i.day_of_week,
    calories_target: i.calories_target,
    protein_target: i.protein_target,
    carbs_target: i.carbs_target,
    fat_target: i.fat_target,
  }));

  const originalScore = calculatePlanSimplicityScore(auditItems);

  let replacementsApplied = 0;
  const simplifiedItems = items.map(item => {
    const titleResult = applyTextReplacements(item.title);
    const descResult = applyTextReplacements(item.description || "");
    
    const modified = titleResult.replacements.length > 0 || descResult.replacements.length > 0;
    if (modified) replacementsApplied++;

    return {
      ...item,
      title: titleResult.newText || item.title,
      description: descResult.newText || item.description,
      _modified: modified,
      _replacements: [...titleResult.replacements, ...descResult.replacements],
    };
  });

  const simplifiedAuditItems: MealItemForAudit[] = simplifiedItems.map(i => ({
    id: i.id,
    title: i.title,
    description: i.description,
    meal_type: i.meal_type,
    day_of_week: i.day_of_week,
    calories_target: i.calories_target,
    protein_target: i.protein_target,
    carbs_target: i.carbs_target,
    fat_target: i.fat_target,
  }));

  const projectedScore = calculatePlanSimplicityScore(simplifiedAuditItems);

  return {
    originalItems: items,
    simplifiedItems,
    originalScore,
    projectedScore,
    replacementsApplied,
    issuesResolved: originalScore.issues.length - projectedScore.issues.length,
  };
}

// ── Generate Simplified Version (writes to DB) ───────────────

export async function generateSimplifiedMealPlanVersion(
  planId: string,
  patientId: string,
  nutritionistId: string,
  tenantId: string
): Promise<SimplificationResult> {
  const warnings: string[] = [];

  // 1. Load current plan
  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planErr || !plan) {
    return { success: false, originalScore: emptyScore(), simplifiedScore: emptyScore(), replacements: [], issues: [], warnings: ["Plano não encontrado"] };
  }

  // Block simplification of immutable plans
  if (["approved", "published", "published_to_patient"].includes(plan.plan_status)) {
    // We'll create a NEW draft, not modify existing
  }

  // 2. Load items
  const { data: items, error: itemsErr } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("meal_plan_id", planId);

  if (itemsErr || !items) {
    return { success: false, originalScore: emptyScore(), simplifiedScore: emptyScore(), replacements: [], issues: [], warnings: ["Itens do plano não encontrados"] };
  }

  // 3. Calculate original score
  const preview = generateSimplificationPreview(items);

  if (preview.originalScore.total >= 90) {
    return {
      success: true,
      originalScore: preview.originalScore,
      simplifiedScore: preview.originalScore,
      replacements: [],
      issues: [],
      warnings: ["Plano já está simples e adequado (score ≥ 90)"],
    };
  }

  // 4. Create new draft plan
  const newPlanInsert: TablesInsert<"meal_plans"> = {
    title: `${plan.title} (Simplificado)`,
    description: `Versão simplificada gerada automaticamente a partir do plano "${plan.title}"`,
    patient_id: patientId,
    nutritionist_id: nutritionistId,
    tenant_id: tenantId,
    start_date: plan.start_date,
    end_date: plan.end_date,
    plan_status: "draft_auto_generated",
    is_active: false,
    generation_source: "simplification_engine",
    previous_plan_id: planId,
    total_target_calories: plan.total_target_calories,
    total_target_protein: plan.total_target_protein,
    total_target_carbs: plan.total_target_carbs,
    total_target_fat: plan.total_target_fat,
    editor_version: "v2",
    generation_metadata: {
      engine: "simplification_v1",
      original_plan_id: planId,
      original_score: preview.originalScore.total,
      projected_score: preview.projectedScore.total,
      replacements_applied: preview.replacementsApplied,
      issues_resolved: preview.issuesResolved,
      generated_at: new Date().toISOString(),
    } as unknown as Tables<"meal_plans">["generation_metadata"],
  };

  const { data: newPlan, error: newPlanErr } = await supabase
    .from("meal_plans")
    .insert(newPlanInsert)
    .select("id")
    .single();

  if (newPlanErr || !newPlan) {
    console.error("[SimplificationEngine] Failed to create draft:", newPlanErr);
    return {
      success: false,
      originalScore: preview.originalScore,
      simplifiedScore: preview.projectedScore,
      replacements: [],
      issues: preview.originalScore.issues,
      warnings: ["Falha ao criar draft simplificado"],
    };
  }

  // 5. Insert simplified items
  const replacements: SimplificationResult["replacements"] = [];
  const newItems: TablesInsert<"meal_plan_items">[] = preview.simplifiedItems.map(si => {
    if (si._modified) {
      replacements.push({
        itemId: si.id,
        originalTitle: items.find(i => i.id === si.id)?.title || "",
        originalDescription: items.find(i => i.id === si.id)?.description || null,
        newTitle: si.title,
        newDescription: si.description,
      });
    }

    return {
      meal_plan_id: newPlan.id,
      title: si.title,
      description: si.description,
      meal_type: si.meal_type,
      day_of_week: si.day_of_week,
      calories_target: si.calories_target,
      protein_target: si.protein_target,
      carbs_target: si.carbs_target,
      fat_target: si.fat_target,
      tenant_id: tenantId,
    };
  });

  const { error: insertErr } = await supabase
    .from("meal_plan_items")
    .insert(newItems);

  if (insertErr) {
    console.error("[SimplificationEngine] Failed to insert items:", insertErr);
    warnings.push("Itens inseridos parcialmente");
  }

  // 6. Record audit entries
  const auditEntries = preview.originalScore.issues.map(issue => ({
    tenant_id: tenantId,
    meal_plan_id: planId,
    meal_plan_item_id: issue.itemId || null,
    issue_type: issue.issueType,
    severity: issue.severity,
    message: issue.message,
    suggested_fix: issue.suggestedFix,
    simplicity_score_before: preview.originalScore.total,
    simplicity_score_after: preview.projectedScore.total,
  }));

  if (auditEntries.length > 0) {
    await supabase
      .from("meal_plan_simplification_audit")
      .insert(auditEntries as any[]);
  }

  // 7. Register timeline event
  await supabase.from("patient_timeline").insert({
    patient_id: patientId,
    event_type: "plan_simplified",
    title: "Plano alimentar simplificado",
    description: `Score: ${preview.originalScore.total} → ${preview.projectedScore.total}. ${replacements.length} substituições aplicadas.`,
    metadata: {
      original_plan_id: planId,
      new_plan_id: newPlan.id,
      score_before: preview.originalScore.total,
      score_after: preview.projectedScore.total,
      replacements_count: replacements.length,
    } as any,
    tenant_id: tenantId,
  });

  return {
    success: true,
    originalScore: preview.originalScore,
    simplifiedScore: preview.projectedScore,
    newPlanId: newPlan.id,
    replacements,
    issues: preview.originalScore.issues,
    warnings,
  };
}

// ── Empty score helper ───────────────────────────────────────

function emptyScore(): SimplicityScore {
  return {
    total: 0,
    label: "N/A",
    color: "text-muted-foreground",
    issues: [],
    blockedFoodsFound: [],
    problematicMeals: 0,
    totalMeals: 0,
  };
}
