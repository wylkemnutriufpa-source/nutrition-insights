/**
 * Motor Automático de Montagem de Plano Alimentar — FitJourney Clinical Engine v3.0
 * 100% determinístico. Sem IA generativa.
 * 
 * v3.0: Refeições realistas pré-definidas com comida brasileira popular
 * - Bloqueio de alimentos caros/importados
 * - Limite de frutas (max 2 por refeição)
 * - Estrutura fixa por objetivo (emagrecimento vs ganho de massa)
 * - Substituições apenas dentro da mesma categoria
 */

import { supabase } from "@/integrations/supabase/client";
import {
  isBlockedFood,
  getRealisticOptions,
  getSubstitutionsFor,
  MEAL_LIMITS,
  BLOCKED_FOODS,
  ensureBreakfastProtein,
} from "./mealPlanFoodRules";
import { isExplicitlyBanned, getClosestValidatedFood } from "./validatedFoodDatabase";
import { buildMealItems } from "./mealItemBuilder";
import { autoMatchSingle } from "./mealVisualAssociation";

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
  goal: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  restrictions: string[];
  rejectedFoods: string[];
  clinicalTags: string[];
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
  day: number;
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
const ENGINE_VERSION = "3.0.0";
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

const GOAL_COMPAT: Record<string, string[]> = {
  weight_loss: ["weight_loss", "low_carb", "metabolic", "functional"],
  hypertrophy: ["hypertrophy", "maintenance"],
  low_carb: ["low_carb", "weight_loss", "metabolic"],
  metabolic: ["metabolic", "low_carb", "functional", "weight_loss"],
  functional: ["functional", "maintenance", "weight_loss"],
  maintenance: ["maintenance", "functional", "hypertrophy"],
};

