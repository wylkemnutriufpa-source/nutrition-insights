/**
 * Gerador Assistido de Plano Alimentar — FitJourney Clinical Engine v2
 * 
 * Gera 3 opções diferenciadas (Fácil, Equilibrada, Elaborada) com base em:
 * - Parâmetros do nutricionista
 * - Contexto clínico do paciente
 * - Flags ativas, restrições, protocolo e estratégia
 * 
 * 100% determinístico. Sem IA generativa.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MealLibraryItem, MealDistribution, GeneratedMealSlot } from "./mealPlanAutoGenerator";
import { getPatientFlags, type FlagWithCatalog } from "./clinicalFlags";

// ── Types ────────────────────────────────────────────────────
export type ComplexityTier = "easy" | "balanced" | "elaborate";
export type PlanFocus = "aderencia" | "emagrecimento" | "performance" | "praticidade" | "clinico";
export type ProteinLevel = "leve" | "moderada" | "alta";

export interface AssistedPlanParams {
  targetKcal: number;
  mealCount: 3 | 4 | 5 | 6;
  substitutionsPerMeal: 0 | 1 | 2 | 3;
  complexity: ComplexityTier;
  focus: PlanFocus;
  proteinLevel: ProteinLevel;
  rejectedFoods: string[];
  goal: string;
}

export interface PatientContext {
  patientId: string;
  patientName: string;
  objective: string;
  strategy: string;
  protocol: string;
  restrictions: string[];
  digestiveSymptoms: string[];
  clinicalFlags: FlagWithCatalog[];
  trainingLevel: string;
  foodPreferences: string[];
  weight?: number;
  computedKcal?: number;
  computedProtein?: number;
  computedCarbs?: number;
  computedFat?: number;
}

export interface KcalSuggestion {
  hasConflict: boolean;
  suggestedKcal: number;
  reason: string;
  protocolName: string;
}

export interface GeneratedPlanOption {
  tier: ComplexityTier;
  label: string;
  description: string;
  slots: GeneratedMealSlot[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  substitutionCount: number;
  adherenceScore: number; // 0-100
  clinicalNotes: string[];
  metadata: Record<string, any>;
}

export interface AssistedGenerationResult {
  success: boolean;
  options: GeneratedPlanOption[];
  patientContext: PatientContext;
  kcalSuggestion: KcalSuggestion;
  warnings: string[];
  generatedAt: string;
}

// ── Constants ────────────────────────────────────────────────
const SCALE_MIN = 0.4;
const SCALE_MAX = 2.2;

const MEAL_CONFIGS: Record<number, { types: string[]; distribution: Record<string, number> }> = {
  3: {
    types: ["breakfast", "lunch", "dinner"],
    distribution: { breakfast: 0.25, lunch: 0.40, dinner: 0.35 },
  },
  4: {
    types: ["breakfast", "lunch", "afternoon_snack", "dinner"],
    distribution: { breakfast: 0.22, lunch: 0.35, afternoon_snack: 0.10, dinner: 0.33 },
  },
  5: {
    types: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"],
    distribution: { breakfast: 0.20, morning_snack: 0.10, lunch: 0.30, afternoon_snack: 0.10, dinner: 0.30 },
  },
  6: {
    types: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"],
    distribution: { breakfast: 0.20, morning_snack: 0.10, lunch: 0.30, afternoon_snack: 0.10, dinner: 0.22, evening_snack: 0.08 },
  },
};

const GOAL_COMPAT: Record<string, string[]> = {
  weight_loss: ["weight_loss", "low_carb", "metabolic", "functional"],
  hypertrophy: ["hypertrophy", "maintenance"],
  low_carb: ["low_carb", "weight_loss", "metabolic"],
  metabolic: ["metabolic", "low_carb", "functional", "weight_loss"],
  functional: ["functional", "maintenance", "weight_loss"],
  maintenance: ["maintenance", "functional", "hypertrophy"],
};

const PROTEIN_MULTIPLIERS: Record<ProteinLevel, number> = {
  leve: 0.85,
  moderada: 1.0,
  alta: 1.2,
};

const TIER_CONFIG: Record<ComplexityTier, { maxFoodsPerMeal: number; diversityBonus: number; label: string; desc: string }> = {
  easy: {
    maxFoodsPerMeal: 4,
    diversityBonus: -5,
    label: "Fácil",
    desc: "Alimentos simples, alta aderência, baixa complexidade",
  },
  balanced: {
    maxFoodsPerMeal: 6,
    diversityBonus: 0,
    label: "Equilibrada",
    desc: "Boa variedade, praticidade moderada, equilíbrio nutricional",
  },
  elaborate: {
    maxFoodsPerMeal: 10,
    diversityBonus: 10,
    label: "Elaborada",
    desc: "Maior variedade, combinações sofisticadas, paciente engajado",
  },
};

// ── Load Patient Context ─────────────────────────────────────
export async function loadPatientContext(patientId: string): Promise<PatientContext | null> {
  // Parallel fetch: anamnesis, flags, patient info, protocols
  const [anamnesisRes, flagsRes, patientRes, protocolRes] = await Promise.all([
    supabase
      .from("patient_anamnesis")
      .select("answers, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
      .eq("user_id", patientId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPatientFlags(patientId).catch(() => [] as FlagWithCatalog[]),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("patient_protocols")
      .select("protocol_id, nutrition_protocols(name, strategy_type, goal_type)")
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const answers = (anamnesisRes.data?.answers || {}) as Record<string, any>;
  const flags = flagsRes || [];
  
  // Map goal
  const goalMap: Record<string, string> = {
    "Perder peso": "emagrecimento",
    "Ganhar massa": "hipertrofia",
    "Manter peso": "manutencao",
    "Saúde geral": "funcional",
    "Definição": "emagrecimento",
    "Performance": "performance",
  };

  const rawGoal = answers.objective || answers.goal || answers.objetivo || "";
  const objective = goalMap[rawGoal] || rawGoal || "não definido";

  // Extract restrictions
  const rawRestrictions = answers.restrictions || answers.restricoes || answers.intolerances || [];
  const restrictions = Array.isArray(rawRestrictions) ? rawRestrictions : [rawRestrictions].filter(Boolean);

  // Extract digestive symptoms from flags
  const digestiveFlags = flags
    .filter(f => f.category === "digestivo")
    .map(f => f.display_name);

  // Extract training
  const trainingLevel = answers.exercise_frequency || answers.frequencia_exercicio || "não informado";

  const protocol = protocolRes.data as any;
  const protocolInfo = protocol?.nutrition_protocols;

  return {
    patientId,
    patientName: patientRes.data?.full_name || "Paciente",
    objective,
    strategy: protocolInfo?.strategy_type || answers.strategy || "não definida",
    protocol: protocolInfo?.name || "sem protocolo ativo",
    restrictions,
    digestiveSymptoms: digestiveFlags,
    clinicalFlags: flags,
    trainingLevel,
    foodPreferences: Array.isArray(answers.food_preferences) ? answers.food_preferences : [],
    weight: Number(answers.weight || answers.peso) || undefined,
    computedKcal: Number(anamnesisRes.data?.computed_kcal_target) || undefined,
    computedProtein: Number(anamnesisRes.data?.computed_protein) || undefined,
    computedCarbs: Number(anamnesisRes.data?.computed_carbs) || undefined,
    computedFat: Number(anamnesisRes.data?.computed_fat) || undefined,
  };
}

// ── Kcal Suggestion ──────────────────────────────────────────
export function checkKcalCoherence(
  chosenKcal: number,
  context: PatientContext,
): KcalSuggestion {
  const computed = context.computedKcal;
  if (!computed || Math.abs(chosenKcal - computed) < 150) {
    return { hasConflict: false, suggestedKcal: chosenKcal, reason: "", protocolName: context.protocol };
  }

  const direction = chosenKcal > computed ? "acima" : "abaixo";
  return {
    hasConflict: true,
    suggestedKcal: computed,
    reason: `O valor de ${chosenKcal} kcal está ${direction} da meta calculada (${computed} kcal) para o objetivo "${context.objective}" com o protocolo "${context.protocol}".`,
    protocolName: context.protocol,
  };
}

// ── Main Generator ───────────────────────────────────────────
export async function generateAssistedPlan(
  params: AssistedPlanParams,
  context: PatientContext,
): Promise<AssistedGenerationResult> {
  const warnings: string[] = [];

  // 1. Fetch library
  const { data: rawItems } = await supabase
    .from("meal_library" as any)
    .select("*")
    .eq("is_active", true);

  const allItems = (rawItems || []) as unknown as MealLibraryItem[];
  if (allItems.length === 0) {
    return {
      success: false,
      options: [],
      patientContext: context,
      kcalSuggestion: checkKcalCoherence(params.targetKcal, context),
      warnings: ["Nenhum item na biblioteca de refeições."],
      generatedAt: new Date().toISOString(),
    };
  }

  // 2. Pre-filter by restrictions and rejected foods
  const rejectedLower = [
    ...params.rejectedFoods,
    ...context.restrictions,
  ].map(f => f.toLowerCase());

  const filtered = allItems.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    return !item.foods.some(f =>
      rejectedLower.some(r => f.name?.toLowerCase().includes(r))
    );
  });

  if (filtered.length < 10) {
    warnings.push(`Poucos itens disponíveis após filtros (${filtered.length}). Resultados podem ser limitados.`);
  }

  // 3. Generate 3 tiers
  const tiers: ComplexityTier[] = ["easy", "balanced", "elaborate"];
  const options: GeneratedPlanOption[] = [];

  for (const tier of tiers) {
    const option = generateForTier(
      tier,
      params,
      context,
      filtered,
      warnings,
    );
    options.push(option);
  }

  return {
    success: true,
    options,
    patientContext: context,
    kcalSuggestion: checkKcalCoherence(params.targetKcal, context),
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

// ── Per-Tier Generation ──────────────────────────────────────
function generateForTier(
  tier: ComplexityTier,
  params: AssistedPlanParams,
  context: PatientContext,
  library: MealLibraryItem[],
  warnings: string[],
): GeneratedPlanOption {
  const config = TIER_CONFIG[tier];
  const mealConfig = MEAL_CONFIGS[params.mealCount];
  const compatGoals = GOAL_COMPAT[params.goal] || [params.goal, "maintenance"];
  const clinicalTags = context.clinicalFlags.map(f => f.flag_key);
  const proteinMult = PROTEIN_MULTIPLIERS[params.proteinLevel];

  const slots: GeneratedMealSlot[] = [];
  const usageCount: Record<string, number> = {};
  const maxRepeat = tier === "elaborate" ? 1 : tier === "balanced" ? 2 : 3;

  // Seed for deterministic but tier-differentiated picks
  const tierSeed = tier === "easy" ? 7 : tier === "balanced" ? 13 : 23;

  for (let day = 1; day <= 7; day++) {
    for (const mealType of mealConfig.types) {
      const targetKcal = Math.round(params.targetKcal * (mealConfig.distribution[mealType] || 0.15));

      // Score candidates
      let candidates = library
        .filter(item => item.meal_type === mealType)
        .map(item => ({
          item,
          score: scoreMealForTier(item, compatGoals, clinicalTags, targetKcal, tier, config),
        }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

      // Diversity filter
      const diverse = candidates.filter(c => (usageCount[c.item.id] || 0) < maxRepeat);
      if (diverse.length > 0) candidates = diverse;

      // Lunch/dinner diversity
      if (mealType === "dinner") {
        const todayLunch = slots.find(s => s.day === day && s.mealType === "lunch");
        if (todayLunch && candidates.length > 1) {
          const filtered = candidates.filter(c => c.item.id !== todayLunch.libraryItem.id);
          if (filtered.length > 0) candidates = filtered;
        }
      }

      // Pick using tier-specific seed
      const topN = candidates.slice(0, Math.min(5, candidates.length));
      if (topN.length === 0) {
        const fallback = library.find(item => item.meal_type === mealType);
        if (fallback) {
          const sf = calcScale(fallback.base_calories, targetKcal);
          slots.push({ day, mealType, libraryItem: fallback, targetKcal, scaleFactor: sf, compatibilityScore: 0 });
          usageCount[fallback.id] = (usageCount[fallback.id] || 0) + 1;
        }
        continue;
      }

      const pickIdx = deterministicPick(day, mealType, topN.length, tierSeed, context.patientId);
      const selected = topN[pickIdx];
      const sf = calcScale(selected.item.base_calories, targetKcal);

      slots.push({
        day,
        mealType,
        libraryItem: selected.item,
        targetKcal,
        scaleFactor: sf * proteinMult,
        compatibilityScore: selected.score,
      });
      usageCount[selected.item.id] = (usageCount[selected.item.id] || 0) + 1;
    }
  }

  // Calculate totals
  let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
  for (const s of slots) {
    totalKcal += s.targetKcal;
    totalP += Math.round(s.libraryItem.protein * s.scaleFactor);
    totalC += Math.round(s.libraryItem.carbs * s.scaleFactor);
    totalF += Math.round(s.libraryItem.fat * s.scaleFactor);
  }
  const avgDailyKcal = Math.round(totalKcal / 7);
  const avgDailyP = Math.round(totalP / 7);
  const avgDailyC = Math.round(totalC / 7);
  const avgDailyF = Math.round(totalF / 7);

  // Clinical notes
  const clinicalNotes: string[] = [];
  if (context.digestiveSymptoms.length > 0) {
    clinicalNotes.push(`Atenção digestiva: ${context.digestiveSymptoms.join(", ")}`);
  }
  if (context.restrictions.length > 0) {
    clinicalNotes.push(`Restrições respeitadas: ${context.restrictions.join(", ")}`);
  }
  if (tier === "easy") {
    clinicalNotes.push("Alimentos simples e acessíveis priorizados para máxima aderência.");
  }
  if (tier === "elaborate") {
    clinicalNotes.push("Maior variedade e sofisticação — recomendado para pacientes altamente engajados.");
  }

  // Adherence estimate
  const adherenceBase = tier === "easy" ? 85 : tier === "balanced" ? 72 : 60;
  const flagPenalty = Math.min(15, context.clinicalFlags.length * 3);
  const adherenceScore = Math.max(40, adherenceBase - flagPenalty);

  return {
    tier,
    label: config.label,
    description: config.desc,
    slots,
    totalKcal: avgDailyKcal,
    totalProtein: avgDailyP,
    totalCarbs: avgDailyC,
    totalFat: avgDailyF,
    mealCount: params.mealCount,
    substitutionCount: params.substitutionsPerMeal,
    adherenceScore,
    clinicalNotes,
    metadata: {
      engine_version: "2.0.0",
      algorithm: "assisted_scored_tiered_v2",
      tier,
      patient_goal: params.goal,
      target_calories: params.targetKcal,
      focus: params.focus,
      protein_level: params.proteinLevel,
      complexity: tier,
      flags_considered: clinicalTags.length,
      library_items_used: Object.keys(usageCount).length,
      generated_at: new Date().toISOString(),
    },
  };
}

// ── Scoring with tier awareness ──────────────────────────────
function scoreMealForTier(
  item: MealLibraryItem,
  compatGoals: string[],
  clinicalTags: string[],
  targetKcal: number,
  tier: ComplexityTier,
  config: typeof TIER_CONFIG["easy"],
): number {
  let score = 0;

  // Goal compatibility (0-40)
  const goalIdx = compatGoals.indexOf(item.goal_tag);
  if (goalIdx === 0) score += 40;
  else if (goalIdx === 1) score += 25;
  else if (goalIdx >= 2) score += 10;
  else return 0;

  // Clinical tag match (0-30)
  if (clinicalTags.length > 0 && Array.isArray(item.clinical_tags)) {
    const matches = clinicalTags.filter(t => item.clinical_tags.includes(t)).length;
    score += Math.min(30, matches * 15);
  }

  // Caloric proximity (0-20)
  if (item.base_calories > 0 && targetKcal > 0) {
    const ratio = item.base_calories / targetKcal;
    const proximity = 1 - Math.min(1, Math.abs(ratio - 1));
    score += Math.round(proximity * 20);
  }

  // Tier-specific: food count preference
  const foodCount = Array.isArray(item.foods) ? item.foods.length : 0;
  if (tier === "easy") {
    // Prefer fewer foods
    score += foodCount <= 3 ? 10 : foodCount <= 5 ? 5 : 0;
  } else if (tier === "elaborate") {
    // Prefer more variety
    score += foodCount >= 5 ? 10 : foodCount >= 3 ? 5 : 0;
  } else {
    score += Math.min(8, foodCount * 2);
  }

  score += config.diversityBonus;

  return Math.max(0, score);
}

// ── Helpers ──────────────────────────────────────────────────
function deterministicPick(day: number, mealType: string, max: number, seed: number, patientId: string): number {
  let hash = seed;
  for (let i = 0; i < patientId.length; i++) {
    hash = ((hash << 5) - hash) + patientId.charCodeAt(i);
    hash = hash & hash;
  }
  const mealHash = mealType.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const result = (Math.abs(hash) + day * 17 + mealHash * 31) % max;
  return Math.abs(result) % max;
}

function calcScale(baseKcal: number, targetKcal: number): number {
  if (!baseKcal || baseKcal === 0) return 1;
  const raw = targetKcal / baseKcal;
  return Math.round(Math.max(SCALE_MIN, Math.min(SCALE_MAX, raw)) * 100) / 100;
}
