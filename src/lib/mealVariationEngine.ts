import { getSubstitutionsFor } from "./mealPlanFoodRules";

export interface FoodVariation {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Generates variations for a base food while maintaining similar macros.
 */
export function generateVariations(baseName: string, count: number): string[] {
  const alts = getSubstitutionsFor(baseName);
  // Shuffle and pick
  const shuffled = [...alts].sort(() => 0.5 - Math.random());
  return [baseName, ...shuffled].slice(0, count);
}

/**
 * Specific variation logic for typical Brazilian meals as requested.
 */
const VARIATION_GROUPS: Record<string, string[]> = {
  "Frango": ["Frango", "Tilápia", "Carne moída", "Omelete", "Sobrecoxa"],
  "Arroz": ["Arroz", "Batata Doce", "Cuscuz", "Macarrão", "Mandioca"],
  "Feijão": ["Feijão", "Lentilha", "Grão de bico"],
  "Pão": ["Pão francês", "Tapioca", "Cuscuz", "Pão integral"],
  "Ovo": ["Ovo", "Queijo coalho", "Omelete", "Frango desfiado"],
  "Banana": ["Banana", "Mamão", "Maçã", "Pera", "Melão"],
};

function findGroup(name: string): string[] | null {
  for (const [key, variants] of Object.entries(VARIATION_GROUPS)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
      return variants;
    }
  }
  return null;
}

export function getVariedFoodName(baseName: string, dayIndex: number): string {
  const group = findGroup(baseName);
  if (!group) return baseName;
  return group[dayIndex % group.length];
}
