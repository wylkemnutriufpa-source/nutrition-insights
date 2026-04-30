import { Meal, Food } from './types';

/**
 * Engine V3 - Geração de planos controlada
 * Regra: Apenas adiciona refeições (não altera existentes)
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string): Meal[] => {
  // Simulação de engine que adiciona uma refeição baseada no objetivo
  const newId = (currentMeals.length + 1).toString();
  const mealNames: Record<string, string> = {
    'weight-loss': 'Lanche de Emagrecimento',
    'muscle-gain': 'Reforço Hipertrófico',
    'default': 'Nova Refeição'
  };

  const newMeal: Meal = {
    id: newId,
    name: mealNames[goal] || mealNames.default,
    items: [],
    time: '16:00'
  };

  return [...currentMeals, newMeal];
};
