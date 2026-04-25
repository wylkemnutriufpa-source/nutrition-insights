/**
 * Gerador Assistido de Plano Alimentar — FitJourney Clinical Engine v3.0
 * 
 * ⚠️ DEPRECATED AS STANDALONE GENERATOR (v8.0.0-unified)
 * Este motor NÃO deve ser usado para gerar planos finais independentes.
 * Planos finais devem ser gerados exclusivamente pela Edge Function `generate-meal-plan`
 * (Clinical Nutrition Engine unificado).
 * 
 * Este módulo é mantido APENAS como ferramenta auxiliar do Editor V2:
 * - Geração de opções (Fácil, Equilibrada, Elaborada) para preenchimento do editor
 * - NÃO cria meal_plans, apenas meal_plan_items dentro de um plano existente
 * 
 * Gera 3 opções diferenciadas com:
 * - Refeições realistas com comida brasileira popular
 * - Bloqueio de alimentos caros/importados
 * - Limite de frutas (max 2 por refeição)
 * - Substituições reais por refeição com equivalência macro
 * - Ajuste inteligente de proteína por composição
 * 
 * 100% determinístico. Sem IA generativa.
 */

import { supabase } from "@/integrations/supabase/client";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import type { MealLibraryItem, GeneratedMealSlot } from "./mealPlanAutoGenerator";
import { isBlockedFood, MEAL_LIMITS } from "./mealPlanFoodRules";

// ── Types ────────────────────────────────────────────────────
export type ComplexityTier = "easy" | "balanced" | "elaborate";
export type PlanFocus = "aderencia" | "emagrecimento" | "performance" | "praticidade" | "clinico";
export type ProteinLevel = "leve" | "moderada" | "alta";

export interface FlagWithCatalog {
  id: string;
  flag_key: string;
  display_name: string;
  category: string;
  confidence: number;
}

