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
import { compareMealPlanCollections, haveMealPlanCollectionsChanged } from "./mealPlanPersistenceGuards";

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
  /** When true, fix was applied in-place on the same plan (no new draft created) */
  inPlace?: boolean;
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

function roundScaledQuantity(value: number, unit: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalizedUnit = normalize(unit);

  if (normalizedUnit === "g" || normalizedUnit === "ml") {
    return value >= 20 ? Math.max(5, Math.round(value / 5) * 5) : Math.max(1, Math.round(value));
  }

  return value >= 10 ? Math.max(1, Math.round(value)) : Math.max(0.5, Math.round(value * 2) / 2);
}

function scaleDescriptionQuantities(description: string | null | undefined, factor: number): string | null | undefined {
  if (!description || !Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 0.08) return description;

  const scaleToken = (rawValue: string, unit: string, spacer = "") => {
    const parsed = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return `${rawValue}${spacer}${unit}`;
    const scaled = roundScaledQuantity(parsed * factor, unit);
    const formatted = Number.isInteger(scaled) ? String(Math.trunc(scaled)) : scaled.toFixed(1).replace(".0", "").replace(".", ",");
    return `${formatted}${spacer}${unit}`;
  };

  return description
    .replace(/(\d+(?:[.,]\d+)?)\s*(g|ml)\b/gi, (_, value: string, unit: string) => scaleToken(value, unit))
    .replace(/(\d+(?:[.,]\d+)?)\s*(col\.?\s*(?:sopa|cha|chá))\b/gi, (_, value: string, unit: string) => scaleToken(value, unit, " "));
}

const BEVERAGE_KEYWORDS = ["cafe", "chá", "cha", "leite", "suco", "vitamina"];
const MAIN_PROTEIN_KEYWORDS = ["frango", "carne", "bife", "alcatra", "patinho", "tilapia", "tilápia", "peixe", "porco", "lombo", "sobrecoxa", "sardinha"];

function hasBeverage(description: string): boolean {
  const text = normalize(description);
  return BEVERAGE_KEYWORDS.some((keyword) => text.includes(normalize(keyword)));
}

function defaultBeverageLine(mealType: string): string | null {
  if (mealType === "breakfast") return "• Café com leite";
  if (mealType === "afternoon_snack") return "• Chá sem açúcar";
  return null;
}

function standardProteinPortion(mealType: string, isGainGoal: boolean): number {
  if (mealType === "lunch") return isGainGoal ? 180 : 150;
  if (mealType === "dinner") return isGainGoal ? 170 : 140;
  return isGainGoal ? 180 : 150;
}

function isProteinLine(line: string): boolean {
  const text = normalize(line);
  return MAIN_PROTEIN_KEYWORDS.some((keyword) => text.includes(normalize(keyword)));
}