const SCALE_MIN = 0.5;
const SCALE_MAX = 1.8; // Reduced from 2.2 to prevent absurd quantities

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

  let allItems = (rawItems || []) as unknown as MealLibraryItem[];
  
  // 2. FILTER: Remove items with blocked or banned foods
  allItems = allItems.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    const hasBlocked = item.foods.some(f => isBlockedFood(f.name || "") || isExplicitlyBanned(f.name || ""));
    if (hasBlocked) {
      warnings.push(`Item "${item.title}" removido: contém alimento bloqueado/banido`);
    }
    return !hasBlocked;
  });

  if (allItems.length === 0) {
    // Fallback: generate from realistic presets
    return generateFromPresets(profile, distribution);
  }

  // 3. Pre-filter: remove items with rejected foods
  const rejectedLower = profile.rejectedFoods.map((f) => f.toLowerCase());
  const filtered = allItems.filter((item) => {
    if (!Array.isArray(item.foods)) return true;
    return !item.foods.some((f) =>
      rejectedLower.some((r) => f.name?.toLowerCase().includes(r))
    );
  });

  // 4. Validate fruit limits in remaining items
  const validatedItems = filtered.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    const fruitCount = item.foods.filter(f => {
      const n = (f.name || "").toLowerCase();
      return ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina", "manga", "melancia", "abacaxi", "uva", "melão"].some(fr => n.includes(fr));
    }).length;
    if (fruitCount > MEAL_LIMITS.maxFruitsPerMeal) {
      warnings.push(`Item "${item.title}" removido: ${fruitCount} frutas (máx ${MEAL_LIMITS.maxFruitsPerMeal})`);
      return false;
    }
    return true;
  });

  // 5. Generate 7 days
  const slots: GeneratedMealSlot[] = [];
  const usageCount: Record<string, number> = {};
  let fallbackUsed = false;

  for (let day = 1; day <= 7; day++) {
    for (const mealType of MEAL_TYPES) {
      const targetKcal = Math.round(profile.targetCalories * distribution[mealType]);
      const compatGoals = GOAL_COMPAT[profile.goal] || [profile.goal, "maintenance"];

      let candidates = validatedItems
        .filter((item) => item.meal_type === mealType)
        .map((item) => ({
          item,
          score: scoreMeal(item, compatGoals, profile.clinicalTags, targetKcal),
        }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score);

      // Diversity filter
      const diverse = candidates.filter((c) => (usageCount[c.item.id] || 0) < MAX_REPEAT_PER_WEEK);
      if (diverse.length > 0) {
        candidates = diverse;
      } else if (candidates.length > 0) {
        fallbackUsed = true;
      }

      // Lunch/dinner diversity
      if (mealType === "dinner") {
        const todayLunch = slots.find((s) => s.day === day && s.mealType === "lunch");
        if (todayLunch && candidates.length > 1) {
          const withoutLunch = candidates.filter((c) => c.item.id !== todayLunch.libraryItem.id);
          if (withoutLunch.length > 0) candidates = withoutLunch;
        }
      }

      const topN = candidates.slice(0, Math.min(3, candidates.length));
      const selected = topN.length > 0 ? topN[deterministicPick(day, mealType, topN.length)] : null;

      if (!selected) {
        // Fallback: use realistic presets
        const presets = getRealisticOptions(mealType, profile.goal);
        const presetIdx = day % presets.length;
        const preset = presets[presetIdx];
        fallbackUsed = true;
        
        const fakeLibItem: MealLibraryItem = {
          id: `preset-${mealType}-${presetIdx}`,
          title: preset.name,
          meal_type: mealType,
          goal_tag: profile.goal,
          clinical_tags: [],
          base_calories: preset.kcal,
          protein: preset.protein,
          carbs: preset.carbs,
          fat: preset.fat,
          foods: preset.foods.map(f => ({ name: f, portion: f })),
          substitutions: [],
        };
        const sf = calcScale(preset.kcal, targetKcal);
        slots.push({ day, mealType, libraryItem: fakeLibItem, targetKcal, scaleFactor: sf, compatibilityScore: 50 });
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
    algorithm: "deterministic_realistic_v3",
    patient_goal: profile.goal,
    target_calories: profile.targetCalories,
    distribution,
    total_library_items: allItems.length,
    items_after_filter: validatedItems.length,
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

// ── Fallback: generate entirely from presets ──
function generateFromPresets(
  profile: PatientProfile,
  distribution: MealDistribution,
): AutoGenerationResult {
  const slots: GeneratedMealSlot[] = [];

  for (let day = 1; day <= 7; day++) {
    for (const mealType of MEAL_TYPES) {
      const targetKcal = Math.round(profile.targetCalories * distribution[mealType]);
      const presets = getRealisticOptions(mealType, profile.goal);
      const pickIdx = (day + mealType.length) % presets.length;
      const preset = presets[pickIdx];

      const fakeLibItem: MealLibraryItem = {
        id: `preset-${mealType}-${day}-${pickIdx}`,
        title: preset.name,
        meal_type: mealType,
        goal_tag: profile.goal,
        clinical_tags: [],
        base_calories: preset.kcal,
        protein: preset.protein,
        carbs: preset.carbs,
        fat: preset.fat,
        foods: preset.foods.map(f => ({ name: f, portion: f })),
        substitutions: [],
      };

      const sf = calcScale(preset.kcal, targetKcal);
      slots.push({ day, mealType, libraryItem: fakeLibItem, targetKcal, scaleFactor: sf, compatibilityScore: 50 });
    }
  }

  return {
    success: true,
    slots,
    metadata: {
      engine_version: ENGINE_VERSION,
      algorithm: "preset_realistic_fallback_v3",
      patient_goal: profile.goal,
      target_calories: profile.targetCalories,
      distribution,
      total_library_items: 0,
      items_after_filter: 0,
      diversity_enforced: true,
      fallback_used: true,
      generated_at: new Date().toISOString(),
      slots_summary: slots.map(s => ({
        day: s.day,
        meal_type: s.mealType,
        library_meal_id: s.libraryItem.id,
        library_meal_title: s.libraryItem.title,
        score: 50,
        scale_factor: s.scaleFactor,
        target_kcal: s.targetKcal,
      })),
    },
    warnings: ["Gerado a partir de presets realistas (biblioteca vazia ou filtrada)."],
  };
}

// ── Scoring function ─────────────────────────────────────────
function scoreMeal(
  item: MealLibraryItem,
  compatGoals: string[],
  clinicalTags: string[],
  targetKcal: number,
): number {
  let score = 0;

  const goalIdx = compatGoals.indexOf(item.goal_tag);
  if (goalIdx === 0) score += 40;
  else if (goalIdx === 1) score += 25;
  else if (goalIdx >= 2) score += 10;
  else return 0;

  if (clinicalTags.length > 0 && Array.isArray(item.clinical_tags)) {
    const matches = clinicalTags.filter((t) => item.clinical_tags.includes(t)).length;
    score += Math.min(30, matches * 15);
  }

  if (item.base_calories > 0 && targetKcal > 0) {
    const ratio = item.base_calories / targetKcal;
    const proximity = 1 - Math.min(1, Math.abs(ratio - 1));
    score += Math.round(proximity * 20);
  }

  // Prefer simpler meals (fewer items = more realistic)
  if (Array.isArray(item.foods)) {
    const count = item.foods.length;
    if (count <= 3) score += 10;
    else if (count <= 5) score += 5;
    else score -= 5; // penalize overly complex meals
  }

  return score;
}

// ── Seed and pick ────────────────────────────────────────────
let _generationSeed = 0;

export function setGenerationSeed(patientId: string, optionIndex: number = 0) {
  let hash = 0;
  const seedStr = patientId + optionIndex.toString();
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  _generationSeed = Math.abs(hash);
}

function deterministicPick(day: number, mealType: string, max: number): number {
  const mealHash = mealType.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hash = (_generationSeed + day * 17 + mealHash * 31 + day * mealHash) % max;
  return Math.abs(hash) % max;
}

// ── Scale factor ─────────────────────────────────────────────
function calcScale(baseKcal: number, targetKcal: number): number {
  if (!baseKcal || baseKcal === 0) return 1;
  const raw = targetKcal / baseKcal;
  return Math.round(Math.max(SCALE_MIN, Math.min(SCALE_MAX, raw)) * 100) / 100;
}

// ── Convert to inserts ───────────────────────────────────────
function normalizeGeneratedDayForStorage(day: number) {
  return ((day % 7) + 7) % 7;
}

export async function slotsToInserts(slots: GeneratedMealSlot[], planId: string) {
  type MealTypeEnum = "breakfast" | "morning_snack" | "lunch" | "afternoon_snack" | "dinner" | "evening_snack";

  const nested = await Promise.all(
    slots.map(async (slot) => {
      const mealType = slot.mealType as MealTypeEnum;
      const storageDay = normalizeGeneratedDayForStorage(slot.day);
      let foodNames = Array.isArray(slot.libraryItem.foods) ? slot.libraryItem.foods.map(f => f.name || "") : [];
      
      // Enforce breakfast protein rule globally
      if (mealType === "breakfast") {
        foodNames = ensureBreakfastProtein(foodNames);
      }
      
      const foods = foodNames.map(name => {
        const original = (slot.libraryItem.foods || []).find(f => f.name === name);
        return original || { name, portion: name };
      });

      const scaledProtein = Math.round(slot.libraryItem.protein * slot.scaleFactor);
      const scaledCarbs = Math.round(slot.libraryItem.carbs * slot.scaleFactor);
      const scaledFat = Math.round(slot.libraryItem.fat * slot.scaleFactor);

      const scaledFoods = foods.map((food) => {
        const portion = food.portion
          ? slot.scaleFactor !== 1
            ? `${food.portion} (×${slot.scaleFactor.toFixed(1)})`
            : food.portion
          : undefined;

        return {
          name: food.name,
          portion,
        };
      });

      const description = scaledFoods.length > 0
        ? scaledFoods
            .map((food) => (food.portion ? `• ${food.name} — ${food.portion}` : `• ${food.name}`))
            .join("\n")
        : null;

      const resolvedTitle = await getClosestValidatedFood(slot.libraryItem.title) || slot.libraryItem.title;
      const visualLibraryItemId = await autoMatchSingle(resolvedTitle, description || undefined);

      const { items } = buildMealItems([
        {
          meal_plan_id: planId,
          title: resolvedTitle,
          description,
          meal_type: mealType,
          day_of_week: storageDay,
          calories_target: slot.targetKcal,
          protein_target: scaledProtein,
          carbs_target: scaledCarbs,
          fat_target: scaledFat,
          visual_library_item_id: visualLibraryItemId,
          item_origin: "auto_generated",
          foods: scaledFoods.map((food) => (food.portion ? `${food.name} — ${food.portion}` : food.name)),
        },
      ]);

      return items;
    })
  );

  const allItems = nested.flat();

  // ── Sanity guardrail: detect per-item calorie inflation ────
  // If any single item has calories_target above 1200, it's likely set to the
  // daily total instead of the per-meal target. Fix by redistributing.
  const MAX_SINGLE_ITEM_KCAL = 1200;
  for (const item of allItems) {
    const cal = Number((item as any).calories_target) || 0;
    if (cal > MAX_SINGLE_ITEM_KCAL) {
      console.warn(`[slotsToInserts] Item "${(item as any).title}" has inflated calories_target=${cal}. Clamping.`);
      // Estimate correct value based on meal type share
      const mealShares: Record<string, number> = {
        breakfast: 0.20, morning_snack: 0.10, lunch: 0.30,
        afternoon_snack: 0.10, dinner: 0.25, evening_snack: 0.05,
      };
      const share = mealShares[(item as any).meal_type] || 0.20;
      // Use the inflated value as the daily total and compute the per-meal target
      (item as any).calories_target = Math.round(cal * share);
    }
  }

  // ── Cross-day macro normalization ──────────────────────────
  // Ensure all days have the same macro totals (eliminate day-to-day variance)
  const CROSS_DAY_TOL_PROTEIN = 0.03; // 3%
  const CROSS_DAY_TOL_DEFAULT = 0.05; // 5%
  const macroKeys = ["calories_target", "protein_target", "carbs_target", "fat_target"] as const;
  const uniqueDays = Array.from(new Set(allItems.map(i => i.day_of_week ?? 0)));

  if (uniqueDays.length >= 2) {
    for (const macroKey of macroKeys) {
      const tol = macroKey === "protein_target" ? CROSS_DAY_TOL_PROTEIN : CROSS_DAY_TOL_DEFAULT;

      // Calculate per-day totals
      const dayTotals = new Map<number, number>();
      for (const day of uniqueDays) {
        const dayItems = allItems.filter(i => (i.day_of_week ?? 0) === day);
        dayTotals.set(day, dayItems.reduce((s, i) => s + (Number((i as any)[macroKey]) || 0), 0));
      }

      // Target = average across all days
      const vals = Array.from(dayTotals.values());
      const targetPerDay = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      if (targetPerDay <= 0) continue;

      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      const variance = (maxVal - minVal) / targetPerDay;

      if (variance > tol) {
        for (const day of uniqueDays) {
          const dayTotal = dayTotals.get(day) || 0;
          if (dayTotal <= 0) continue;
          const diffPct = Math.abs(dayTotal - targetPerDay) / targetPerDay;
          if (diffPct <= 0.01) continue; // already close enough

          const factor = targetPerDay / dayTotal;
          const dayItems = allItems.filter(i => (i.day_of_week ?? 0) === day);

          let scaledSum = 0;
          let largestIdx = -1;
          let largestVal = 0;

          for (let idx = 0; idx < dayItems.length; idx++) {
            const item = dayItems[idx] as any;
            const oldVal = Number(item[macroKey]) || 0;
            if (oldVal > 0) {
              const newVal = Math.round(oldVal * factor);
              item[macroKey] = newVal;
              scaledSum += newVal;
              if (oldVal > largestVal) {
                largestVal = oldVal;
                largestIdx = idx;
              }
            }
          }

          // Fix rounding residual
          const residual = targetPerDay - scaledSum;
          if (residual !== 0 && largestIdx >= 0) {
            (dayItems[largestIdx] as any)[macroKey] = ((dayItems[largestIdx] as any)[macroKey] || 0) + residual;
          }
        }
      }
    }
  }

  return allItems;
}

// ── Load patient profile ─────────────────────────────────────
export async function loadPatientProfile(patientId: string): Promise<PatientProfile | null> {
  const { data: anamnesis } = await supabase
    .from("patient_anamnesis")
    .select("answers, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
    .eq("user_id", patientId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: try physical assessment for weight even without anamnesis
  if (!anamnesis) {
    const { data: assessment } = await supabase
      .from("physical_assessments")
      .select("weight, height")
      .eq("patient_id", patientId)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessment?.weight) {
      const weight = Number(assessment.weight) || 70;
      const baseCal = Math.round(weight * 26);
      return {
        patientId,
        goal: "maintenance",
        targetCalories: baseCal,
        targetProtein: Math.round(weight * 1.6),
        targetCarbs: Math.round(baseCal * 0.45 / 4),
        targetFat: Math.round(baseCal * 0.25 / 9),
        restrictions: [],
        rejectedFoods: [],
        clinicalTags: [],
        weight,
      };
    }

    return null;
  }

  const answers = (anamnesis.answers || {}) as Record<string, any>;

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

  const rawRestrictions = answers.restrictions || answers.restricoes || answers.intolerances || [];
  const restrictions = Array.isArray(rawRestrictions) ? rawRestrictions : [rawRestrictions].filter(Boolean);

  const rawRejected = answers.rejected_foods || answers.alimentos_rejeitados || [];
  const rejectedFoods = Array.isArray(rawRejected)
    ? rawRejected
    : typeof rawRejected === "string"
      ? rawRejected.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

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
