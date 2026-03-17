/**
 * Motor Automático de Montagem de Plano Alimentar — FitJourney Clinical Engine
 * 100% determinístico. Sem IA generativa.
 * 
 * Algoritmo de seleção:
 * 1. Filtra meal_library por meal_type + goal_tag compatível
 * 2. Filtra por clinical_tags quando presentes
 * 3. Remove refeições com alimentos rejeitados pelo paciente
 * 4. Pontua cada refeição (goal match, clinical match, saciedade)
 * 5. Seleciona com diversidade: max 2 repetições/semana
 * 6. Escala porções ao alvo calórico da refeição
 * 7. Gera draft com metadata de explicabilidade
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ────────────────────────────────────────────────────
export interface MealLibraryItem {
  id: string;
  title: string;
  meal_type: string;
  goal_tag: string;
  clinical_tags: string[];
  base_calories: number;
  protein: number;
  carbs: number;
  fat: number;
  foods: { name: string; portion: string }[];
  substitutions: { replace: string; options: string[] }[];
}

export interface PatientProfile {
  patientId: string;
  goal: string;              // weight_loss | hypertrophy | low_carb | metabolic | functional | maintenance
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  restrictions: string[];    // e.g. ["gluten", "lactose"]
  rejectedFoods: string[];   // e.g. ["fígado", "beterraba"]
  clinicalTags: string[];    // e.g. ["diabetes", "intestinal"]
  weight?: number;
}

export interface MealDistribution {
  breakfast: number;
  morning_snack: number;
  lunch: number;
  afternoon_snack: number;
  dinner: number;
  evening_snack: number;
}

export interface GeneratedMealSlot {
  day: number;               // 1-7
  mealType: string;
  libraryItem: MealLibraryItem;
  targetKcal: number;
  scaleFactor: number;
  compatibilityScore: number;
}

export interface AutoGenerationResult {
  success: boolean;
  slots: GeneratedMealSlot[];
  metadata: AutoGenMetadata;
  warnings: string[];
}

export interface AutoGenMetadata {
  engine_version: string;
  algorithm: string;
  patient_goal: string;
  target_calories: number;
  distribution: MealDistribution;
  total_library_items: number;
  items_after_filter: number;
  diversity_enforced: boolean;
  fallback_used: boolean;
  generated_at: string;
  slots_summary: {
    day: number;
    meal_type: string;
    library_meal_id: string;
    library_meal_title: string;
    score: number;
    scale_factor: number;
    target_kcal: number;
  }[];
}

// ── Constants ────────────────────────────────────────────────
const ENGINE_VERSION = "1.0.0";
const MAX_REPEAT_PER_WEEK = 2;
const MEAL_TYPES: (keyof MealDistribution)[] = [
  "breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack",
];

const DEFAULT_DISTRIBUTION: MealDistribution = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  evening_snack: 0.08,
};

// Goal compatibility map (primary → compatible fallbacks)
const GOAL_COMPAT: Record<string, string[]> = {
  weight_loss: ["weight_loss", "low_carb", "metabolic", "functional"],
  hypertrophy: ["hypertrophy", "maintenance"],
  low_carb: ["low_carb", "weight_loss", "metabolic"],
  metabolic: ["metabolic", "low_carb", "functional", "weight_loss"],
  functional: ["functional", "maintenance", "weight_loss"],
  maintenance: ["maintenance", "functional", "hypertrophy"],
};

const SCALE_MIN = 0.4;
const SCALE_MAX = 2.2;

// ── Main Engine ──────────────────────────────────────────────
export async function generateMealPlanFromLibrary(
  profile: PatientProfile,
  distribution: MealDistribution = DEFAULT_DISTRIBUTION,
): Promise<AutoGenerationResult> {
  const warnings: string[] = [];

  // 1. Fetch all active library items
  const { data: rawItems } = await supabase
    .from("meal_library" as any)
    .select("*")
    .eq("is_active", true);

  const allItems = (rawItems || []) as unknown as MealLibraryItem[];
  if (allItems.length === 0) {
    return { success: false, slots: [], metadata: emptyMeta(profile, distribution, 0), warnings: ["Nenhum item na biblioteca de refeições."] };
  }

  // 2. Pre-filter: remove items with rejected foods
  const rejectedLower = profile.rejectedFoods.map((f) => f.toLowerCase());
  const filtered = allItems.filter((item) => {
    if (!Array.isArray(item.foods)) return true;
    return !item.foods.some((f) =>
      rejectedLower.some((r) => f.name?.toLowerCase().includes(r))
    );
  });

  // 3. Generate 7 days
  const slots: GeneratedMealSlot[] = [];
  const usageCount: Record<string, number> = {}; // libraryId → times used
  let fallbackUsed = false;

  for (let day = 1; day <= 7; day++) {
    for (const mealType of MEAL_TYPES) {
      const targetKcal = Math.round(profile.targetCalories * distribution[mealType]);

      // Get compatible goals
      const compatGoals = GOAL_COMPAT[profile.goal] || [profile.goal, "maintenance"];

      // Score and filter candidates
      let candidates = filtered
        .filter((item) => item.meal_type === mealType)
        .map((item) => ({
          item,
          score: scoreMeal(item, compatGoals, profile.clinicalTags, targetKcal),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      // Apply diversity: prefer items used less than MAX_REPEAT
      const diverse = candidates.filter((c) => (usageCount[c.item.id] || 0) < MAX_REPEAT_PER_WEEK);
      if (diverse.length > 0) {
        candidates = diverse;
      } else if (candidates.length > 0) {
        fallbackUsed = true;
        warnings.push(`Dia ${day} ${mealType}: diversidade relaxada (poucos candidatos)`);
      }

      // For lunch/dinner extra diversity: avoid same as other main meal today
      if (mealType === "dinner") {
        const todayLunch = slots.find((s) => s.day === day && s.mealType === "lunch");
        if (todayLunch && candidates.length > 1) {
          const withoutLunch = candidates.filter((c) => c.item.id !== todayLunch.libraryItem.id);
          if (withoutLunch.length > 0) candidates = withoutLunch;
        }
      }

      // Select best candidate (with slight randomization among top 3 for variety)
      const topN = candidates.slice(0, Math.min(3, candidates.length));
      const selected = topN.length > 0 ? topN[deterministicPick(day, mealType, topN.length)] : null;

      if (!selected) {
        // Absolute fallback: pick any item of this meal_type
        const anyFallback = filtered.find((item) => item.meal_type === mealType);
        if (anyFallback) {
          fallbackUsed = true;
          warnings.push(`Dia ${day} ${mealType}: fallback genérico usado`);
          const sf = calcScale(anyFallback.base_calories, targetKcal);
          slots.push({ day, mealType, libraryItem: anyFallback, targetKcal, scaleFactor: sf, compatibilityScore: 0 });
          usageCount[anyFallback.id] = (usageCount[anyFallback.id] || 0) + 1;
        } else {
          warnings.push(`Dia ${day} ${mealType}: nenhuma refeição disponível`);
        }
        continue;
      }

      const sf = calcScale(selected.item.base_calories, targetKcal);
      slots.push({
        day,
        mealType,
        libraryItem: selected.item,
        targetKcal,
        scaleFactor: sf,
        compatibilityScore: selected.score,
      });
      usageCount[selected.item.id] = (usageCount[selected.item.id] || 0) + 1;
    }
  }

  const metadata: AutoGenMetadata = {
    engine_version: ENGINE_VERSION,
    algorithm: "deterministic_scored_selection_v1",
    patient_goal: profile.goal,
    target_calories: profile.targetCalories,
    distribution,
    total_library_items: allItems.length,
    items_after_filter: filtered.length,
    diversity_enforced: !fallbackUsed,
    fallback_used: fallbackUsed,
    generated_at: new Date().toISOString(),
    slots_summary: slots.map((s) => ({
      day: s.day,
      meal_type: s.mealType,
      library_meal_id: s.libraryItem.id,
      library_meal_title: s.libraryItem.title,
      score: s.compatibilityScore,
      scale_factor: s.scaleFactor,
      target_kcal: s.targetKcal,
    })),
  };

  return { success: true, slots, metadata, warnings };
}

// ── Scoring function ─────────────────────────────────────────
function scoreMeal(
  item: MealLibraryItem,
  compatGoals: string[],
  clinicalTags: string[],
  targetKcal: number,
): number {
  let score = 0;

  // Goal compatibility (0-40)
  const goalIdx = compatGoals.indexOf(item.goal_tag);
  if (goalIdx === 0) score += 40;
  else if (goalIdx === 1) score += 25;
  else if (goalIdx >= 2) score += 10;
  else return 0; // incompatible goal → exclude

  // Clinical tag match (0-30)
  if (clinicalTags.length > 0 && Array.isArray(item.clinical_tags)) {
    const matches = clinicalTags.filter((t) => item.clinical_tags.includes(t)).length;
    score += Math.min(30, matches * 15);
  }

  // Caloric proximity (0-20): closer to target = higher score
  if (item.base_calories > 0 && targetKcal > 0) {
    const ratio = item.base_calories / targetKcal;
    // Perfect = 1.0 → 20 points; far = 0 points
    const proximity = 1 - Math.min(1, Math.abs(ratio - 1));
    score += Math.round(proximity * 20);
  }

  // Variety bonus: items with more foods get slight boost (0-10)
  if (Array.isArray(item.foods)) {
    score += Math.min(10, item.foods.length * 2);
  }

  return score;
}

// ── Deterministic pick (pseudo-random based on day + meal) ──
function deterministicPick(day: number, mealType: string, max: number): number {
  // Simple hash to distribute selections
  const hash = (day * 7 + mealType.length * 13) % max;
  return hash;
}

// ── Scale factor calculation ─────────────────────────────────
function calcScale(baseKcal: number, targetKcal: number): number {
  if (!baseKcal || baseKcal === 0) return 1;
  const raw = targetKcal / baseKcal;
  return Math.round(Math.max(SCALE_MIN, Math.min(SCALE_MAX, raw)) * 100) / 100;
}

// ── Empty metadata helper ────────────────────────────────────
function emptyMeta(profile: PatientProfile, distribution: MealDistribution, total: number): AutoGenMetadata {
  return {
    engine_version: ENGINE_VERSION,
    algorithm: "deterministic_scored_selection_v1",
    patient_goal: profile.goal,
    target_calories: profile.targetCalories,
    distribution,
    total_library_items: total,
    items_after_filter: 0,
    diversity_enforced: false,
    fallback_used: false,
    generated_at: new Date().toISOString(),
    slots_summary: [],
  };
}

// ── Helper: convert result to meal_plan_items inserts ────────
export function slotsToInserts(
  slots: GeneratedMealSlot[],
  planId: string,
) {
  return slots.flatMap((slot) => {
    const foods = Array.isArray(slot.libraryItem.foods) ? slot.libraryItem.foods : [];
    if (foods.length === 0) {
      return [{
        meal_plan_id: planId,
        title: slot.libraryItem.title,
        description: null as string | null,
        meal_type: slot.mealType,
        day_of_week: slot.day,
        calories_target: slot.targetKcal,
        protein_target: Math.round(slot.libraryItem.protein * slot.scaleFactor),
        carbs_target: Math.round(slot.libraryItem.carbs * slot.scaleFactor),
        fat_target: Math.round(slot.libraryItem.fat * slot.scaleFactor),
      }];
    }

    return foods.map((food) => ({
      meal_plan_id: planId,
      title: food.name,
      description: slot.scaleFactor !== 1
        ? `${food.portion} (×${slot.scaleFactor.toFixed(1)})`
        : food.portion || null,
      meal_type: slot.mealType,
      day_of_week: slot.day,
      calories_target: Math.round((slot.libraryItem.base_calories / foods.length) * slot.scaleFactor),
      protein_target: Math.round((slot.libraryItem.protein / foods.length) * slot.scaleFactor),
      carbs_target: Math.round((slot.libraryItem.carbs / foods.length) * slot.scaleFactor),
      fat_target: Math.round((slot.libraryItem.fat / foods.length) * slot.scaleFactor),
    }));
  });
}

// ── Helper: load patient profile from anamnesis ──────────────
export async function loadPatientProfile(patientId: string): Promise<PatientProfile | null> {
  const { data: anamnesis } = await supabase
    .from("patient_anamnesis")
    .select("answers, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
    .eq("user_id", patientId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anamnesis) return null;

  const answers = (anamnesis.answers || {}) as Record<string, any>;

  // Extract goal from answers
  const goalMap: Record<string, string> = {
    "Perder peso": "weight_loss",
    "Ganhar massa": "hypertrophy",
    "Manter peso": "maintenance",
    "Saúde geral": "functional",
    "Definição": "weight_loss",
    "Performance": "hypertrophy",
  };

  const rawGoal = answers.objective || answers.goal || answers.objetivo || "";
  const goal = goalMap[rawGoal] || "maintenance";

  // Extract restrictions
  const rawRestrictions = answers.restrictions || answers.restricoes || answers.intolerances || [];
  const restrictions = Array.isArray(rawRestrictions) ? rawRestrictions : [rawRestrictions].filter(Boolean);

  // Extract rejected foods
  const rawRejected = answers.rejected_foods || answers.alimentos_rejeitados || [];
  const rejectedFoods = Array.isArray(rawRejected)
    ? rawRejected
    : typeof rawRejected === "string"
      ? rawRejected.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  // Clinical tags from conditions
  const rawConditions = answers.clinical_conditions || answers.condicoes_clinicas || [];
  const clinicalTags = Array.isArray(rawConditions) ? rawConditions : [];

  return {
    patientId,
    goal,
    targetCalories: Number(anamnesis.computed_kcal_target) || 2000,
    targetProtein: Number(anamnesis.computed_protein) || 120,
    targetCarbs: Number(anamnesis.computed_carbs) || 250,
    targetFat: Number(anamnesis.computed_fat) || 60,
    restrictions,
    rejectedFoods,
    clinicalTags,
    weight: Number(answers.weight || answers.peso) || undefined,
  };
}
