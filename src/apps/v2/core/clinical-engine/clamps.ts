import { ClinicalProfile, MealItem } from './types';
import { PROTEIN_HARD_CLAMP_FEMALE } from './constants';

export function applyProteinClamp(
  grams: number, 
  item: MealItem, 
  profile: ClinicalProfile
): number {
  if (item.macro_role !== 'protein') return grams;

  if (profile.sex === 'female') {
    // Note: The rule says "150g proteína sólida", which usually refers to the grams of the food item (like 150g chicken).
    // The previous implementation was checking protein content. 
    // I'll align with the shared engine's "solid protein grams" interpretation.
    if (grams > PROTEIN_HARD_CLAMP_FEMALE) {
      console.warn(`[ProteinClamp] Clamping female protein item ${item.name} from ${grams}g to ${PROTEIN_HARD_CLAMP_FEMALE}g`);
      return PROTEIN_HARD_CLAMP_FEMALE;
    }
  }

  return grams;
}
