import { ClinicalProfile, MacroTargets } from './types';
import { 
  ACTIVITY_MULTIPLIERS, 
  GOAL_KCAL_ADJUSTMENT, 
  CLINICAL_PROTEIN_RANGES, 
  CLINICAL_FAT_RANGE 
} from './constants';

export function calculateTMB(profile: ClinicalProfile): number {
  const { weight, height, age, sex } = profile;
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

export function calculateTDEE(tmb: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  return Math.round(tmb * multiplier);
}

export function calculateTargetKcal(tdee: number, goal: string, sex: 'male' | 'female'): number {
  const adjustment = GOAL_KCAL_ADJUSTMENT[goal] || 0;
  const raw = tdee + adjustment;
  const minKcal = sex === "female" ? 1200 : 1500;
  return Math.max(minKcal, Math.min(3500, raw));
}

export function calculateMacros(kcal: number, goal: string, weight: number): MacroTargets {
  const proteinRange = CLINICAL_PROTEIN_RANGES[goal] || CLINICAL_PROTEIN_RANGES.maintain;
  let protein = Math.round(weight * proteinRange.ideal);
  let fat = Math.round(weight * CLINICAL_FAT_RANGE.ideal);

  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  let carbsKcal = kcal - proteinKcal - fatKcal;

  if (carbsKcal < 0) {
    fat = Math.round(weight * CLINICAL_FAT_RANGE.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }
  if (carbsKcal < 0) {
    protein = Math.round(weight * proteinRange.min);
    carbsKcal = kcal - (protein * 4) - (fat * 9);
  }

  const carbs = Math.max(0, Math.round(carbsKcal / 4));

  return { 
    protein, 
    carbs, 
    fat, 
    calories: Math.round(protein * 4 + carbs * 4 + fat * 9) 
  };
}