export interface AssistedPlanParams {
  targetKcal: number;
  mealCount: 3 | 4 | 5 | 6;
  substitutionsPerMeal: 0 | 1 | 2 | 3;
  complexity: ComplexityTier;
  focus: PlanFocus;
  proteinLevel: ProteinLevel;
  rejectedFoods: string[];
  goal: string;
  planType: "normal" | "marmita";
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

export interface MealSubstitution {
  libraryItem: MealLibraryItem;
  targetKcal: number;
  scaleFactor: number;
  compatibilityNote: string;
  macroDeviation: { kcalPct: number; proteinPct: number; carbsPct: number; fatPct: number };
}

export interface GeneratedSlotWithSubs extends GeneratedMealSlot {
  substitutions: MealSubstitution[];
  proteinAdjustment?: { applied: boolean; note: string; originalProtein: number; adjustedProtein: number };
}

export interface GeneratedPlanOption {
  tier: ComplexityTier;
  label: string;
  description: string;
  slots: GeneratedSlotWithSubs[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  substitutionCount: number;
  adherenceScore: number;
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
const SCALE_MIN = 0.5;
const SCALE_MAX = 1.8; // Reduced from 2.2 to prevent absurd quantities

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

// Protein adjustment: only target main meals, adjust protein source portion
const PROTEIN_CONFIG: Record<ProteinLevel, { proteinBoostPct: number; carbReductionPct: number; note: string }> = {
  leve: { proteinBoostPct: -0.10, carbReductionPct: 0.05, note: "proteína levemente reduzida" },
  moderada: { proteinBoostPct: 0, carbReductionPct: 0, note: "" },
  alta: { proteinBoostPct: 0.25, carbReductionPct: -0.08, note: "proteína reforçada para maior saciedade" },
};

const MAIN_MEALS = new Set(["breakfast", "lunch", "dinner"]);

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

// Substitution tolerance bands
const SUB_TOLERANCE = { kcalPct: 0.10, proteinPct: 0.15, carbsPct: 0.15, fatPct: 0.15 };

// ── Load Patient Context ─────────────────────────────────────
export async function loadPatientContext(patientId: string, tenantId?: string | null): Promise<PatientContext> {
  const [anamnesisRes, flagsRes, patientRes, protocolRes] = await Promise.all([
    withTenantFilter(
      supabase
        .from("patient_anamnesis")
        .select("answers, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
        .eq("user_id", patientId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
      tenantId ?? null
    ).maybeSingle(),
    loadPatientFlags(patientId),
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

  const rawRestrictions = answers.restrictions || answers.restricoes || answers.intolerances || [];
  const restrictions = Array.isArray(rawRestrictions) ? rawRestrictions : [rawRestrictions].filter(Boolean);

  const digestiveFlags = flags
    .filter(f => f.category === "digestivo")
    .map(f => f.display_name);

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

async function loadPatientFlags(patientId: string): Promise<FlagWithCatalog[]> {
  try {
    const { data: flags } = await supabase
      .from("patient_clinical_flags")
      .select("id, flag_key, confidence, is_active")
      .eq("patient_id", patientId)
      .eq("is_active", true);

    if (!flags || flags.length === 0) return [];

    const { data: catalog } = await supabase
      .from("clinical_flags_catalog")
      .select("flag_key, display_name, category");

    const catalogMap = new Map((catalog || []).map(c => [c.flag_key, c]));

    return flags.map(f => {
      const cat = catalogMap.get(f.flag_key);
      return {
        id: f.id,
        flag_key: f.flag_key,
        display_name: cat?.display_name || f.flag_key,
        category: cat?.category || "geral",
        confidence: f.confidence ?? 0.5,
      };
    });
  } catch {
    return [];
  }
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

  const { data: rawItems } = await supabase
    .from("meal_library" as any)
    .select("*")
    .eq("is_active", true)
    .eq("plan_type", params.planType); // CRITICAL: Exact type match

  let allItems = (rawItems || []) as unknown as MealLibraryItem[];
  
  // FILTER: Remove items with blocked foods (kefir, salmão, cottage, etc.)
  allItems = allItems.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    return !item.foods.some((f: any) => isBlockedFood(f.name || ""));
  });

  // FILTER: Remove items with excessive fruits (max 2 per meal)
  allItems = allItems.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    const fruitNames = ["banana", "maçã", "mamão", "laranja", "goiaba", "morango", "tangerina", "manga", "melancia", "abacaxi", "uva", "melão"];
    const fruitCount = item.foods.filter((f: any) => {
      const n = (f.name || "").toLowerCase();
      return fruitNames.some(fn => n.includes(fn));
    }).length;
    return fruitCount <= MEAL_LIMITS.maxFruitsPerMeal;
  });

  if (allItems.length === 0) {
    return {
      success: false,
      options: [],
      patientContext: context,
      kcalSuggestion: checkKcalCoherence(params.targetKcal, context),
      warnings: ["Nenhum item na biblioteca de refeições após filtros de qualidade."],
      generatedAt: new Date().toISOString(),
    };
  }

  // Pre-filter by restrictions and rejected foods
  const rejectedLower = [
    ...params.rejectedFoods,
    ...context.restrictions,
  ].map(f => f.toLowerCase());

  const filtered = allItems.filter(item => {
    if (!Array.isArray(item.foods)) return true;
    return !item.foods.some((f: any) =>
      rejectedLower.some(r => f.name?.toLowerCase().includes(r))
    );
  });

  if (filtered.length < 10) {
    warnings.push(`Poucos itens disponíveis após filtros (${filtered.length}). Resultados podem ser limitados.`);
  }

  // Generate 3 tiers
  const tiers: ComplexityTier[] = ["easy", "balanced", "elaborate"];
  const options: GeneratedPlanOption[] = [];

  for (const tier of tiers) {
    const option = generateForTier(tier, params, context, filtered, warnings);
    options.push(option);
  }

  // Final Type Integrity Check
  const allGeneratedSlots = options.flatMap(opt => opt.slots);
  const mixedTypes = allGeneratedSlots.some(s => s.libraryItem.plan_type !== params.planType);
  
  if (mixedTypes) {
    const mismatchDetails = allGeneratedSlots
      .filter(s => s.libraryItem.plan_type !== params.planType)
      .map(s => `${s.libraryItem.title} (${s.libraryItem.plan_type})`)
      .join(", ");
      
    console.error("[ASSISTED] Inconsistência de tipo detectada!", { expected: params.planType });
    
    try {
      const { logAudit } = await import("./auditLog");
      logAudit("plan_type_mismatch", "meal_plan", context.patientId, {
        expected_type: params.planType,
        mismatch_count: allGeneratedSlots.filter(s => s.libraryItem.plan_type !== params.planType).length,
        items: mismatchDetails,
        engine: "assistedPlanGenerator"
      });
    } catch (e) {
      console.error("Erro ao logar auditoria de mismatch", e);
    }
    
    throw new Error(`Inconsistência crítica: O gerador incluiu itens de tipo diferente (${mismatchDetails}). Geração abortada.`);
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
  const proteinCfg = PROTEIN_CONFIG[params.proteinLevel];

  const slots: GeneratedSlotWithSubs[] = [];
  const usageCount: Record<string, number> = {};
  const maxRepeat = tier === "elaborate" ? 1 : tier === "balanced" ? 2 : 3;

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
          const filteredCandidates = candidates.filter(c => c.item.id !== todayLunch.libraryItem.id);
          if (filteredCandidates.length > 0) candidates = filteredCandidates;
        }
      }

      // Pick
      const topN = candidates.slice(0, Math.min(5, candidates.length));
      if (topN.length === 0) {
        console.error(`[ENGINE] Falha ao encontrar item para refeição "${mealType}" do tipo "${params.planType}" na tier ${tier}`);
        // Em vez de fallback silencioso, lançamos erro na tier ou pulamos (pela regra rígida, melhor falhar)
        throw new Error(`Não foi possível encontrar uma refeição válida do tipo "${params.planType}" para o horário: ${mealType} na tier ${tier}`);
      }

      const pickIdx = deterministicPick(day, mealType, topN.length, tierSeed, context.patientId);
      const selected = topN[pickIdx];
      let sf = calcScale(selected.item.base_calories, targetKcal);

      // ── Intelligent protein adjustment (composition-based) ──
      let proteinAdj: GeneratedSlotWithSubs["proteinAdjustment"] = undefined;
      if (MAIN_MEALS.has(mealType) && proteinCfg.proteinBoostPct !== 0) {
        const originalProtein = Math.round(selected.item.protein * sf);
        const boostedProtein = Math.round(originalProtein * (1 + proteinCfg.proteinBoostPct));
        
        // Compensate: reduce carbs slightly when protein increases
        // Don't change scaleFactor — only adjust the protein/carb distribution
        proteinAdj = {
          applied: true,
          note: proteinCfg.note,
          originalProtein,
          adjustedProtein: boostedProtein,
        };
      }

      // ── Generate substitutions ──
      const substitutions = generateSubstitutions(
        selected.item,
        targetKcal,
        sf,
        mealType,
        params.substitutionsPerMeal,
        library,
        context,
        usageCount,
        selected.item.id,
      );

      slots.push({
        day,
        mealType,
        libraryItem: selected.item,
        targetKcal,
        scaleFactor: sf,
        compatibilityScore: selected.score,
        substitutions,
        proteinAdjustment: proteinAdj,
      });
      usageCount[selected.item.id] = (usageCount[selected.item.id] || 0) + 1;
    }
  }

