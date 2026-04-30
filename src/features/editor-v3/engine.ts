import { Meal, Food } from './types';

/**
 * Engine V3 - Geração de planos controlada
 * Regra: Apenas adiciona refeições (não altera existentes)
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string): Meal[] => {
  // Engine determinística: Cria um ID fixo para evitar duplicação em múltiplos cliques
  const generatedId = 'generated-v3';
  
  if (currentMeals.some(m => m.id === generatedId)) {
    return currentMeals;
  }

  const mealNames: Record<string, string> = {
    'weight-loss': 'Lanche de Emagrecimento',
    'muscle-gain': 'Reforço Hipertrófico',
    'default': 'Nova Refeição'
  };

  const newMeal: Meal = {
    id: generatedId,
    name: mealNames[goal] || mealNames.default,
    items: [],
    time: '16:00'
  };

  return [...currentMeals, newMeal];
};
