import { Meal, Food, MealItem } from './types';
import { mockMarmitas, mockFoods } from './constants';

/**
 * Engine V3 - Geração de planos controlada
 * Regra: Camada de inteligência determinística que monta a estrutura base 
 * baseada no objetivo, sem destruir o que o usuário já editou.
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string): Meal[] => {
  const generatedId = 'generated-ai-snack';
  
  // Se já existe a refeição gerada, não duplicamos
  if (currentMeals.some(m => m.id === generatedId)) {
    return currentMeals;
  }

  const makeId = () => Math.random().toString(36).substring(2, 10);

  // Inteligência de seleção baseada no objetivo
  const getAISuggestedItems = (goal: string): MealItem[] => {
    if (goal === 'muscle-gain') {
      // Itens proteicos e calóricos
      return [
        { ...mockFoods[4], instanceId: makeId(), quantity: 1, locked: false }, // Whey
        { ...mockFoods[5], instanceId: makeId(), quantity: 1, locked: false }, // Aveia
      ];
    }
    // Default / weight-loss
    return [
      { ...mockFoods[1], instanceId: makeId(), quantity: 1, locked: false }, // Banana
      { ...mockFoods[3], instanceId: makeId(), quantity: 1, locked: false }, // Iogurte
    ];
  };

  const aiMeal: Meal = {
    id: generatedId,
    name: goal === 'muscle-gain' ? 'Lanche Hipertrófico (IA)' : 'Lanche de Controle (IA)',
    items: getAISuggestedItems(goal),
    time: '16:30'
  };

  return [...currentMeals, aiMeal];
};
