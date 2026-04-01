/**
 * Motor de Correção Automática Inteligente — FitJourney AutoFix Engine v1.0
 * 
 * Pipeline completo:
 * 1. Carregar contexto (plano, itens, objetivo do paciente)
 * 2. Remover alimentos bloqueados
 * 3. Simplificar cafés da manhã
 * 4. Simplificar lanches
 * 5. Padronizar refeições principais
 * 6. Reduzir complexidade
 * 7. Rebalancear macros
 * 8. Criar nova versão draft
 * 9. Registrar timeline
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
import { loadPersonalizationContext, personalizePlanItems, type PersonalizationChange } from "./planPersonalizationEngine";
import { isItemProtected } from "./planPipelineOrchestrator";
import { isExplicitlyBanned } from "./validatedFoodDatabase";

type MealPlanItem = Tables<"meal_plan_items">;

// ── Types ────────────────────────────────────────────────────

export type AutoFixChangeType =
  | "blocked_food_removed"
  | "meal_simplified"
  | "fruit_reduction"
  | "breakfast_fixed"
  | "snack_fixed"
  | "main_meal_standardized"
  | "macro_rebalanced"
  | "complexity_reduced"
  | "personalization_applied";

export interface AutoFixChange {
  type: AutoFixChangeType;
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
  summary: {
    blocked_removed: number;
    meals_simplified: number;
    snacks_fixed: number;
    breakfasts_fixed: number;
    main_meals_standardized: number;
    macro_rebalanced: boolean;
  };
}

export type AutoFixStep =
  | "loading_context"
  | "personalizing"
  | "removing_blocked"
  | "simplifying_breakfast"
  | "simplifying_snacks"
  | "standardizing_meals"
  | "reducing_complexity"
  | "rebalancing_macros"
  | "creating_draft"
  | "revalidating"
  | "done";

export const AUTOFIX_STEP_LABELS: Record<AutoFixStep, string> = {
  loading_context: "Carregando contexto do plano...",
  personalizing: "Aplicando personalização do paciente...",
  removing_blocked: "Removendo alimentos bloqueados...",
  simplifying_breakfast: "Simplificando cafés da manhã...",
  simplifying_snacks: "Simplificando lanches...",
  standardizing_meals: "Padronizando refeições principais...",
  reducing_complexity: "Reduzindo complexidade...",
  rebalancing_macros: "Recalculando macros...",
  creating_draft: "Criando versão corrigida...",
  revalidating: "Revalidando plano...",
  done: "Concluído!",
};

// ── Helpers ──────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function sumMacro(items: MealPlanItem[], key: "calories_target" | "protein_target" | "carbs_target" | "fat_target"): number {
  return items.reduce((s, i) => s + (i[key] || 0), 0);
}

function isMealType(mealType: string, ...types: string[]): boolean {
  const n = normalize(mealType);
  return types.some(t => n.includes(t));
}

function isBreakfast(mealType: string): boolean {
  return isMealType(mealType, "breakfast", "cafe");
}

function isSnack(mealType: string): boolean {
  return isMealType(mealType, "snack", "lanche", "ceia");
}

function isMainMeal(mealType: string): boolean {
  return isMealType(mealType, "lunch", "dinner", "almoco", "jantar");
}

// ── Fix: Replace blocked foods ──────────────────────────────

function replaceBlockedFoods(text: string): { result: string; changes: Array<{ from: string; to: string }> } {
  let result = text;
  const changes: Array<{ from: string; to: string }> = [];

  // Check explicitly banned foods first
  for (const banned of BLOCKED_FOODS) {
    const regex = new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result)) {
      const replacement = BRAZILIAN_REPLACEMENTS[normalize(banned)];
      if (replacement && replacement.replacement !== "remover" && !isExplicitlyBanned(replacement.replacement)) {
        result = result.replace(regex, replacement.replacement);
        changes.push({ from: banned, to: replacement.replacement });
      } else {
        result = result.replace(regex, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
        changes.push({ from: banned, to: "(removido)" });
      }
    }
  }

  // Then apply BRAZILIAN_REPLACEMENTS for other terms
  for (const [key, value] of Object.entries(BRAZILIAN_REPLACEMENTS)) {
    if (isExplicitlyBanned(value.replacement)) continue; // Don't replace WITH banned food
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(result) && !changes.some(c => normalize(c.from) === normalize(key))) {
      result = result.replace(regex, value.replacement);
      changes.push({ from: key, to: value.replacement });
    }
  }

  return { result: result || text, changes };
}

// ── Fix: Single item (blocked foods) ────────────────────────

function fixItemBlockedFoods(item: MealPlanItem): { fixed: MealPlanItem; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let title = item.title;
  let description = item.description || "";

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

  return { fixed: { ...item, title, description }, changes };
}

// ── Fix: Breakfast simplification ───────────────────────────

function fixBreakfastComplexity(
  items: MealPlanItem[],
  dayOfWeek: number,
  mealType: string,
  isGainGoal: boolean
): { items: MealPlanItem[]; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let result = [...items];
  const maxItems = isGainGoal ? 4 : 3;

  if (result.length > maxItems) {
    const removed = result.splice(maxItems);
    changes.push({
      type: "breakfast_fixed",
      mealType,
      dayOfWeek,
      from: `${result.length + removed.length} itens`,
      to: `${result.length} itens (máx ${maxItems})`,
      detail: `Removidos: ${removed.map(r => r.title).join(", ")}`,
    });
  }

  // Check excess protein at breakfast for weight loss
  if (!isGainGoal) {
    const totalProtein = result.reduce((sum, i) => sum + (i.protein_target || 0), 0);
    if (totalProtein > 30) {
      // Scale down protein items
      const factor = 30 / totalProtein;
      for (const item of result) {
        if (item.protein_target && item.protein_target > 10) {
          const oldP = item.protein_target;
          item.protein_target = Math.round(item.protein_target * factor);
          item.calories_target = Math.round((item.calories_target || 0) * 0.9);
          changes.push({
            type: "breakfast_fixed",
            mealType,
            dayOfWeek,
            from: `${oldP}g proteína`,
            to: `${item.protein_target}g proteína`,
            detail: "Proteína reduzida no café da manhã para emagrecimento",
          });
        }
      }
    }
  }

  return { items: result, changes };
}

// ── Fix: Snack simplification ───────────────────────────────

function fixSnackComplexity(
  items: MealPlanItem[],
  dayOfWeek: number,
  mealType: string,
  isGainGoal: boolean
): { items: MealPlanItem[]; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let result = [...items];
  const maxItems = isGainGoal ? 3 : 2;

  if (result.length > maxItems) {
    const removed = result.splice(maxItems);
    changes.push({
      type: "snack_fixed",
      mealType,
      dayOfWeek,
      from: `${result.length + removed.length} itens`,
      to: `${result.length} itens (máx ${maxItems})`,
      detail: `Removidos: ${removed.map(r => r.title).join(", ")}`,
    });
  }

  return { items: result, changes };
}

// ── Fix: Main meal standardization ──────────────────────────

const BRAZILIAN_PROTEINS = [
  "frango", "peito de frango", "coxa", "sobrecoxa",
  "carne", "bife", "patinho", "alcatra", "acém", "carne moída",
  "tilápia", "sardinha", "merluza", "peixe",
  "porco", "lombo", "bisteca",
  "ovo", "ovos", "omelete",
  "linguiça",
];

const BRAZILIAN_CARBS = [
  "arroz", "macarrão", "espaguete",
  "batata", "purê", "batata doce",
  "macaxeira", "aipim", "mandioca",
  "cuscuz", "tapioca",
  "feijão", "lentilha",
  "inhame", "cará",
  "farofa",
];

function fixMainMealStandardization(
  items: MealPlanItem[],
  dayOfWeek: number,
  mealType: string
): { items: MealPlanItem[]; changes: AutoFixChange[] } {
  const changes: AutoFixChange[] = [];
  let result = [...items];

  // Check if has Brazilian protein
  const allText = result.map(i => normalize(`${i.title} ${i.description || ""}`)).join(" ");
  const hasProtein = BRAZILIAN_PROTEINS.some(p => allText.includes(normalize(p)));
  const hasCarb = BRAZILIAN_CARBS.some(c => allText.includes(normalize(c)));

  if (!hasProtein || !hasCarb) {
    changes.push({
      type: "main_meal_standardized",
      mealType,
      dayOfWeek,
      from: hasProtein ? "sem carboidrato brasileiro" : "sem proteína brasileira",
      to: hasProtein ? "adicionar arroz/batata/macarrão" : "adicionar frango/carne/peixe",
      detail: "Refeição principal deve ter base brasileira (proteína + carbo)",
    });
  }

  // Reduce excess items
  if (result.length > 5) {
    const removed = result.splice(5);
    changes.push({
      type: "complexity_reduced",
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
  tenantId: string,
  onStep?: (step: AutoFixStep) => void
): Promise<AutoFixResult> {
  const warnings: string[] = [];

  // ─── STEP 1: Load context ───────────────────────────────
  onStep?.("loading_context");

  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planErr || !plan) {
    return emptyResult("Plano não encontrado");
  }

  if (["approved", "published", "published_to_patient"].includes(plan.plan_status)) {
    warnings.push("Plano imutável — nova versão será criada como draft");
  }

  const { data: items, error: itemsErr } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("meal_plan_id", planId)
    .order("day_of_week")
    .order("meal_type");

  if (itemsErr || !items || items.length === 0) {
    return emptyResult("Itens do plano não encontrados");
  }

  // Load patient goal for goal-aware fixes
  let patientGoal = "emagrecimento";
  try {
    const { data: anamnesis } = await supabase
      .from("patient_anamnesis")
      .select("answers")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anamnesis?.answers && typeof anamnesis.answers === "object") {
      const ans = anamnesis.answers as Record<string, any>;
      const goal = ans.primary_goal || ans.objetivo || ans.goal;
      if (goal && typeof goal === "string") patientGoal = goal;
    }
  } catch { /* fallback to default */ }

  const isGainGoal = ["gain_weight", "muscle_gain", "ganho_de_massa", "hipertrofia", "performance"].includes(
    normalize(patientGoal)
  );

  // ─── STEP 2: Calculate BEFORE scores ────────────────────
  const beforeAudit = toAuditItems(items);
  const beforeScore = calculatePlanSimplicityScore(beforeAudit);
  const beforeCal = sumMacro(items, "calories_target");
  const beforeProt = sumMacro(items, "protein_target");
  const beforeCarbs = sumMacro(items, "carbs_target");
  const beforeFat = sumMacro(items, "fat_target");

  // ─── STEP 2.5: Personalize for patient (restrictions, TMB, rejected foods) ──
  onStep?.("personalizing");
  const allChanges: AutoFixChange[] = [];

  const personalizationCtx = await loadPersonalizationContext(patientId);
  let workingItems: MealPlanItem[] = [...items];

  if (personalizationCtx) {
    // Skip calorie scaling here — AutoFix does its own macro rebalancing in Step 7
    const personalized = personalizePlanItems(workingItems, personalizationCtx, { skipCalorieScaling: true });
    workingItems = personalized.items as MealPlanItem[];
    warnings.push(...personalized.warnings);

    // Convert personalization changes to AutoFix changes
    for (const pc of personalized.changes) {
      allChanges.push({
        type: "personalization_applied",
        mealType: pc.mealType || "all",
        dayOfWeek: pc.dayOfWeek ?? -1,
        from: pc.detail,
        to: pc.detail,
        detail: pc.detail,
      });
    }

    // Update patient goal from personalization context
    patientGoal = personalizationCtx.goal || patientGoal;
  }

  // ─── STEP 3: Remove blocked foods (skip protected items) ──
  onStep?.("removing_blocked");
  let fixedItems: MealPlanItem[] = workingItems.map(item => {
    if (isItemProtected(item)) return item;
    const { fixed, changes } = fixItemBlockedFoods(item);
    allChanges.push(...changes);
    return fixed;
  });

  // ─── STEP 4-6: Fix by meal type ────────────────────────
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

    if (isBreakfast(mealType)) {
      onStep?.("simplifying_breakfast");
      const { items: fixed, changes } = fixBreakfastComplexity(groupItems, day, mealType, isGainGoal);
      allChanges.push(...changes);
      finalItems.push(...fixed);
    } else if (isSnack(mealType)) {
      onStep?.("simplifying_snacks");
      const { items: fixed, changes } = fixSnackComplexity(groupItems, day, mealType, isGainGoal);
      allChanges.push(...changes);
      finalItems.push(...fixed);
    } else if (isMainMeal(mealType)) {
      onStep?.("standardizing_meals");
      const { items: fixed, changes } = fixMainMealStandardization(groupItems, day, mealType);
      allChanges.push(...changes);
      finalItems.push(...fixed);
    } else {
      // Other meal types: just reduce complexity
      onStep?.("reducing_complexity");
      if (groupItems.length > 5) {
        const kept = groupItems.slice(0, 5);
        const removed = groupItems.slice(5);
        allChanges.push({
          type: "complexity_reduced",
          mealType,
          dayOfWeek: day,
          from: `${groupItems.length} itens`,
          to: `${kept.length} itens`,
          detail: `Removidos: ${removed.map(r => r.title).join(", ")}`,
        });
        finalItems.push(...kept);
      } else {
        finalItems.push(...groupItems);
      }
    }
  }

  // ─── STEP 7: Rebalance macros against PATIENT CLINICAL TARGETS ──
  onStep?.("rebalancing_macros");
  let macroRebalanced = false;

  // Load patient clinical targets (same source as the validator)
  const TOLERANCE = { calories: 0.05, protein: 0.05, carbs: 0.10, fat: 0.10 };
  let targetCals = 0, targetProt = 0, targetCarbs = 0, targetFat = 0;
  let targetSource = "none";

  try {
    const { data: assessment } = await supabase
      .from("physical_assessments")
      .select("calories_target, protein_target, carbs_target, fat_target")
      .eq("patient_id", patientId)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessment?.calories_target) {
      targetCals = assessment.calories_target;
      targetProt = assessment.protein_target || 0;
      targetCarbs = assessment.carbs_target || 0;
      targetFat = assessment.fat_target || 0;
      targetSource = "physical_assessment";
    } else {
      const { data: anamnesis } = await supabase
        .from("patient_anamnesis")
        .select("computed_kcal_target, computed_protein, computed_carbs, computed_fat")
        .eq("user_id", patientId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anamnesis?.computed_kcal_target) {
        targetCals = anamnesis.computed_kcal_target;
        targetProt = anamnesis.computed_protein || 0;
        targetCarbs = anamnesis.computed_carbs || 0;
        targetFat = anamnesis.computed_fat || 0;
        targetSource = "anamnesis";
      }
    }
  } catch { /* fallback: no targets available */ }

  // Calculate current daily averages (same as validator)
  const days = new Set(finalItems.map(i => i.day_of_week ?? 0));
  const numDays = days.size || 1;
  const dailyCals = sumMacro(finalItems, "calories_target") / numDays;
  const dailyProt = sumMacro(finalItems, "protein_target") / numDays;
  const dailyCarbs = sumMacro(finalItems, "carbs_target") / numDays;
  const dailyFat = sumMacro(finalItems, "fat_target") / numDays;

  if (targetCals > 0) {
    // Check each macro against clinical target and scale if outside tolerance
    const macroChecks = [
      { key: "calories_target" as const, daily: dailyCals, target: targetCals, tol: TOLERANCE.calories, label: "Calorias" },
      { key: "protein_target" as const, daily: dailyProt, target: targetProt, tol: TOLERANCE.protein, label: "Proteína" },
      { key: "carbs_target" as const, daily: dailyCarbs, target: targetCarbs, tol: TOLERANCE.carbs, label: "Carboidrato" },
      { key: "fat_target" as const, daily: dailyFat, target: targetFat, tol: TOLERANCE.fat, label: "Gordura" },
    ];

    for (const mc of macroChecks) {
      if (!mc.target || mc.target === 0) continue;
      const diffPct = (mc.daily - mc.target) / mc.target;
      if (Math.abs(diffPct) > mc.tol) {
        // Scale this macro across all items to hit the target
        const totalMacro = sumMacro(finalItems, mc.key);
        const desiredTotal = mc.target * numDays;
        if (totalMacro > 0) {
          const factor = desiredTotal / totalMacro;
          for (const item of finalItems) {
            if (item[mc.key]) {
              const oldValue = item[mc.key]!;
              const newValue = Math.round(oldValue * factor);
              item[mc.key] = newValue;

              // REGRA C: Macro correction is tracked in change log, NOT in description
              // Annotations in descriptions break the validator's text matching
            }
          }
          macroRebalanced = true;
          allChanges.push({
            type: "macro_rebalanced",
            mealType: "all",
            dayOfWeek: -1,
            from: `${mc.label}: ${Math.round(mc.daily)}/${mc.target} (${diffPct > 0 ? "+" : ""}${Math.round(diffPct * 100)}%)`,
            to: `${mc.label}: ${mc.target}/${mc.target} (0%)`,
            detail: `Rebalanceado contra meta clínica do paciente (fonte: ${targetSource}). Fator real: ×${(desiredTotal / totalMacro).toFixed(2)} aplicado a ${finalItems.filter(i => i[mc.key]).length} itens.`,
          });
        }
      }
    }
  } else {
    // Fallback: no clinical target — preserve original plan totals
    const afterCal = sumMacro(finalItems, "calories_target");
    if (beforeCal > 0 && Math.abs(afterCal - beforeCal) / beforeCal > 0.10) {
      const factor = beforeCal / (afterCal || 1);
      for (const item of finalItems) {
        if (item.calories_target) item.calories_target = Math.round(item.calories_target * factor);
        if (item.protein_target) item.protein_target = Math.round(item.protein_target * factor);
        if (item.carbs_target) item.carbs_target = Math.round(item.carbs_target * factor);
        if (item.fat_target) item.fat_target = Math.round(item.fat_target * factor);
        // Track in change log only, not in description
      }
      macroRebalanced = true;
      allChanges.push({
        type: "macro_rebalanced",
        mealType: "all",
        dayOfWeek: -1,
        from: `${afterCal} kcal`,
        to: `${sumMacro(finalItems, "calories_target")} kcal`,
        detail: `Fator de correção proporcional ×${factor.toFixed(2)} (sem meta clínica disponível)`,
      });
    }
    warnings.push("Sem meta clínica do paciente — rebalanceamento proporcional ao plano original");
  }

  // ─── STEP 8: Calculate AFTER scores ────────────────────
  const afterAudit = toAuditItems(finalItems);
  const afterScore = calculatePlanSimplicityScore(afterAudit);

  // ─── STEP 9: Create new draft plan ─────────────────────
  onStep?.("creating_draft");

  const changeSummary = {
    blocked_removed: allChanges.filter(c => c.type === "blocked_food_removed").length,
    meals_simplified: allChanges.filter(c => c.type === "meal_simplified" || c.type === "complexity_reduced").length,
    snacks_fixed: allChanges.filter(c => c.type === "snack_fixed").length,
    breakfasts_fixed: allChanges.filter(c => c.type === "breakfast_fixed").length,
    main_meals_standardized: allChanges.filter(c => c.type === "main_meal_standardized").length,
    macro_rebalanced: macroRebalanced,
  };

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
      engine: "auto_fix_engine_v1",
      original_plan_id: planId,
      original_score: beforeScore.total,
      fixed_score: afterScore.total,
      changes_count: allChanges.length,
      patient_goal: patientGoal,
      is_gain_goal: isGainGoal,
      changes_summary: changeSummary,
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

  // Insert fixed items
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
    item_origin: (fi as any).is_manually_edited ? "manual" : "auto_corrected",
    is_manually_edited: (fi as any).is_manually_edited || false,
    is_locked: (fi as any).is_locked || false,
    was_auto_corrected: !isItemProtected(fi),
  }));

  const { error: insertErr } = await supabase
    .from("meal_plan_items")
    .insert(newItems);

  if (insertErr) {
    console.error("[AutoFix] Failed to insert items:", insertErr);
    warnings.push("Alguns itens podem não ter sido salvos");
  }

  // Record timeline
  await supabase.from("patient_timeline").insert({
    patient_id: patientId,
    event_type: "plan_auto_fixed",
    title: "Plano alimentar corrigido automaticamente",
    description: `Score: ${beforeScore.total} → ${afterScore.total}. ${allChanges.length} correções. Objetivo: ${patientGoal}.`,
    metadata: {
      original_plan_id: planId,
      new_plan_id: newPlan.id,
      score_before: beforeScore.total,
      score_after: afterScore.total,
      changes_count: allChanges.length,
      patient_goal: patientGoal,
    } as any,
    tenant_id: tenantId,
  });

  onStep?.("done");

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
    summary: changeSummary,
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
  const empty: SimplicityScore = {
    total: 0, label: "N/A", color: "text-muted-foreground",
    issues: [], blockedFoodsFound: [], problematicMeals: 0, totalMeals: 0,
  };
  return {
    success: false,
    changes: [],
    before: { score: empty, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
    after: { score: empty, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
    warnings: [warning],
    summary: {
      blocked_removed: 0,
      meals_simplified: 0,
      snacks_fixed: 0,
      breakfasts_fixed: 0,
      main_meals_standardized: 0,
      macro_rebalanced: false,
    },
  };
}
