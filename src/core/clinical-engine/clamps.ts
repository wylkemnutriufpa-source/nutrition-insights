import { ClinicalProfile, MealItem } from './types';
import { PROTEIN_HARD_CLAMP_FEMALE } from './constants';

export function applyProteinClamp(
  grams: number, 
  item: MealItem, 
  profile: ClinicalProfile
): number {
  if (item.macro_role !== 'protein') return grams;

  if (profile.sex === 'female') {
    // Protein content per 100g
    const proteinDensity = item.macros_per_100g.protein / 100;
    const currentProteinContent = grams * proteinDensity;

    if (currentProteinContent > PROTEIN_HARD_CLAMP_FEMALE) {
      const clampedGrams = Math.floor(PROTEIN_HARD_CLAMP_FEMALE / proteinDensity);
      console.warn(`[ProteinClamp] Clamping female protein item ${item.name} from ${grams}g to ${clampedGrams}g (max ${PROTEIN_HARD_CLAMP_FEMALE}g protein)`);
      return clampedGrams;
    }
  }

  // Male clamp logic could be added here based on role + elasticity
  return grams;
}
