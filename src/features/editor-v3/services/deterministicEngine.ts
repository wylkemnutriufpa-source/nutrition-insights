/**
 * FitJourney 2.0 — MOTOR DETERMINÍSTICO CENTRAL
 * 
 * Re-exporta a única verdade metabólica a partir de '@/lib/deterministicEngine'
 * para preservar imports e evitar breaking changes.
 */

export type {
  Gender,
  ActivityLevel,
  Goal,
  MetabolicProfile,
  MetabolicResult
} from '@/lib/deterministicEngine';

export {
  calculateTMB,
  solveMetabolicProfile
} from '@/lib/deterministicEngine';
