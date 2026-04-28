import { Food, Meal, MealItem } from './useMealEditorV3Store';
import { QUICK_FOODS, MARMITAS } from './constants';

export interface ClinicalCondition {
  id: string;
  condition_name: string; // Changed to match DB
  description: string;
  restrictions: string[];
  recommendations: string[];
}

// Default conditions as fallback
export const CLINICAL_CONDITIONS: ClinicalCondition[] = [
  {
    id: 'gastritis',
    condition_name: 'Gastrite',
    description: 'Evitar irritantes',
    restrictions: ['q8', 'café forte', 'gordura excessiva'],
    recommendations: ['Alimentos cozidos', 'Frutas não ácidas']
  }
];

export const SUBSTITUTION_GROUPS: Record<string, string[]> = {
  'protein_lean': ['q9', 'q1'], // frango, ovo
  'carbs_complex': ['q10', 'q5', 'q4', 'q2'], // arroz, cuscuz, tapioca, pão
  'fruits': ['q6', 'q7'], // banana, maçã
  'dairy': ['q8', 'q3'], // leite, queijo
};

export interface ClinicalLog {
  timestamp: string;
  conditionId: string;
  appliedRules: string[];
  changes: {
    type: 'removal' | 'substitution';
    foodName: string;
    reason: string;
  }[];
}

export function getEquivalentFoods(foodId: string): Food[] {
  const sourceFood = QUICK_FOODS.find(f => f.id === foodId);
  if (!sourceFood) return [];

  const group = Object.values(SUBSTITUTION_GROUPS).find(g => g.includes(foodId));
  if (!group) return [];
  
  return group
    .filter(id => id !== foodId)
    .map(id => QUICK_FOODS.find(f => f.id === id))
    .filter((f): f is Food => !!f)
    .filter(f => {
      // Equivalência nutricional real: tolerância de 20% nas calorias e proteínas
      const calDiff = Math.abs(f.calories - sourceFood.calories) / sourceFood.calories;
      const protDiff = Math.abs(f.protein - sourceFood.protein) / (sourceFood.protein || 1);
      return calDiff < 0.2 && protDiff < 0.2;
    });
}

export function applyClinicalRules(meals: Meal[], conditionId: string): { meals: Meal[], log: ClinicalLog } {
  const condition = CLINICAL_CONDITIONS.find(c => c.id === conditionId);
  const log: ClinicalLog = {
    timestamp: new Date().toISOString(),
    conditionId,
    appliedRules: condition ? [...condition.restrictions, ...condition.recommendations] : [],
    changes: []
  };

  if (!condition) return { meals, log };

  const finalMeals = meals.map(meal => ({
    ...meal,
    items: meal.items.filter(item => {
      const isRestricted = condition.restrictions.some(r => 
        item.id === r || item.name.toLowerCase().includes(r.toLowerCase())
      );
      if (isRestricted) {
        log.changes.push({
          type: 'removal',
          foodName: item.name,
          reason: `Restrição da condição: ${condition.condition_name}`
        });
        return false;
      }
      return true;
    })
  }));

  return { meals: finalMeals, log };
}
