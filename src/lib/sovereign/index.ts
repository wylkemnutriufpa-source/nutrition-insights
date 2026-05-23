/**
 * 🛡️ FitJourney 2.0 — API Soberana
 *
 * Único ponto de import para tudo relacionado a snapshot soberano.
 *
 * USO CORRETO:
 *   import { useSovereignPlan, SovereignMealItem } from '@/lib/sovereign';
 *
 * USO PROIBIDO:
 *   ❌ import { extractMealsFromSnapshot } direto em componentes
 *   ❌ Ler snapshot.days no componente
 *   ❌ Mapear item.macros.kcal para item.kcal
 *   ❌ Buscar item.visual?.image_url
 */

export type {
  SovereignMealItem,
  SovereignSubstitution,
  SovereignMacros,
  SovereignExtractionResult,
} from './SovereignMealItem';

export {
  extractMealsFromSnapshot,
  filterItemsByDay,
  groupItemsByMeal,
} from './extractMealsFromSnapshot';

export { useSovereignPlan } from './useSovereignPlan';
export type { UseSovereignPlanResult } from './useSovereignPlan';

// 🛡️ SPRINT D: Assertions e regras de proteção arquitetural
export { assertSnapshotIntegrity, assertClinicalMetadataPreserved, assertNotLegacyCode, productionIntegrityCheck } from './invariantAssertions';
export { LEGACY_DENYLIST_FILES, LEGACY_DENYLIST_SYMBOLS, SNAPSHOT_REQUIRED_FIELDS, FRONTEND_PASSIVE_RULES, CLINICAL_ENGINE_RULES } from './sovereignRules';

