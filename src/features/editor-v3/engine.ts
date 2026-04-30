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

const createMealItem = (food: Food | undefined, quantity: number): MealItem | null => {
  if (!food) return null;
  return {
    ...food,
    instanceId: makeId(),
    quantity: Math.round(quantity),
    locked: food.isMarmita || false
  };
};

/**
 * Gera uma composição para uma refeição específica baseada no seu contexto (nome/horário)
 */
export const generateMealWithEngine = (meal: Meal, goal: string, baseCalories: number = 2000): MealItem[] => {
  const mealName = meal.name.toLowerCase();
  let items: (MealItem | null)[] = [];
  
  // Fator de escala calórica baseado na base de 2000kcal
  const scale = baseCalories / 2000;
  
  // Café da Manhã
  if (mealName.includes('café') || mealName.includes('desjejum')) {
    const carbs = shuffleArray(mockFoods.filter(f => ['Pão', 'Aveia', 'Fruta', 'Banana', 'Maçã', 'Tapioca'].some(word => f.name.includes(word))));
    const proteins = shuffleArray(mockFoods.filter(f => ['Ovo', 'Whey', 'Iogurte', 'Queijo', 'Frango'].some(word => f.name.includes(word))));
    
    if (goal === 'ketogenic') {
      items = [
        createMealItem(proteins.find(p => p.name.includes('Ovo')), 3 * scale),
        createMealItem(proteins.find(p => p.name.includes('Queijo')), 30 * scale)
      ];
    } else {
      items = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 3 : 2) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 80 : 50) * scale),
        createMealItem(carbs[1] || carbs[0], 1)
      ];
    }
  }

  // Almoço / Jantar
  else if (mealName.includes('almoço') || mealName.includes('jantar')) {
    const carbs = shuffleArray(mockFoods.filter(f => ['Arroz', 'Batata', 'Macarrão', 'Feijão', 'Quinoa'].some(word => f.name.includes(word))));
    const proteins = shuffleArray(mockFoods.filter(f => ['Frango', 'Carne', 'Peixe', 'Ovo', 'Patinho'].some(word => f.name.includes(word))));
    const veggies = shuffleArray(mockFoods.filter(f => ['Alface', 'Tomate', 'Brócolis', 'Cenoura'].some(word => f.name.includes(word))));

    if (goal === 'ketogenic') {
      items = [
        createMealItem(proteins[0], 200 * scale),
        createMealItem(veggies[0], 100),
        createMealItem(mockFoods.find(f => f.name.includes('Azeite')), 10 * scale)
      ];
    } else if (goal === 'low-carb') {
      items = [
        createMealItem(proteins[0], 180 * scale),
        createMealItem(carbs[0], 80 * scale),
        createMealItem(veggies[0], 100)
      ];
    } else {
      items = [
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 250 : 150) * scale),
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 180 : 120) * scale),
        createMealItem(carbs[1] || carbs[0], 100 * scale)
      ];
    }
  }

  // Lanches
  else if (mealName.includes('lanche') || mealName.includes('ceia')) {
    const snacks = shuffleArray(mockFoods.filter(f => ['Fruta', 'Iogurte', 'Aveia', 'Whey', 'Castanha', 'Pasta de Amendoim'].some(word => f.name.includes(word))));
    
    if (goal === 'ketogenic') {
      items = [
        createMealItem(snacks.find(s => s.name.includes('Castanha')), 30 * scale),
        createMealItem(snacks.find(s => s.name.includes('Amendoim')), 20 * scale)
      ];
    } else {
      items = [
        createMealItem(snacks[0], (goal === 'muscle-gain' ? 2 : 1) * scale),
        createMealItem(snacks[1], 1)
      ];
    }
  }

  // Fallback se nada foi gerado
  if (items.length === 0 || items.every(i => i === null)) {
    const randoms = shuffleArray(mockFoods).slice(0, 2);
    items = [createMealItem(randoms[0], 100 * scale)];
  }

  return items.filter((i): i is MealItem => i !== null);
};

/**
 * Gera um plano completo distribuindo alimentos em todas as refeições vazias
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string, baseCalories: number = 2000): Meal[] => {
  return currentMeals.map(meal => {
    // Só geramos para refeições vazias para evitar sobrescrever trabalho do usuário
    if (meal.items.length === 0) {
      return {
        ...meal,
        items: generateMealWithEngine(meal, goal, baseCalories)
      };
    }
    return meal;
  });
};
