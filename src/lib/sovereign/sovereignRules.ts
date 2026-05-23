/**
 * 🛡️ SOVEREIGN RULES — FitJourney 2.0
 *
 * ARQUIVO PROTEGIDO — NÃO MODIFICAR SEM REVISÃO ARQUITETURAL
 *
 * Este arquivo define as REGRAS ABSOLUTAS do sistema soberano.
 * Qualquer violação deve gerar erro em desenvolvimento.
 *
 * ARQUITETURA SOBERANA: SNAPSHOT → RENDER
 * Frontend NUNCA pensa, NUNCA calcula, NUNCA normaliza.
 */

// ════════════════════════════════════════════════════════════════════
// DENYLIST — ARQUIVOS/SÍMBOLOS QUE NÃO DEVEM EXISTIR
// ════════════════════════════════════════════════════════════════════

/** Arquivos legados que foram deliberadamente deletados e NÃO devem ser recriados */
export const LEGACY_DENYLIST_FILES = [
  'src/components/MealPlanBuilder.tsx',        // Deletado Sprint 1 — cálculos manuais
  'src/components/MealPlanEditor.tsx',         // Deletado Sprint 1 — editor legado
  // Nota: src/lib/legacy/*.ts são STUBS (passthrough), não estão na denylist
] as const;

/** Símbolos/funções que NÃO devem ter lógica ativa de negócio */
export const LEGACY_DENYLIST_SYMBOLS = [
  'calculatePrimaryTotals',   // Calculador de macros no frontend
  'normalizeMealPlan',        // Normalizador legado (deve ser passthrough)
  'buildDailyDisplayItems',   // Builder de display legado
  'getBestMealImage',         // Busca dinâmica de imagem em runtime
  'clinicalHumanEngine',      // Engine clínico no frontend
  'generatePlanWithEngine',   // Geração procedural no frontend
  'localGenerateMealPlan',    // Geração local no frontend
] as const;

// ════════════════════════════════════════════════════════════════════
// REGRAS DE SNAPSHOT SOBERANO
// ════════════════════════════════════════════════════════════════════

/** Campos obrigatórios em qualquer SovereignSnapshotV3 publicado */
export const SNAPSHOT_REQUIRED_FIELDS = [
  'snapshot_version',
  'publication_id',
  'generated_at',
  'targets',
  'days',
  'daily_totals',
] as const;

/** Campos obrigatórios nos targets */
export const TARGETS_REQUIRED_FIELDS = [
  'kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
] as const;

/** Campos obrigatórios em cada item do snapshot */
export const ITEM_REQUIRED_FIELDS = [
  'id',
  'title',
  'quantity_display',
  'macros',
] as const;

// ════════════════════════════════════════════════════════════════════
// REGRAS DE REALTIME
// ════════════════════════════════════════════════════════════════════

/** Nomes de canal NUNCA devem conter Date.now() ou timestamps */
export const REALTIME_CHANNEL_RULES = {
  NO_TIMESTAMP_IN_NAME: true,
  REQUIRED_FILTERS: ['onboarding_pipelines', 'nutritionist_patients'] as const,
  MAX_CHANNELS_PER_USER: 6,
} as const;

// ════════════════════════════════════════════════════════════════════
// REGRAS DO FRONTEND PASSIVO
// ════════════════════════════════════════════════════════════════════

/**
 * O frontend NUNCA pode:
 * - Calcular macros
 * - Inferir imagens dinamicamente no render
 * - Normalizar estrutura em runtime
 * - Reconstruir snapshots
 * - Usar engines locais de geração
 */
export const FRONTEND_PASSIVE_RULES = {
  NO_MACRO_CALCULATION: true,
  NO_RUNTIME_INFERENCE: true,
  NO_DYNAMIC_IMAGE_LOOKUP_IN_RENDER: true,
  NO_SNAPSHOT_RECONSTRUCTION: true,
  NO_V2_BRIDGES: true,
  NO_HEALING_LAYERS: true,
  SNAPSHOT_IS_SOURCE_OF_TRUTH: true,
} as const;

// ════════════════════════════════════════════════════════════════════
// REGRAS DO MOTOR CLÍNICO
// ════════════════════════════════════════════════════════════════════

export const CLINICAL_ENGINE_RULES = {
  /** Todo cálculo de TMB/TDEE é backend-only via RPC */
  CALCULATIONS_BACKEND_ONLY: true,
  /** Template selection é determinística (mesmo input = mesmo output) */
  TEMPLATE_SELECTION_DETERMINISTIC: true,
  /** clinical_metadata NUNCA é sobrescrito, apenas enriquecido */
  CLINICAL_METADATA_PRESERVED: true,
  /** revision_number sempre incrementa, nunca reseta */
  REVISION_NUMBER_MONOTONIC: true,
} as const;

export type SovereignRule = keyof typeof FRONTEND_PASSIVE_RULES | keyof typeof CLINICAL_ENGINE_RULES;
