import { Food, Meal, MealItem } from './useMealEditorV3Store';
import { QUICK_FOODS, MARMITAS } from './constants';

export interface ClinicalCondition {
  id: string;
  name: string;
  restrictions: string[];
  recommendations: string[];
}

export const CLINICAL_CONDITIONS: ClinicalCondition[] = [
  {
    id: 'gastritis',
    name: 'Gastrite',
    restrictions: ['q8', 'café forte', 'gordura excessiva'],
    recommendations: ['Alimentos cozidos', 'Frutas não ácidas']
  },
  {
    id: 'triglycerides',
    name: 'Triglicerídeos Altos',
    restrictions: ['açúcar', 'farinha branca'],
    recommendations: ['Fibras', 'Peixes', 'q10 integral']
  },
  {
    id: 'liver_fat',
    name: 'Gordura no Fígado',
    restrictions: ['fritura', 'álcool', 'açúcar'],
    recommendations: ['Vegetais verdes', 'Proteínas magras']
  },
  {
    id: 'lactating',
    name: 'Lactantes',
    restrictions: [],
    recommendations: ['Aumento calórico', 'Hidratação', 'q8', 'q6']
  }
];

export const SUBSTITUTION_GROUPS: Record<string, string[]> = {
  'protein_lean': ['q9', 'q1'], // frango, ovo
  'carbs_complex': ['q10', 'q5', 'q4', 'q2'], // arroz, cuscuz, tapioca, pão
  'fruits': ['q6', 'q7'], // banana, maçã
  'dairy': ['q8', 'q3'], // leite, queijo
};

export function getEquivalentFoods(foodId: string): Food[] {
  const group = Object.values(SUBSTITUTION_GROUPS).find(g => g.includes(foodId));
  if (!group) return [];
  
  return group
    .filter(id => id !== foodId)
    .map(id => QUICK_FOODS.find(f => f.id === id))
    .filter((f): f is Food => !!f);
}

export function applyClinicalRules(meals: Meal[], conditionId: string): Meal[] {
  const condition = CLINICAL_CONDITIONS.find(c => c.id === conditionId);
  if (!condition) return meals;

  return meals.map(meal => ({
    ...meal,
    items: meal.items.filter(item => !condition.restrictions.includes(item.id))
  }));
}
