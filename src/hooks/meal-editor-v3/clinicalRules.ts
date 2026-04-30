import { Food, Meal, ClinicalLog } from './types';
import { QUICK_FOODS, MARMITAS } from './constants';

export interface ClinicalCondition {
  id: string;
  condition_name: string;
  description: string;
  restrictions: string[];
  recommendations: string[];
}

export const CLINICAL_CONDITIONS: ClinicalCondition[] = [
  {
    id: 'gastritis',
    condition_name: 'Gastrite',
    description: 'Evitar irritantes gástricos e café forte',
    restrictions: ['café', 'pimenta', 'fritura', 'chocolate', 'refrigerante'],
    recommendations: ['chá de ervas', 'frutas cozidas', 'purês']
  },
  {
    id: 'vesicula',
    condition_name: 'Vesícula',
    description: 'Dieta hipogordurosa',
    restrictions: ['gordura', 'óleo', 'manteiga', 'fritura', 'carne gorda'],
    recommendations: ['grelhados', 'vegetais no vapor']
  },
  {
    id: 'triglicerideos',
    condition_name: 'Triglicerídeos',
    description: 'Redução de açúcares e carbos simples',
    restrictions: ['açúcar', 'doce', 'farinha branca', 'álcool'],
    recommendations: ['fibras', 'aveia', 'peixe']
  }
];

export const SUBSTITUTION_GROUPS: Record<string, string[]> = {
  'protein_lean': ['q9', 'q1'], 
  'carbs_complex': ['q10', 'q5', 'q4', 'q2'], 
  'fruits': ['q6', 'q7'], 
  'dairy': ['q8', 'q3', 'q14'],
  'beverages': ['q11', 'q12'],
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
      // Regra 1 do Motor de Substituição: Mesma categoria (já garantido pelo group)
      // Regra 2: Calorias e Proteínas próximas (tolerância 25%)
      const calDiff = Math.abs(f.calories - sourceFood.calories) / sourceFood.calories;
      const protDiff = Math.abs(f.protein - sourceFood.protein) / (sourceFood.protein || 1);
      return calDiff < 0.25 && (sourceFood.protein === 0 || protDiff < 0.25);
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
        item.name.toLowerCase().includes(r.toLowerCase())
      );
      if (isRestricted) {
        log.changes.push({
          type: 'removal',
          foodName: item.name,
          reason: `Restrição clínica: ${condition.condition_name}`
        });
        return false;
      }
      return true;
    })
  }));

  return { meals: finalMeals, log };
}
