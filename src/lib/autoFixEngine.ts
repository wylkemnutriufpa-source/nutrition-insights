/**
 * Motor de Correção Automática Inteligente — FitJourney Autopilot Clínico v1.0
 * 
 * Analisa, corrige e gera nova versão do plano em 1 clique.
 * Preserva objetivo clínico e macros dentro de ±10-15%.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  calculatePlanSimplicityScore,
  BRAZILIAN_REPLACEMENTS,
  type MealItemForAudit,
  type SimplicityScore,
} from "./planSimplicityEngine";
import { BLOCKED_FOODS } from "./mealPlanFoodRules";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Types ────────────────────────────────────────────────────

export interface AutoFixChange {
  type: "blocked_food_removed" | "meal_simplified" | "fruit_reduction" | "breakfast_fixed" | "snack_fixed" | "macro_rebalanced";
  mealType: string;
  dayOfWeek: number;
  from: string;
  to: string;
  detail?: string;
}

export interface AutoFixResult {
  success: boolean;
  newPlanId?: string;
  changes: AutoFixChange[];
  before: {
    score: SimplicityScore;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  after: {
    score: SimplicityScore;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  warnings: string[];
}

// ── Helpers ──────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function sumMacro(items: MealPlanItem[], key: "calories_target" | "protein_target" | "carbs_target" | "fat_target"): number {
  return items.reduce((s, i) => s + (i[key] || 0), 0);
}

// ── Core: Apply text replacements ────────────────────────────

function replaceBlockedFoods(text: string): { result: string; changes: Array<{ from: string; to: string }> } {
  let result = text;
  const changes: Array<{ from: string; to: string }> = [];

  for (const [key, value] of Object.entries(BRAZILIAN_REPLACEMENTS)) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result)) {
      result = result.replace(regex, value.replacement);
      changes.push({ from: key, to: value.replacement });
    }
  }

  // Blocked foods without explicit replacement → remove
  for (const blocked of BLOCKED_FOODS) {
    const regex = new RegExp(blocked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result) && !changes.some(c => normalize(c.from) === normalize(blocked))) {
      result = result.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
      changes.push({ from: blocked, to: "(removido)" });
    }
  }

  return { result: result || text, changes };
}

// ── Core: Fix a single item ─────────────────────────────────

function fixItem(item: MealPlanItem): { fixed: MealPlanItem; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let title = item.title;
  let description = item.description || "";

  // 1. Replace blocked foods in title
  const titleFix = replaceBlockedFoods(title);
  for (const c of titleFix.changes) {
    changes.push({
      type: "blocked_food_removed",
      mealType: item.meal_type,
      dayOfWeek: item.day_of_week ?? 0,
      from: c.from,
      to: c.to,
    });
  }
  title = titleFix.result;

  // 2. Replace blocked foods in description
  const descFix = replaceBlockedFoods(description);
  for (const c of descFix.changes) {
    if (!changes.some(ch => ch.from === c.from && ch.dayOfWeek === (item.day_of_week ?? 0))) {
      changes.push({
        type: "blocked_food_removed",
        mealType: item.meal_type,
        dayOfWeek: item.day_of_week ?? 0,
        from: c.from,
        to: c.to,
      });
    }
  }
  description = descFix.result;

  return {
    fixed: { ...item, title, description },
    changes,
  };
}

// ── Core: Fix meal group complexity ──────────────────────────

function fixMealGroupComplexity(
  items: MealPlanItem[],
  mealType: string,
  dayOfWeek: number
): { items: MealPlanItem[]; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let result = [...items];

  const isBreakfast = mealType.includes("breakfast") || mealType.includes("cafe");
  const isSnack = mealType.includes("snack") || mealType.includes("lanche") || mealType.includes("ceia");

  // Reduce excess items
  const maxItems = isBreakfast ? 3 : isSnack ? 2 : 5;
  if (result.length > maxItems) {
    const removed = result.splice(maxItems);
    changes.push({
      type: "meal_simplified",
      mealType,
      dayOfWeek,
      from: `${result.length + removed.length} itens`,
      to: `${result.length} itens`,
      detail: `Removidos: ${removed.map(r => r.title).join(", ")}`,
    });
  }

  return { items: result, changes };
}

// ── Main: Auto-fix meal plan ─────────────────────────────────

export async function autoFixMealPlan(
  planId: string,
  patientId: string,
  nutritionistId: string,
  tenantId: string
): Promise<AutoFixResult> {
  const warnings: string[] = [];

  // 1. Load plan
  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planErr || !plan) {
    return emptyResult("Plano não encontrado");
  }

  // Block fixing immutable plans (create new version instead)
  if (["approved", "published", "published_to_patient"].includes(plan.plan_status)) {
    warnings.push("Plano imutável — nova versão será criada como draft");
  }

  // 2. Load items
  const { data: items, error: itemsErr } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("meal_plan_id", planId)
    .order("day_of_week")
    .order("meal_type");

  if (itemsErr || !items || items.length === 0) {
    return emptyResult("Itens do plano não encontrados");
  }

  // 3. Calculate BEFORE scores
  const beforeAudit = toAuditItems(items);
  const beforeScore = calculatePlanSimplicityScore(beforeAudit);
  const beforeCal = sumMacro(items, "calories_target");
  const beforeProt = sumMacro(items, "protein_target");
  const beforeCarbs = sumMacro(items, "carbs_target");
  const beforeFat = sumMacro(items, "fat_target");

  // 4. Apply fixes to each item
  const allChanges: AutoFixChange[] = [];
  let fixedItems: MealPlanItem[] = items.map(item => {
    const { fixed, changes } = fixItem(item);
    allChanges.push(...changes);
    return fixed;
  });

  // 5. Fix meal group complexity
  const mealGroups = new Map<string, MealPlanItem[]>();
  for (const item of fixedItems) {
    const key = `${item.day_of_week ?? 0}_${item.meal_type}`;
    if (!mealGroups.has(key)) mealGroups.set(key, []);
    mealGroups.get(key)!.push(item);
  }

  const finalItems: MealPlanItem[] = [];
  for (const [key, groupItems] of mealGroups.entries()) {
    const [dayStr, ...mealParts] = key.split("_");
    const mealType = mealParts.join("_");
    const day = parseInt(dayStr);
    const { items: fixedGroup, changes } = fixMealGroupComplexity(groupItems, mealType, day);
    allChanges.push(...changes);
    finalItems.push(...fixedGroup);
  }

  // 6. Rebalance macros if drift > 15%
  const afterCal = sumMacro(finalItems, "calories_target");
  if (beforeCal > 0 && Math.abs(afterCal - beforeCal) / beforeCal > 0.15) {
    const factor = beforeCal / (afterCal || 1);
    for (const item of finalItems) {
      if (item.calories_target) item.calories_target = Math.round(item.calories_target * factor);
      if (item.protein_target) item.protein_target = Math.round(item.protein_target * factor);
      if (item.carbs_target) item.carbs_target = Math.round(item.carbs_target * factor);
      if (item.fat_target) item.fat_target = Math.round(item.fat_target * factor);
    }
    allChanges.push({
      type: "macro_rebalanced",
      mealType: "all",
      dayOfWeek: -1,
      from: `${afterCal} kcal`,
      to: `${sumMacro(finalItems, "calories_target")} kcal`,
      detail: `Fator de correção: ${factor.toFixed(2)}`,
    });
  }

  // 7. Calculate AFTER scores
  const afterAudit = toAuditItems(finalItems);
  const afterScore = calculatePlanSimplicityScore(afterAudit);

  // 8. Create new draft plan
  const newPlanInsert: TablesInsert<"meal_plans"> = {
    title: `${plan.title} (Corrigido)`,
    description: `Versão corrigida automaticamente a partir do plano "${plan.title}"`,
    patient_id: patientId,
    nutritionist_id: nutritionistId,
    tenant_id: tenantId,
    start_date: plan.start_date,
    end_date: plan.end_date,
    plan_status: "draft_auto_corrected",
    is_active: false,
    generation_source: "auto_fix_engine_v1",
    previous_plan_id: planId,
    total_target_calories: plan.total_target_calories,
    total_target_protein: plan.total_target_protein,
    total_target_carbs: plan.total_target_carbs,
    total_target_fat: plan.total_target_fat,
    editor_version: "v2",
    generation_metadata: {
      engine: "auto_fix_v1",
      original_plan_id: planId,
      original_score: beforeScore.total,
      fixed_score: afterScore.total,
      changes_count: allChanges.length,
      generated_at: new Date().toISOString(),
    } as unknown as Tables<"meal_plans">["generation_metadata"],
  };

  const { data: newPlan, error: newPlanErr } = await supabase
    .from("meal_plans")
    .insert(newPlanInsert)
    .select("id")
    .single();

  if (newPlanErr || !newPlan) {
    console.error("[AutoFix] Failed to create draft:", newPlanErr);
    return emptyResult("Falha ao criar plano corrigido");
  }

  // 9. Insert fixed items
  const newItems: TablesInsert<"meal_plan_items">[] = finalItems.map(fi => ({
    meal_plan_id: newPlan.id,
    title: fi.title,
    description: fi.description,
    meal_type: fi.meal_type,
    day_of_week: fi.day_of_week,
    calories_target: fi.calories_target,
    protein_target: fi.protein_target,
    carbs_target: fi.carbs_target,
    fat_target: fi.fat_target,
    tenant_id: tenantId,
  }));

  const { error: insertErr } = await supabase
    .from("meal_plan_items")
    .insert(newItems);

  if (insertErr) {
    console.error("[AutoFix] Failed to insert items:", insertErr);
    warnings.push("Alguns itens podem não ter sido salvos");
  }

  // 10. Record timeline
  await supabase.from("patient_timeline").insert({
    patient_id: patientId,
    event_type: "plan_auto_fixed",
    title: "Plano alimentar corrigido automaticamente",
    description: `Score: ${beforeScore.total} → ${afterScore.total}. ${allChanges.length} correções aplicadas.`,
    metadata: {
      original_plan_id: planId,
      new_plan_id: newPlan.id,
      score_before: beforeScore.total,
      score_after: afterScore.total,
      changes_count: allChanges.length,
    } as any,
    tenant_id: tenantId,
  });

  return {
    success: true,
    newPlanId: newPlan.id,
    changes: allChanges,
    before: {
      score: beforeScore,
      totalCalories: beforeCal,
      totalProtein: beforeProt,
      totalCarbs: beforeCarbs,
      totalFat: beforeFat,
    },
    after: {
      score: afterScore,
      totalCalories: sumMacro(finalItems, "calories_target"),
      totalProtein: sumMacro(finalItems, "protein_target"),
      totalCarbs: sumMacro(finalItems, "carbs_target"),
      totalFat: sumMacro(finalItems, "fat_target"),
    },
    warnings,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function toAuditItems(items: MealPlanItem[]): MealItemForAudit[] {
  return items.map(i => ({
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
}

function emptyResult(warning: string): AutoFixResult {
  const empty = {
    total: 0, label: "N/A", color: "text-muted-foreground",
    issues: [], blockedFoodsFound: [], problematicMeals: 0, totalMeals: 0,
  };
  return {
    success: false,
    changes: [],
    before: { score: empty, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
    after: { score: empty, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
    warnings: [warning],
  };
}