  // Calculate totals with protein adjustments
  let totalKcal = 0, totalP = 0, totalC = 0, totalF = 0;
  for (const s of slots) {
    totalKcal += s.targetKcal;
    const baseSf = s.scaleFactor;
    
    if (s.proteinAdjustment?.applied) {
      totalP += s.proteinAdjustment.adjustedProtein;
      // Compensate carbs to maintain caloric balance
      const proteinDelta = s.proteinAdjustment.adjustedProtein - s.proteinAdjustment.originalProtein;
      const carbReduction = Math.round((proteinDelta * 4) / 4); // Convert protein kcal to carb grams
      totalC += Math.max(0, Math.round(s.libraryItem.carbs * baseSf) - carbReduction);
      totalF += Math.round(s.libraryItem.fat * baseSf);
    } else {
      totalP += Math.round(s.libraryItem.protein * baseSf);
      totalC += Math.round(s.libraryItem.carbs * baseSf);
      totalF += Math.round(s.libraryItem.fat * baseSf);
    }
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
  if (proteinCfg.note) {
    clinicalNotes.push(`Ajuste proteico: ${proteinCfg.note}`);
  }
  if (tier === "easy") {
    clinicalNotes.push("Alimentos simples e acessíveis priorizados para máxima aderência.");
  }
  if (tier === "elaborate") {
    clinicalNotes.push("Maior variedade e sofisticação — recomendado para pacientes altamente engajados.");
  }
  if (params.substitutionsPerMeal > 0) {
    const totalSubs = slots.reduce((acc, s) => acc + s.substitutions.length, 0);
    clinicalNotes.push(`${totalSubs} substituições geradas com equivalência nutricional (±10% kcal, ±15% macros).`);
  }

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
      engine_version: "2.1.0",
      algorithm: "assisted_scored_tiered_v2.1",
      tier,
      patient_goal: params.goal,
      target_calories: params.targetKcal,
      focus: params.focus,
      protein_level: params.proteinLevel,
      complexity: tier,
      flags_considered: clinicalTags.length,
      library_items_used: Object.keys(usageCount).length,
      substitutions_per_meal: params.substitutionsPerMeal,
      generated_at: new Date().toISOString(),
    },
  };
}

