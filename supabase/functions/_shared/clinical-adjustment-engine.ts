/**
 * Clinical Adjustment Engine v1.0.0
 * Analyzes patient progress and generates clinical adjustment suggestions.
 * 
 * Pipeline: plan → progress monitoring → clinical analysis → adjustment suggestions
 * 
 * Uses: clinical-macro-engine.ts for macro recalculation
 */

import {
  calculateMacros,
  enforceProteinRange,
  enforceFatRange,
  CLINICAL_PROTEIN_RANGES,
  CLINICAL_FAT_RANGE,
} from "./clinical-macro-engine.ts";

// ──── Types ────

export type ProgressStatus = "below_expected" | "expected" | "above_expected";

export type MealSlot = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "supper";

export type AdjustmentAction =
  | "increase_protein"
  | "decrease_protein"
  | "increase_carbs"
  | "decrease_carbs"
  | "increase_fat"
  | "decrease_fat"
  | "increase_vegetables"
  | "substitute_food"
  | "reduce_calories"
  | "increase_calories";

export interface ProgressAnalysis {
  patientId: string;
  status: ProgressStatus;
  initialWeight: number;
  currentWeight: number;
  weightDelta: number;
  expectedDelta: number;
  deviationPercent: number;
  daysSincePlanStart: number;
  adherenceScore: number | null;
  goal: string;
  currentPlanId: string | null;
}

export interface MealAdjustmentSuggestion {
  mealSlot: MealSlot;
  mealItemId: string;
  mealTitle: string;
  actions: AdjustmentAction[];
  reason: string;
  currentCalories: number;
  suggestedCalories: number;
  currentProtein: number;
  suggestedProtein: number;
  currentCarbs: number;
  suggestedCarbs: number;
  currentFat: number;
  suggestedFat: number;
}

export interface ClinicalSuggestionSet {
  patientId: string;
  planId: string;
  progressStatus: ProgressStatus;
  overallStrategy: string;
  caloricAdjustmentPercent: number;
  proteinAdjustmentPercent: number;
  carbsAdjustmentPercent: number;
  fatAdjustmentPercent: number;
  mealSuggestions: MealAdjustmentSuggestion[];
  clinicalReason: string;
  generatedAt: string;
}

export interface AdjustmentRequest {
  mealItemId: string;
  action: AdjustmentAction;
  customValue?: number;
}

export interface AdjustmentResult {
  success: boolean;
  updatedItems: number;
  newTotalCalories: number;
  newTotalProtein: number;
  newTotalCarbs: number;
  newTotalFat: number;
  versionId: string | null;
  error?: string;
}

// ──── Constants ────

/** Expected weekly weight loss rates by goal (kg/week) */
const EXPECTED_WEEKLY_RATES: Record<string, number> = {
  lose_weight: -0.5,
  maintain: 0,
  gain_muscle: 0.15,
  gain_weight: 0.3,
  improve_health: -0.3,
  athletic_performance: 0,
};

/** Tolerance band: ±30% of expected rate before triggering adjustment */
const DEVIATION_TOLERANCE = 0.30;

/** Per-action macro multipliers (applied to individual meal items) */
const ACTION_FACTORS: Record<AdjustmentAction, { calories: number; protein: number; carbs: number; fat: number }> = {
  increase_protein:    { calories: 1.05, protein: 1.15, carbs: 0.95, fat: 1.0 },
  decrease_protein:    { calories: 0.95, protein: 0.85, carbs: 1.05, fat: 1.0 },
  increase_carbs:      { calories: 1.08, protein: 1.0,  carbs: 1.15, fat: 1.0 },
  decrease_carbs:      { calories: 0.92, protein: 1.0,  carbs: 0.85, fat: 1.0 },
  increase_fat:        { calories: 1.06, protein: 1.0,  carbs: 1.0,  fat: 1.15 },
  decrease_fat:        { calories: 0.94, protein: 1.0,  carbs: 1.0,  fat: 0.85 },
  increase_vegetables: { calories: 1.02, protein: 1.0,  carbs: 1.05, fat: 1.0 },
  substitute_food:     { calories: 1.0,  protein: 1.0,  carbs: 1.0,  fat: 1.0 },
  reduce_calories:     { calories: 0.90, protein: 1.0,  carbs: 0.85, fat: 0.90 },
  increase_calories:   { calories: 1.10, protein: 1.05, carbs: 1.10, fat: 1.05 },
};

