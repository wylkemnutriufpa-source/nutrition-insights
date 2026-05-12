import { ClinicalProfile, MacroTargets } from './types';

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
  gain_weight: 500,
  improve_health: -200,
  athletic_performance: 200,
};

export const CLINICAL_PROTEIN_RANGES: Record<string, { min: number; max: number; ideal: number }> = {
  lose_weight:          { min: 1.6, max: 2.2, ideal: 2.0 },
  improve_health:       { min: 1.4, max: 2.0, ideal: 1.6 },
  maintain:             { min: 1.4, max: 2.0, ideal: 1.6 },
  gain_muscle:          { min: 1.8, max: 2.5, ideal: 2.2 },
  gain_weight:          { min: 1.8, max: 2.5, ideal: 2.2 },
  athletic_performance: { min: 1.6, max: 2.2, ideal: 2.0 },
};

export const CLINICAL_FAT_RANGE = { min: 0.8, max: 1.0, ideal: 0.9 };

export const PROTEIN_HARD_CLAMP_FEMALE = 150; // grams per meal (lunch/dinner)