function syncMealDescription(description: string | null | undefined, mealType: string, isGainGoal: boolean): string | null | undefined {
  if (!description) return description;

  const [mainSection, substitutionsSection] = description.split(/\n\n🔄 Substituições:\n/);
  const lines = (mainSection || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let proteinNormalized = false;
  const normalizedLines = lines.map((line) => {
    if (!proteinNormalized && isMainMeal(mealType) && isProteinLine(line) && /(\d+(?:[.,]\d+)?)\s*g\b/i.test(line)) {
      proteinNormalized = true;
      return line.replace(/(\d+(?:[.,]\d+)?)\s*g\b/i, `${standardProteinPortion(mealType, isGainGoal)}g`);
    }
    return line;
  });

  const beverage = defaultBeverageLine(mealType);
  if (beverage && !hasBeverage(normalizedLines.join("\n"))) {
    normalizedLines.push(beverage);
  }

  return normalizedLines.join("\n") + (substitutionsSection ? `\n\n🔄 Substituições:\n${substitutionsSection}` : "");
}

function rebalanceProteinTargetsByMeal(dayItems: MealPlanItem[], dailyProteinTarget: number, isGainGoal: boolean): void {
  if (!Number.isFinite(dailyProteinTarget) || dailyProteinTarget <= 0 || dayItems.length === 0) return;

  const proteinShares: Record<string, number> = isGainGoal
    ? { breakfast: 0.16, morning_snack: 0.10, lunch: 0.26, afternoon_snack: 0.10, dinner: 0.24, evening_snack: 0.14 }
    : { breakfast: 0.15, morning_snack: 0.08, lunch: 0.27, afternoon_snack: 0.08, dinner: 0.27, evening_snack: 0.15 };
  const proteinCaps: Record<string, number> = isGainGoal
    ? { breakfast: 45, morning_snack: 24, lunch: 65, afternoon_snack: 24, dinner: 60, evening_snack: 35 }
    : { breakfast: 30, morning_snack: 18, lunch: 55, afternoon_snack: 18, dinner: 55, evening_snack: 30 };
  const mealOrder = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
  const residualPriority = ["lunch", "dinner", "evening_snack", "breakfast", "morning_snack", "afternoon_snack"];

  const mealTargets = new Map<string, number>();
  let assigned = 0;

  for (const mealType of mealOrder) {
    const items = dayItems.filter((item) => item.meal_type === mealType);
    if (items.length === 0) continue;
    const baseTarget = Math.round(dailyProteinTarget * (proteinShares[mealType] || 0));
    const target = Math.min(proteinCaps[mealType] ?? baseTarget, baseTarget);
    mealTargets.set(mealType, target);
    assigned += target;
  }

  let residual = Math.round(dailyProteinTarget - assigned);
  for (const mealType of residualPriority) {
    if (residual <= 0) break;
    if (!mealTargets.has(mealType)) continue;
    const current = mealTargets.get(mealType) || 0;
    const cap = proteinCaps[mealType] ?? current;
    const room = Math.max(0, cap - current);
    if (room <= 0) continue;
    const add = Math.min(room, residual);
    mealTargets.set(mealType, current + add);
    residual -= add;
  }

  if (residual !== 0) {
    const fallbackMeal = residualPriority.find((mealType) => mealTargets.has(mealType)) || mealOrder.find((mealType) => mealTargets.has(mealType));
    if (fallbackMeal) {
      mealTargets.set(fallbackMeal, (mealTargets.get(fallbackMeal) || 0) + residual);
    }
  }

  for (const [mealType, target] of mealTargets.entries()) {
    const items = dayItems.filter((item) => item.meal_type === mealType && !isItemProtected(item));
    if (items.length === 0) continue;
    const currentTotal = items.reduce((sum, item) => sum + (Number(item.protein_target) || 0), 0);

    if (currentTotal <= 0) {
      const base = Math.floor(target / items.length);
      let remaining = target;
      items.forEach((item, index) => {
        const next = index === items.length - 1 ? remaining : base;
        item.protein_target = next;
        remaining -= next;
      });
      continue;
    }

    let scaledSum = 0;
    let largestIndex = 0;
    let largestValue = 0;
    items.forEach((item, index) => {
      const current = Number(item.protein_target) || 0;
      const next = Math.round(current * (target / currentTotal));
      item.protein_target = next;
      scaledSum += next;
      if (current > largestValue) {
        largestValue = current;
        largestIndex = index;
      }
    });

    const correction = target - scaledSum;
    items[largestIndex].protein_target = (Number(items[largestIndex].protein_target) || 0) + correction;
  }
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
  console.info("[AutoFix] Starting", { planId, patientId, nutritionistId, tenantId });

  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planErr || !plan) {
    console.error("[AutoFix] Plan not found", { planId, planErr });
    return emptyResult("Plano não encontrado");
  }

  const isImmutable = ["approved", "published", "published_to_patient"].includes(plan.plan_status);
  console.info("[AutoFix] Plan loaded", { planId, status: plan.plan_status, isImmutable, isActive: plan.is_active });

  if (isImmutable) {
    // Check if a draft_auto_corrected already exists for this plan
    const { data: existingDraft } = await supabase
      .from("meal_plans")
      .select("id, created_at")
      .eq("previous_plan_id", planId)
      .eq("plan_status", "draft_auto_corrected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDraft) {
      console.info("[AutoFix] Existing draft_auto_corrected found, regenerating synchronized draft", { existingDraftId: existingDraft.id });
      warnings.push("Versão corrigida anterior encontrada — gerando uma nova versão com descrições sincronizadas.");
    }

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
  let workingItems: MealPlanItem[] = items.map(item => ({
    ...item,
    _baseCaloriesTarget: Number(item.calories_target) || 0,
  } as MealPlanItem));

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

  // ─── STEP 7.5: Cross-day macro normalization ─────────────
  // Ensure each day has the SAME macro totals (eliminate day-to-day variance)
  // Protein uses tighter tolerance (3%) since even small differences are clinically visible
  onStep?.("rebalancing_macros");
  const CROSS_DAY_TOL_DEFAULT = 0.05; // 5% for calories/carbs/fat
  const CROSS_DAY_TOL_PROTEIN = 0.03; // 3% for protein (clinically sensitive)
  const SKIP_THRESHOLD = 0.01; // 1% — skip day if already within 1%
  const uniqueDays = [...new Set(finalItems.map(i => i.day_of_week ?? 0))];
  
  if (uniqueDays.length >= 2) {
    const macroKeys = ["calories_target", "protein_target", "carbs_target", "fat_target"] as const;
    
    for (const macroKey of macroKeys) {
      const crossDayTol = macroKey === "protein_target" ? CROSS_DAY_TOL_PROTEIN : CROSS_DAY_TOL_DEFAULT;
      
      // Calculate per-day totals
      const dayTotals = new Map<number, number>();
      for (const day of uniqueDays) {
        const dayItems = finalItems.filter(i => (i.day_of_week ?? 0) === day);
        dayTotals.set(day, dayItems.reduce((s, i) => s + (Number(i[macroKey]) || 0), 0));
      }
      
      // Calculate target (use clinical target if available, otherwise average)
      let targetPerDay: number;
      if (macroKey === "calories_target" && targetCals > 0) targetPerDay = targetCals;
      else if (macroKey === "protein_target" && targetProt > 0) targetPerDay = targetProt;
      else if (macroKey === "carbs_target" && targetCarbs > 0) targetPerDay = targetCarbs;
      else if (macroKey === "fat_target" && targetFat > 0) targetPerDay = targetFat;
      else {
        // Use average across days as target
        const vals = [...dayTotals.values()];
        targetPerDay = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      
      if (targetPerDay <= 0) continue;
      
      // Check if any day deviates more than tolerance
      const minVal = Math.min(...dayTotals.values());
      const maxVal = Math.max(...dayTotals.values());
      const variance = (maxVal - minVal) / targetPerDay;
      
      if (variance > crossDayTol) {
        // Scale each day's items to hit targetPerDay using proportional redistribution
        for (const day of uniqueDays) {
          const dayTotal = dayTotals.get(day) || 0;
          if (dayTotal <= 0) continue;
          const diffPct = Math.abs(dayTotal - targetPerDay) / targetPerDay;
          if (diffPct <= SKIP_THRESHOLD) continue; // Already close enough
          
          const factor = targetPerDay / dayTotal;
          const dayItems = finalItems.filter(i => (i.day_of_week ?? 0) === day);
          
          // Distribute rounding residual to the largest item to ensure exact sum
          let scaledSum = 0;
          let largestIdx = -1;
          let largestVal = 0;
          
          for (let idx = 0; idx < dayItems.length; idx++) {
            const item = dayItems[idx];
            if (isItemProtected(item)) continue;
            const oldVal = Number(item[macroKey]) || 0;
            if (oldVal > 0) {
              const newVal = Math.round(oldVal * factor);
              (item as any)[macroKey] = newVal;
              scaledSum += newVal;
              if (oldVal > largestVal) {
                largestVal = oldVal;
                largestIdx = idx;
              }
            }
          }
          
          // Fix rounding residual on the largest item
          const residual = Math.round(targetPerDay) - scaledSum;
          if (residual !== 0 && largestIdx >= 0 && !isItemProtected(dayItems[largestIdx])) {
            (dayItems[largestIdx] as any)[macroKey] = ((dayItems[largestIdx] as any)[macroKey] || 0) + residual;
          }
        }
        
        const macroLabel = macroKey === "calories_target" ? "Calorias" : 
          macroKey === "protein_target" ? "Proteína" :
          macroKey === "carbs_target" ? "Carboidrato" : "Gordura";
        
        macroRebalanced = true;
        allChanges.push({
          type: "macro_rebalanced",
          mealType: "all",
          dayOfWeek: -1,
          from: `${macroLabel}: ${Math.round(minVal)}–${Math.round(maxVal)} (variação ${Math.round(variance * 100)}%)`,
          to: `${macroLabel}: ${Math.round(targetPerDay)} uniforme/dia`,
          detail: `Normalização cross-day: todos os dias ajustados para ${Math.round(targetPerDay)} ${macroKey === "calories_target" ? "kcal" : "g"}/dia`,
        });
      }
    }
  }

  for (const day of uniqueDays) {
    const dayItems = finalItems.filter(i => (i.day_of_week ?? 0) === day);
    const dailyProteinTarget = targetProt > 0 ? targetProt : dayItems.reduce((sum, item) => sum + (Number(item.protein_target) || 0), 0);
    rebalanceProteinTargetsByMeal(dayItems, dailyProteinTarget, isGainGoal);
  }

  for (const item of finalItems as Array<MealPlanItem & { _baseCaloriesTarget?: number }>) {
    const baseCalories = Number(item._baseCaloriesTarget) || Number(item.calories_target) || 0;
    const currentCalories = Number(item.calories_target) || 0;
    if (baseCalories <= 0 || currentCalories <= 0) continue;
    item.description = scaleDescriptionQuantities(item.description, currentCalories / baseCalories) ?? item.description;
    item.description = syncMealDescription(item.description, item.meal_type, isGainGoal) ?? item.description;
  }

  // ─── STEP 8: Calculate AFTER scores ────────────────────
  const afterAudit = toAuditItems(finalItems);
  const afterScore = calculatePlanSimplicityScore(afterAudit);
  const afterCal = sumMacro(finalItems, "calories_target");
  const afterProt = sumMacro(finalItems, "protein_target");
  const afterCarbs = sumMacro(finalItems, "carbs_target");
  const afterFat = sumMacro(finalItems, "fat_target");

  if (!haveMealPlanCollectionsChanged(items, finalItems)) {
    console.info("[AutoFix] No changes detected after processing", { planId, changesCount: allChanges.length });
    return emptyResult("Nenhuma alteração necessária — o plano já está otimizado.");
  }

  console.info("[AutoFix] Changes computed", { planId, changesCount: allChanges.length, isImmutable });

  // ─── STEP 9: Apply fix (in-place or new draft) ─────────
  onStep?.("creating_draft");

  const changeSummary = {
    blocked_removed: allChanges.filter(c => c.type === "blocked_food_removed").length,
    meals_simplified: allChanges.filter(c => c.type === "meal_simplified" || c.type === "complexity_reduced").length,
    snacks_fixed: allChanges.filter(c => c.type === "snack_fixed").length,
    breakfasts_fixed: allChanges.filter(c => c.type === "breakfast_fixed").length,
    main_meals_standardized: allChanges.filter(c => c.type === "main_meal_standardized").length,
    macro_rebalanced: macroRebalanced,
  };

  const genMeta = {
    engine: "auto_fix_engine_v1",
    original_plan_id: planId,
    original_score: beforeScore.total,
    fixed_score: afterScore.total,
    changes_count: allChanges.length,
    patient_goal: patientGoal,
    is_gain_goal: isGainGoal,
    changes_summary: changeSummary,
    generated_at: new Date().toISOString(),
  };

  let resultPlanId = planId;
  let wasInPlace = false;

  if (isImmutable) {
    // Published/approved plan → create new draft (preserve original)
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
      total_target_calories: afterCal,
      total_target_protein: afterProt,
      total_target_carbs: afterCarbs,
      total_target_fat: afterFat,
      editor_version: "v2",
      generation_metadata: genMeta as unknown as Tables<"meal_plans">["generation_metadata"],
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

    resultPlanId = newPlan.id;

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

    const { error: insertErr } = await supabase.from("meal_plan_items").insert(newItems);
    if (insertErr) {
      console.error("[AutoFix] Failed to insert items:", insertErr);
      return emptyResult("Falha ao persistir os itens corrigidos no banco.");
    }
  } else {
    // Draft/review plan → apply fix IN-PLACE (replace items on same plan)
    wasInPlace = true;

    // Delete old items
    const { error: delErr } = await supabase
      .from("meal_plan_items")
      .delete()
      .eq("meal_plan_id", planId);

    if (delErr) {
      console.error("[AutoFix] Failed to delete old items:", delErr);
      return emptyResult("Falha ao limpar itens antigos");
    }

    // Insert corrected items on the SAME plan
    const fixedItems: TablesInsert<"meal_plan_items">[] = finalItems.map(fi => ({
      meal_plan_id: planId,
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

    const { error: insertErr } = await supabase.from("meal_plan_items").insert(fixedItems);
    if (insertErr) {
      console.error("[AutoFix] Failed to insert corrected items:", insertErr);
      return emptyResult("Falha ao persistir os itens corrigidos no banco.");
    }

    // Update plan metadata (keep same status, just update metadata)
    const { error: updatePlanErr } = await supabase.from("meal_plans").update({
      generation_metadata: genMeta as unknown as Tables<"meal_plans">["generation_metadata"],
      generation_source: "auto_fix_engine_v1",
      total_target_calories: afterCal,
      total_target_protein: afterProt,
      total_target_carbs: afterCarbs,
      total_target_fat: afterFat,
    } as any).eq("id", planId);

    if (updatePlanErr) {
      console.error("[AutoFix] Failed to update plan totals:", updatePlanErr);
      return emptyResult("Falha ao atualizar os totais do plano corrigido.");
    }
  }

  const { data: persistedItems, error: persistedItemsErr } = await supabase
    .from("meal_plan_items")
    .select("title, description, meal_type, day_of_week, calories_target, protein_target, carbs_target, fat_target")
    .eq("meal_plan_id", resultPlanId);

  if (persistedItemsErr) {
    console.error("[AutoFix] Failed to reload persisted items:", persistedItemsErr);
    return emptyResult("Falha ao confirmar a persistência do plano corrigido.");
  }

  const persistenceCheck = compareMealPlanCollections(finalItems, persistedItems || []);
  if (!persistenceCheck.matches) {
    console.error("[AutoFix] Persisted diff mismatch:", persistenceCheck);
    return emptyResult("Correção não confirmada no banco. Nenhuma alteração foi aplicada.");
  }

  // Record timeline
  await supabase.from("patient_timeline").insert({
    patient_id: patientId,
    event_type: "plan_auto_fixed",
    title: "Plano alimentar corrigido automaticamente",
    description: `Score: ${beforeScore.total} → ${afterScore.total}. ${allChanges.length} correções${wasInPlace ? " (in-place)" : ""}. Objetivo: ${patientGoal}.`,
    metadata: {
      original_plan_id: planId,
      new_plan_id: resultPlanId,
      in_place: wasInPlace,
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
    newPlanId: resultPlanId,
    inPlace: wasInPlace,
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
      totalCalories: afterCal,
      totalProtein: afterProt,
      totalCarbs: afterCarbs,
      totalFat: afterFat,
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