// ── Substitution Generator ───────────────────────────────────
function generateSubstitutions(
  primaryItem: MealLibraryItem,
  targetKcal: number,
  primaryScale: number,
  mealType: string,
  count: number,
  library: MealLibraryItem[],
  context: PatientContext,
  usageCount: Record<string, number>,
  excludeId: string,
): MealSubstitution[] {
  if (count === 0) return [];

  const primaryKcal = targetKcal;
  const primaryProtein = Math.round(primaryItem.protein * primaryScale);
  const primaryCarbs = Math.round(primaryItem.carbs * primaryScale);
  const primaryFat = Math.round(primaryItem.fat * primaryScale);

  const rejectedLower = context.restrictions.map(r => r.toLowerCase());

  // Find candidates: same meal_type, not the primary, not restricted
  const candidates = library
    .filter(item => {
      if (item.id === excludeId) return false;
      if (item.meal_type !== mealType) return false;
      // Check restrictions
      if (Array.isArray(item.foods)) {
        const hasRestricted = item.foods.some((f: any) =>
          rejectedLower.some(r => f.name?.toLowerCase().includes(r))
        );
        if (hasRestricted) return false;
      }
      return true;
    })
    .map(item => {
      const sf = calcScale(item.base_calories, targetKcal);
      const scaledKcal = Math.round(item.base_calories * sf);
      const scaledP = Math.round(item.protein * sf);
      const scaledC = Math.round(item.carbs * sf);
      const scaledF = Math.round(item.fat * sf);

      // Calculate deviation percentages
      const kcalDev = primaryKcal > 0 ? Math.abs(scaledKcal - primaryKcal) / primaryKcal : 1;
      const pDev = primaryProtein > 0 ? Math.abs(scaledP - primaryProtein) / primaryProtein : 0;
      const cDev = primaryCarbs > 0 ? Math.abs(scaledC - primaryCarbs) / primaryCarbs : 0;
      const fDev = primaryFat > 0 ? Math.abs(scaledF - primaryFat) / primaryFat : 0;

      // Must be within tolerance
      if (kcalDev > SUB_TOLERANCE.kcalPct) return null;
      if (pDev > SUB_TOLERANCE.proteinPct) return null;
      if (cDev > SUB_TOLERANCE.carbsPct) return null;
      if (fDev > SUB_TOLERANCE.fatPct) return null;

      // Proximity score (lower is better)
      const proximityScore = kcalDev + pDev * 0.4 + cDev * 0.3 + fDev * 0.3;

      return {
        item,
        sf,
        scaledKcal,
        scaledP,
        scaledC,
        scaledF,
        kcalDev,
        pDev,
        cDev,
        fDev,
        proximityScore,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.proximityScore - b.proximityScore);

  const result: MealSubstitution[] = [];
  const usedIds = new Set<string>([excludeId]);

  for (const c of candidates) {
    if (result.length >= count) break;
    if (usedIds.has(c.item.id)) continue;

    // Generate compatibility note
    const note = generateCompatNote(c.item, context, mealType);

    result.push({
      libraryItem: c.item,
      targetKcal: c.scaledKcal,
      scaleFactor: c.sf,
      compatibilityNote: note,
      macroDeviation: {
        kcalPct: Math.round(c.kcalDev * 100),
        proteinPct: Math.round(c.pDev * 100),
        carbsPct: Math.round(c.cDev * 100),
        fatPct: Math.round(c.fDev * 100),
      },
    });
    usedIds.add(c.item.id);
  }

  return result;
}

function generateCompatNote(item: MealLibraryItem, context: PatientContext, _mealType: string): string {
  const notes: string[] = [];

  if (context.restrictions.length > 0) {
    notes.push("compatível com restrições");
  }
  if (context.strategy.includes("low_carb") || context.strategy.includes("cetogen")) {
    if (item.carbs < 20) notes.push("coerente com estratégia low carb");
  }
  if (context.digestiveSymptoms.length > 0) {
    notes.push("melhor tolerância digestiva");
  }

  const goalTag = item.goal_tag || "";
  if (goalTag.includes("weight_loss")) notes.push("foco em emagrecimento");
  else if (goalTag.includes("hypertrophy")) notes.push("foco em hipertrofia");

  if (notes.length === 0) {
    const foodCount = Array.isArray(item.foods) ? item.foods.length : 0;
    notes.push(foodCount <= 3 ? "opção simples e acessível" : "boa variedade nutricional");
  }

  return notes[0] || "equivalência nutricional";
}

// ── Scoring ──────────────────────────────────────────────────
function scoreMealForTier(
  item: MealLibraryItem,
  compatGoals: string[],
  clinicalTags: string[],
  targetKcal: number,
  tier: ComplexityTier,
  config: typeof TIER_CONFIG["easy"],
): number {
  let score = 0;

  const goalIdx = compatGoals.indexOf(item.goal_tag);
  if (goalIdx === 0) score += 40;
  else if (goalIdx === 1) score += 25;
  else if (goalIdx >= 2) score += 10;
  else return 0;

  if (clinicalTags.length > 0 && Array.isArray(item.clinical_tags)) {
    const matches = clinicalTags.filter(t => item.clinical_tags.includes(t)).length;
    score += Math.min(30, matches * 15);
  }

  if (item.base_calories > 0 && targetKcal > 0) {
    const ratio = item.base_calories / targetKcal;
    const proximity = 1 - Math.min(1, Math.abs(ratio - 1));
    score += Math.round(proximity * 20);
  }

  const foodCount = Array.isArray(item.foods) ? item.foods.length : 0;
  if (tier === "easy") {
    // v3: strongly prefer simple meals for "easy" tier
    score += foodCount <= 3 ? 15 : foodCount <= 5 ? 5 : -10;
  } else if (tier === "elaborate") {
    score += foodCount >= 5 ? 10 : foodCount >= 3 ? 5 : 0;
  } else {
    // balanced: prefer moderate complexity
    score += foodCount <= 5 ? 8 : foodCount <= 3 ? 5 : 0;
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
