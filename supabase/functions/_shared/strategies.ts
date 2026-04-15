/**
 * Nutrition Strategies — Configuration-only definitions
 * Each strategy defines HOW macros are distributed and WHICH rules apply.
 * No strategy generates plans directly — all use the unified engine pipeline.
 */

export type StrategyId = "ifj_standard" | "bikini_protocol" | "clinical_standard";

export interface NutritionStrategy {
  id: StrategyId;
  name: string;
  version: string;
  description: string;

  /** Calorie adjustment from TDEE (negative = deficit) */
  getCalorieAdjustment: (params: StrategyParams) => number;

  /** Protein multiplier (g/kg) — overrides default if provided */
  getProteinPerKg: (params: StrategyParams) => number | null;

  /** Custom macro distribution percentages (carb%, fat%) — null = use clinical defaults */
  getMacroDistribution: (params: StrategyParams) => { carbPct: number; fatPct: number } | null;

  /** Additional restrictions to inject */
  getExtraRestrictions: (params: StrategyParams) => string[];

  /** Metadata to attach to generation_metadata */
  getMetadata: (params: StrategyParams) => Record<string, unknown>;
}

export interface StrategyParams {
  goal: string;
  weight: number;
  sex: string;
  activityLevel: string;
  bbPhase?: number;
  clinicalFlags?: string[];
  protocolMacroRules?: Record<string, unknown> | null;
}

// ──── BB Phase Configuration ────
const BB_PHASE_CONFIG: Record<number, {
  name: string;
  deficit: number;
  protein_per_kg: number;
  carb_pct: number;
  fat_pct: number;
  carb_timing: string;
}> = {
  1: { name: "Reset Metabólico", deficit: 0, protein_per_kg: 1.8, carb_pct: 0.40, fat_pct: 0.30, carb_timing: "distributed" },
  2: { name: "Déficit Estratégico", deficit: 400, protein_per_kg: 2.0, carb_pct: 0.35, fat_pct: 0.30, carb_timing: "pre_post_training" },
  3: { name: "Definição Corporal", deficit: 500, protein_per_kg: 2.2, carb_pct: 0.30, fat_pct: 0.30, carb_timing: "pre_post_training" },
  4: { name: "Manutenção Inteligente", deficit: 0, protein_per_kg: 1.8, carb_pct: 0.42, fat_pct: 0.28, carb_timing: "distributed" },
};

// ══════════════════════════════════════
// IFJ STANDARD STRATEGY
// ══════════════════════════════════════
export const IFJ_STANDARD: NutritionStrategy = {
  id: "ifj_standard",
  name: "IFJ Standard",
  version: "7.0.0",
  description: "Protocolo padrão FitJourney — visual library exclusive, DB-driven",

  getCalorieAdjustment: (_params) => null as any, // uses GOAL_KCAL_ADJUSTMENT from clinical-macro-engine
  getProteinPerKg: (_params) => null, // uses clinical defaults
  getMacroDistribution: (_params) => null, // uses clinical defaults
  getExtraRestrictions: (_params) => [],
  getMetadata: (_params) => ({
    strategy: "ifj_standard",
    generation_method: "db_exclusive_visual_library_v7_strict",
  }),
};

// ══════════════════════════════════════
// BIKINI PROTOCOL STRATEGY
// ══════════════════════════════════════
export const BIKINI_PROTOCOL: NutritionStrategy = {
  id: "bikini_protocol",
  name: "Biquíni Branco",
  version: "2.1.0",
  description: "Protocolo de transformação corporal em 4 fases com déficit progressivo",

  getCalorieAdjustment: (params) => {
    const phase = params.bbPhase || 1;
    const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];
    return -config.deficit;
  },

  getProteinPerKg: (params) => {
    const phase = params.bbPhase || 1;
    return (BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1]).protein_per_kg;
  },

  getMacroDistribution: (params) => {
    const phase = params.bbPhase || 1;
    const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];
    return { carbPct: config.carb_pct, fatPct: config.fat_pct };
  },

  getExtraRestrictions: (_params) => [],

  getMetadata: (params) => {
    const phase = params.bbPhase || 1;
    const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];
    return {
      strategy: "bikini_protocol",
      bb_phase: phase,
      bb_phase_name: config.name,
      bb_deficit_applied: config.deficit,
      bb_protein_per_kg: config.protein_per_kg,
      bb_carb_timing: config.carb_timing,
      phase_config: {
        protein_multiplier: config.protein_per_kg,
        carb_timing: config.carb_timing,
        carb_pct: config.carb_pct,
        fat_pct: config.fat_pct,
      },
    };
  },
};

// ══════════════════════════════════════
// CLINICAL STANDARD STRATEGY
// ══════════════════════════════════════
export const CLINICAL_STANDARD: NutritionStrategy = {
  id: "clinical_standard",
  name: "Clinical Standard",
  version: "1.0.0",
  description: "Modo clínico avançado com ajustes por flags clínicas e protocolos",

  getCalorieAdjustment: (_params) => null as any, // uses clinical defaults
  getProteinPerKg: (_params) => null, // uses clinical defaults; flags may override in engine

  getMacroDistribution: (_params) => null, // clinical flags handle this

  getExtraRestrictions: (params) => {
    const extras: string[] = [];
    const flags = params.clinicalFlags || [];
    if (flags.includes("hypertension") || flags.includes("cardiovascular_risk")) {
      extras.push("low_sodium");
    }
    return extras;
  },

  getMetadata: (params) => ({
    strategy: "clinical_standard",
    clinicalFlags: params.clinicalFlags || [],
    strictMacroAdherence: true,
  }),
};

// ──── Strategy Registry ────
export const STRATEGY_REGISTRY: Record<StrategyId, NutritionStrategy> = {
  ifj_standard: IFJ_STANDARD,
  bikini_protocol: BIKINI_PROTOCOL,
  clinical_standard: CLINICAL_STANDARD,
};

export function getStrategy(id: StrategyId): NutritionStrategy {
  return STRATEGY_REGISTRY[id] || IFJ_STANDARD;
}

export { BB_PHASE_CONFIG };