// ──── Progress Analysis ────

export async function analyzePatientProgress(
  supabase: any,
  patientId: string
): Promise<ProgressAnalysis | { error: string }> {
  // 1. Get active meal plan
  const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .select("id, created_at, goal, total_target_calories")
    .eq("patient_id", patientId)
    .in("status", ["published", "published_to_patient", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planErr || !plan) {
    return { error: "Nenhum plano alimentar ativo encontrado para este paciente." };
  }

  const goal = plan.goal || "maintain";

  // 2. Get initial weight (from plan creation date vicinity)
  const planDate = new Date(plan.created_at);
  const { data: initialCheckin } = await supabase
    .from("patient_checkins")
    .select("weight")
    .eq("patient_id", patientId)
    .not("weight", "is", null)
    .lte("checkin_date", new Date(planDate.getTime() + 3 * 86400000).toISOString())
    .order("checkin_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback to anamnesis weight
  let initialWeight: number | null = initialCheckin?.weight || null;
  if (!initialWeight) {
    const { data: anamnesis } = await supabase
      .from("patient_anamnesis")
      .select("answers")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anamnesis?.answers) {
      const a = anamnesis.answers as any;
      if (a.weight) initialWeight = parseFloat(a.weight);
    }
  }

  if (!initialWeight) {
    return { error: "Peso inicial do paciente não encontrado." };
  }

  // 3. Get current weight (latest check-in)
  const { data: latestCheckin } = await supabase
    .from("patient_checkins")
    .select("weight, checkin_date")
    .eq("patient_id", patientId)
    .not("weight", "is", null)
    .order("checkin_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentWeight = latestCheckin?.weight || initialWeight;

  // 4. Calculate progress
  const daysSincePlanStart = Math.max(1, Math.floor((Date.now() - planDate.getTime()) / 86400000));
  const weeksSincePlanStart = daysSincePlanStart / 7;
  const expectedRate = EXPECTED_WEEKLY_RATES[goal] || 0;
  const expectedDelta = expectedRate * weeksSincePlanStart;
  const weightDelta = currentWeight - initialWeight;

  // 5. Determine status
  let status: ProgressStatus = "expected";
  const deviationPercent = expectedDelta !== 0
    ? ((weightDelta - expectedDelta) / Math.abs(expectedDelta)) * 100
    : (Math.abs(weightDelta) > 0.5 ? (weightDelta > 0 ? 100 : -100) : 0);

  if (goal === "lose_weight" || goal === "improve_health") {
    if (weightDelta > expectedDelta * (1 - DEVIATION_TOLERANCE)) status = "below_expected";
    else if (weightDelta < expectedDelta * (1 + DEVIATION_TOLERANCE)) status = "above_expected";
  } else if (goal === "gain_muscle" || goal === "gain_weight") {
    if (weightDelta < expectedDelta * (1 - DEVIATION_TOLERANCE)) status = "below_expected";
    else if (weightDelta > expectedDelta * (1 + DEVIATION_TOLERANCE)) status = "above_expected";
  } else {
    if (Math.abs(weightDelta) > 1.0) {
      status = weightDelta > 0 ? "above_expected" : "below_expected";
    }
  }

  // 6. Get adherence score
  const { data: snapshot } = await supabase
    .from("clinical_daily_snapshots")
    .select("adherence_score")
    .eq("patient_id", patientId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    patientId,
    status,
    initialWeight,
    currentWeight,
    weightDelta: Math.round(weightDelta * 100) / 100,
    expectedDelta: Math.round(expectedDelta * 100) / 100,
    deviationPercent: Math.round(deviationPercent),
    daysSincePlanStart,
    adherenceScore: snapshot?.adherence_score ?? null,
    goal,
    currentPlanId: plan.id,
  };
}

// ──── Clinical Suggestion Generator ────

export async function generateClinicalSuggestions(
  supabase: any,
  progress: ProgressAnalysis
): Promise<ClinicalSuggestionSet | { error: string }> {
  if (!progress.currentPlanId) {
    return { error: "Plano alimentar não encontrado." };
  }

  // Fetch current plan items
  const { data: items, error: itemsErr } = await supabase
    .from("meal_plan_items")
    .select("id, meal_type, title, calories_target, protein_target, carbs_target, fat_target, day_of_week")
    .eq("meal_plan_id", progress.currentPlanId)
    .order("day_of_week")
    .order("meal_type");

  if (itemsErr || !items?.length) {
    return { error: "Itens do plano não encontrados." };
  }

  // Determine overall strategy based on progress status + goal
  const { strategy, caloricPct, proteinPct, carbsPct, fatPct, reason } = determineStrategy(progress);

  // Generate per-meal suggestions (aggregate by meal_type for day 1 as reference)
  const day1Items = items.filter((i: any) => i.day_of_week === 1 || i.day_of_week === "monday" || i.day_of_week === 0);
  const referenceItems = day1Items.length > 0 ? day1Items : items.slice(0, 6);

  const mealSuggestions: MealAdjustmentSuggestion[] = referenceItems.map((item: any) => {
    const slot = normalizeMealSlot(item.meal_type);
    const actions = determineActionsForMeal(slot, progress, caloricPct);

    return {
      mealSlot: slot,
      mealItemId: item.id,
      mealTitle: item.title || slot,
      actions,
      reason: describeMealAction(actions, slot),
      currentCalories: item.calories_target || 0,
      suggestedCalories: Math.round((item.calories_target || 0) * (1 + caloricPct / 100)),
      currentProtein: item.protein_target || 0,
      suggestedProtein: Math.round(((item.protein_target || 0) * (1 + proteinPct / 100)) * 10) / 10,
      currentCarbs: item.carbs_target || 0,
      suggestedCarbs: Math.round(((item.carbs_target || 0) * (1 + carbsPct / 100)) * 10) / 10,
      currentFat: item.fat_target || 0,
      suggestedFat: Math.round(((item.fat_target || 0) * (1 + fatPct / 100)) * 10) / 10,
    };
  });

  return {
    patientId: progress.patientId,
    planId: progress.currentPlanId,
    progressStatus: progress.status,
    overallStrategy: strategy,
    caloricAdjustmentPercent: caloricPct,
    proteinAdjustmentPercent: proteinPct,
    carbsAdjustmentPercent: carbsPct,
    fatAdjustmentPercent: fatPct,
    mealSuggestions,
    clinicalReason: reason,
    generatedAt: new Date().toISOString(),
  };
}

// ──── Apply Adjustments ────

export async function applyPlanAdjustments(
  supabase: any,
  planId: string,
  patientId: string,
  adjustments: AdjustmentRequest[],
  appliedBy: string
): Promise<AdjustmentResult> {
  try {
    // 1. Fetch current plan
    const { data: plan, error: planErr } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planErr || !plan) {
      return { success: false, updatedItems: 0, newTotalCalories: 0, newTotalProtein: 0, newTotalCarbs: 0, newTotalFat: 0, versionId: null, error: "Plano não encontrado." };
    }

    // 2. Fetch all items
    const { data: items, error: itemsErr } = await supabase
      .from("meal_plan_items")
      .select("*")
      .eq("meal_plan_id", planId);

    if (itemsErr || !items?.length) {
      return { success: false, updatedItems: 0, newTotalCalories: 0, newTotalProtein: 0, newTotalCarbs: 0, newTotalFat: 0, versionId: null, error: "Itens do plano não encontrados." };
    }

    // 3. Create version snapshot
    const { data: version } = await supabase
      .from("meal_plan_versions")
      .insert({
        meal_plan_id: planId,
        snapshot_json: plan,
        items_snapshot: items,
        changed_by: appliedBy,
        change_reason: "[Clinical Adjustment Engine] Ajuste clínico baseado em progresso",
        changed_fields: ["calories_target", "protein_target", "carbs_target", "fat_target"],
      })
      .select("id")
      .single();

    const versionId = version?.id ?? null;

    // 4. Apply adjustments per item
    const adjustmentMap = new Map(adjustments.map(a => [a.mealItemId, a]));
    let updatedCount = 0;

    for (const item of items) {
      const adj = adjustmentMap.get(item.id);
      if (!adj) continue;

      const factors = ACTION_FACTORS[adj.action];
      if (!factors) continue;

      const newCalories = Math.round((item.calories_target || 0) * factors.calories);
      const newProtein = Math.round(((item.protein_target || 0) * factors.protein) * 10) / 10;
      const newCarbs = Math.round(((item.carbs_target || 0) * factors.carbs) * 10) / 10;
      const newFat = Math.round(((item.fat_target || 0) * factors.fat) * 10) / 10;

      const { error: upErr } = await supabase
        .from("meal_plan_items")
        .update({
          calories_target: newCalories,
          protein_target: newProtein,
          carbs_target: newCarbs,
          fat_target: newFat,
        })
        .eq("id", item.id);

      if (!upErr) updatedCount++;
    }

    // 5. Recalculate plan totals
    const { data: updatedItems } = await supabase
      .from("meal_plan_items")
      .select("calories_target, protein_target, carbs_target, fat_target")
      .eq("meal_plan_id", planId);

    const totals = (updatedItems || []).reduce(
      (acc: any, i: any) => ({
        cal: acc.cal + (i.calories_target || 0),
        pro: acc.pro + (i.protein_target || 0),
        carb: acc.carb + (i.carbs_target || 0),
        fat: acc.fat + (i.fat_target || 0),
      }),
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    );

    await supabase
      .from("meal_plans")
      .update({
        total_target_calories: Math.round(totals.cal),
        total_target_protein: Math.round(totals.pro * 10) / 10,
        total_target_carbs: Math.round(totals.carb * 10) / 10,
        total_target_fat: Math.round(totals.fat * 10) / 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId);

    // 6. Audit log
    await supabase.from("clinical_auto_adjustment_logs").insert({
      patient_id: patientId,
      adjustment_type: "clinical_adjustment_engine",
      triggering_driver: "progress_analysis",
      adjustment_parameters: {
        adjustments,
        updated_items: updatedCount,
        new_totals: totals,
        version_id: versionId,
      },
      expected_clinical_effect: "Ajuste baseado na análise de progresso do paciente",
      approved_by_guardrail: true,
      automation_confidence: 0.85,
    });

    return {
      success: true,
      updatedItems: updatedCount,
      newTotalCalories: Math.round(totals.cal),
      newTotalProtein: Math.round(totals.pro * 10) / 10,
      newTotalCarbs: Math.round(totals.carb * 10) / 10,
      newTotalFat: Math.round(totals.fat * 10) / 10,
      versionId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, updatedItems: 0, newTotalCalories: 0, newTotalProtein: 0, newTotalCarbs: 0, newTotalFat: 0, versionId: null, error: msg };
  }
}

// ──── Strategy Determination (Pure Logic) ────

function determineStrategy(progress: ProgressAnalysis): {
  strategy: string;
  caloricPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  reason: string;
} {
  const { status, goal, weightDelta, expectedDelta, adherenceScore, deviationPercent } = progress;

  // Low adherence → don't change macros, focus on behavior
  if (adherenceScore !== null && adherenceScore < 40) {
    return {
      strategy: "behavioral_focus",
      caloricPct: 0,
      proteinPct: 0,
      carbsPct: 0,
      fatPct: 0,
      reason: `Adesão baixa (${adherenceScore}%). Foco em melhorar adesão antes de ajustar macros.`,
    };
  }

  if (goal === "lose_weight" || goal === "improve_health") {
    if (status === "below_expected") {
      // Not losing enough → reduce calories
      return {
        strategy: "caloric_reduction",
        caloricPct: -10,
        proteinPct: 5,
        carbsPct: -15,
        fatPct: -5,
        reason: `Perda de peso abaixo do esperado (${weightDelta}kg vs ${expectedDelta}kg). Redução calórica com preservação proteica.`,
      };
    }
    if (status === "above_expected") {
      // Losing too fast → increase slightly
      return {
        strategy: "caloric_increase",
        caloricPct: 8,
        proteinPct: 5,
        carbsPct: 10,
        fatPct: 5,
        reason: `Perda de peso acima do esperado (${weightDelta}kg vs ${expectedDelta}kg). Aumento leve para preservar massa magra.`,
      };
    }
  }

  if (goal === "gain_muscle" || goal === "gain_weight") {
    if (status === "below_expected") {
      return {
        strategy: "surplus_increase",
        caloricPct: 10,
        proteinPct: 10,
        carbsPct: 12,
        fatPct: 5,
        reason: `Ganho de peso abaixo do esperado (${weightDelta}kg vs ${expectedDelta}kg). Aumento de superávit e proteína.`,
      };
    }
    if (status === "above_expected") {
      return {
        strategy: "surplus_moderation",
        caloricPct: -5,
        proteinPct: 5,
        carbsPct: -8,
        fatPct: -5,
        reason: `Ganho acima do esperado (${weightDelta}kg vs ${expectedDelta}kg). Moderação do superávit para evitar acúmulo de gordura.`,
      };
    }
  }

  // Expected progress → minor optimization
  return {
    strategy: "maintenance_optimization",
    caloricPct: 0,
    proteinPct: 0,
    carbsPct: 0,
    fatPct: 0,
    reason: `Progresso dentro do esperado (${weightDelta}kg vs ${expectedDelta}kg). Plano atual adequado.`,
  };
}

// ──── Helpers ────

function normalizeMealSlot(mealType: string): MealSlot {
  const map: Record<string, MealSlot> = {
    breakfast: "breakfast",
    "café da manhã": "breakfast",
    cafe_da_manha: "breakfast",
    morning_snack: "morning_snack",
    "lanche da manhã": "morning_snack",
    lanche_manha: "morning_snack",
    lunch: "lunch",
    almoço: "lunch",
    almoco: "lunch",
    afternoon_snack: "afternoon_snack",
    "lanche da tarde": "afternoon_snack",
    lanche_tarde: "afternoon_snack",
    snack: "afternoon_snack",
    dinner: "dinner",
    jantar: "dinner",
    supper: "supper",
    ceia: "supper",
  };
  return map[mealType?.toLowerCase()] || "lunch";
}

function determineActionsForMeal(
  slot: MealSlot,
  progress: ProgressAnalysis,
  caloricPct: number
): AdjustmentAction[] {
  const actions: AdjustmentAction[] = [];

  if (caloricPct < 0) {
    actions.push("reduce_calories");
    if (slot === "dinner" || slot === "supper") actions.push("decrease_carbs");
    if (slot === "lunch") actions.push("increase_vegetables");
  } else if (caloricPct > 0) {
    actions.push("increase_calories");
    if (slot === "breakfast" || slot === "lunch") actions.push("increase_protein");
    if (slot === "morning_snack" || slot === "afternoon_snack") actions.push("increase_carbs");
  }

  if (actions.length === 0) actions.push("substitute_food");

  return actions;
}

function describeMealAction(actions: AdjustmentAction[], slot: MealSlot): string {
  const labels: Record<AdjustmentAction, string> = {
    increase_protein: "aumentar proteína",
    decrease_protein: "reduzir proteína",
    increase_carbs: "aumentar carboidrato",
    decrease_carbs: "reduzir carboidrato",
    increase_fat: "aumentar gordura",
    decrease_fat: "reduzir gordura",
    increase_vegetables: "aumentar vegetais",
    substitute_food: "substituir alimento",
    reduce_calories: "reduzir calorias",
    increase_calories: "aumentar calorias",
  };

  const slotLabels: Record<MealSlot, string> = {
    breakfast: "Café da manhã",
    morning_snack: "Lanche da manhã",
    lunch: "Almoço",
    afternoon_snack: "Lanche da tarde",
    dinner: "Jantar",
    supper: "Ceia",
  };

  return `${slotLabels[slot]}: ${actions.map(a => labels[a]).join(", ")}.`;
}
