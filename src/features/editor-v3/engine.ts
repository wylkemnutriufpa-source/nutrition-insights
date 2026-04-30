import { Meal, Food, MealItem } from './types';
import { mockMarmitas, mockFoods } from './constants';

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const makeId = () => Math.random().toString(36).substring(2, 10);

/**
 * Engine V3 - Inteligência Determinística
 * Camada de montagem de planos baseada em regras nutricionais.
 */

// Helper para selecionar alimentos por tipo
const getFoodByName = (name: string) => mockFoods.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
const getMarmitaByName = (name: string) => mockMarmitas.find(m => m.name.toLowerCase().includes(name.toLowerCase()));

const getRandomFood = (count: number = 1) => shuffleArray(mockFoods).slice(0, count);
const getRandomMarmita = (count: number = 1) => shuffleArray(mockMarmitas).slice(0, count);

const createMealItem = (food: Food | undefined, quantity: number): MealItem | null => {
  if (!food) return null;
  return {
    ...food,
    instanceId: makeId(),
    quantity,
    locked: food.isMarmita || false
  };
};

/**
 * Gera uma composição para uma refeição específica baseada no seu contexto (nome/horário)
 */
export const generateMealWithEngine = (meal: Meal, goal: string): MealItem[] => {
  const mealName = meal.name.toLowerCase();
  let items: (MealItem | null)[] = [];
  
  // Café da Manhã
  if (mealName.includes('café') || mealName.includes('desjejum')) {
    const carbs = shuffleArray(mockFoods.filter(f => ['Pão', 'Aveia', 'Fruta', 'Banana', 'Maçã'].some(word => f.name.includes(word))));
    const proteins = shuffleArray(mockFoods.filter(f => ['Ovo', 'Whey', 'Iogurte', 'Queijo'].some(word => f.name.includes(word))));
    
    items = [
      createMealItem(proteins[0], goal === 'muscle-gain' ? 3 : 2),
      createMealItem(carbs[0], goal === 'muscle-gain' ? 2 : 1),
      createMealItem(carbs[1], 1)
    ];
  }

  // Almoço / Jantar
  else if (mealName.includes('almoço') || mealName.includes('jantar')) {
    if (goal === 'muscle-gain' || Math.random() > 0.5) {
      const carbs = shuffleArray(mockFoods.filter(f => ['Arroz', 'Batata', 'Macarrão', 'Feijão'].some(word => f.name.includes(word))));
      const proteins = shuffleArray(mockFoods.filter(f => ['Frango', 'Carne', 'Peixe', 'Ovo'].some(word => f.name.includes(word))));
      
      items = [
        createMealItem(carbs[0], 200),
        createMealItem(proteins[0], 150),
        createMealItem(carbs[1] || carbs[0], 100)
      ];
    } else {
      const randomMarmitas = getRandomMarmita(2);
      items = [createMealItem(randomMarmitas[0], 1)];
    }
  }

  // Lanches
  else if (mealName.includes('lanche') || mealName.includes('ceia')) {
    const snacks = shuffleArray(mockFoods.filter(f => ['Fruta', 'Iogurte', 'Aveia', 'Whey', 'Castanha'].some(word => f.name.includes(word))));
    
    items = [
      createMealItem(snacks[0], goal === 'muscle-gain' ? 2 : 1),
      createMealItem(snacks[1], 1)
    ];
  }

  // Fallback se nada foi gerado
  if (items.length === 0 || items.every(i => i === null)) {
    const randoms = getRandomFood(2);
    items = [createMealItem(randoms[0], 1)];
  }

  return items.filter((i): i is MealItem => i !== null);
};

/**
 * Gera um plano completo distribuindo alimentos em todas as refeições vazias
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string): Meal[] => {
  return currentMeals.map(meal => {
    // Só geramos para refeições vazias para evitar sobrescrever trabalho do usuário
    if (meal.items.length === 0) {
      return {
        ...meal,
        items: generateMealWithEngine(meal, goal)
      };
    }
    return meal;
  });
};
