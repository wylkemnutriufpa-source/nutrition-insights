/**
 * 🛡️ SOVEREIGN RULES — FitJourney 2.0
 *
 * ARQUIVO PROTEGIDO — NÃO MODIFICAR SEM REVISÃO ARQUITETURAL
 *
 * Este arquivo define as REGRAS ABSOLUTAS do sistema soberano.
 * Qualquer violação deve gerar erro em desenvolvimento.
 */

export const LEGACY_DENYLIST_FILES = [
  'src/components/MealPlanBuilder.tsx',
  'src/components/MealPlanEditor.tsx',
] as const;

export const LEGACY_DENYLIST_SYMBOLS = [
  'calculatePrimaryTotals',
  'normalizeMealPlan',
  'buildDailyDisplayItems',
  'getBestMealImage',
  'clinicalHumanEngine',
  'generatePlanWithEngine',
  'localGenerateMealPlan',
  'hydrationEngine',
  'runtimeInference',
] as const;

export const SNAPSHOT_REQUIRED_FIELDS = [
  'snapshot_version',
  'publication_id',
  'generated_at',
  'targets',
  'days',
  'daily_totals',
  'clinical_metadata',
] as const;

export const TARGETS_REQUIRED_FIELDS = [
  'kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
] as const;

export const ITEM_REQUIRED_FIELDS = [
  'id',
  'title',
  'quantity_display',
  'macros',
] as const;

export const REALTIME_CHANNEL_RULES = {
  NO_TIMESTAMP_IN_NAME: true,
  REQUIRED_FILTERS: ['onboarding_pipelines', 'nutritionist_patients'] as const,
  MAX_CHANNELS_PER_USER: 6,
} as const;

export const FRONTEND_PASSIVE_RULES = {
  NO_MACRO_CALCULATION: true,
  NO_RUNTIME_INFERENCE: true,
  NO_DYNAMIC_IMAGE_LOOKUP_IN_RENDER: true,
  NO_SNAPSHOT_RECONSTRUCTION: true,
  NO_V2_BRIDGES: true,
  NO_HEALING_LAYERS: true,
  SNAPSHOT_IS_SOURCE_OF_TRUTH: true,
  NO_FRONTEND_RECALC: true,
  NO_PLACEHOLDERS_IN_SNAPSHOT: true,
} as const;

export const CLINICAL_ENGINE_RULES = {
  CALCULATIONS_BACKEND_ONLY: true,
  TEMPLATE_SELECTION_DETERMINISTIC: true,
  CLINICAL_METADATA_PRESERVED: true,
  REVISION_NUMBER_MONOTONIC: true,
  NO_QUERY_N_PLUS_ONE: true,
} as const;

export type SovereignRule = keyof typeof FRONTEND_PASSIVE_RULES | keyof typeof CLINICAL_ENGINE_RULES;

