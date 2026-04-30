import { Meal, Food, MealItem } from './types';
import { mockMarmitas, mockFoods } from './constants';

const makeId = () => Math.random().toString(36).substring(2, 10);

/**
 * Engine V3 - Inteligência Determinística
 * Camada de montagem de planos baseada em regras nutricionais.
 */

// Helper para selecionar alimentos por tipo
const getFoodByName = (name: string) => mockFoods.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
const getMarmitaByName = (name: string) => mockMarmitas.find(m => m.name.toLowerCase().includes(name.toLowerCase()));

const createMealItem = (food: Food, quantity: number): MealItem => ({
  ...food,
  instanceId: makeId(),
  quantity,
  locked: food.isMarmita || false
});

/**
 * Gera uma composição para uma refeição específica baseada no seu contexto (nome/horário)
 */
export const generateMealWithEngine = (meal: Meal, goal: string): MealItem[] => {
  const mealName = meal.name.toLowerCase();
  
  // Café da Manhã
  if (mealName.includes('café') || mealName.includes('desjejum')) {
    const ovo = getFoodByName('Ovo cozido');
    const pao = getFoodByName('Pão integral');
    const banana = getFoodByName('Banana');
    
    if (goal === 'muscle-gain') {
      return [
        createMealItem(ovo!, 3),
        createMealItem(pao!, 2),
        createMealItem(banana!, 1)
      ];
    }
    return [
      createMealItem(ovo!, 2),
      createMealItem(pao!, 1),
      createMealItem(banana!, 1)
    ];
  }

  // Almoço / Jantar
  if (mealName.includes('almoço') || mealName.includes('jantar')) {
    if (goal === 'muscle-gain') {
      const arroz = getFoodByName('Arroz branco');
      const frango = getFoodByName('Frango grelhado');
      const feijao = getFoodByName('Feijão carioca');
      return [
        createMealItem(arroz!, 200),
        createMealItem(frango!, 150),
        createMealItem(feijao!, 100)
      ];
    }
    // Para perda de peso, sugerimos uma marmita de controle ou porções menores
    const marmita = getMarmitaByName('Peixe Grelhado');
    return [createMealItem(marmita!, 1)];
  }

  // Lanches
  if (mealName.includes('lanche') || mealName.includes('ceia')) {
    const whey = getFoodByName('Whey protein');
    const aveia = getFoodByName('Aveia');
    const iogurte = getFoodByName('Iogurte');
    
    if (goal === 'muscle-gain') {
      return [
        createMealItem(whey!, 1),
        createMealItem(aveia!, 2),
        createMealItem(iogurte!, 1)
      ];
    }
    return [
      createMealItem(iogurte!, 1),
      createMealItem(aveia!, 1)
    ];
  }

  // Fallback
  return [createMealItem(getFoodByName('Banana')!, 1)];
};

/**
 * Gera um plano completo distribuindo alimentos em todas as refeições vazias
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string): Meal[] => {
  return currentMeals.map(meal => {
    // Só geramos para refeições vazias para evitar sobrescrever trabalho do usuário
    // A lógica de "substituir tudo" será tratada no useEditorState limpando antes
    if (meal.items.length === 0) {
      return {
        ...meal,
        items: generateMealWithEngine(meal, goal)
      };
    }
    return meal;
  });
};
