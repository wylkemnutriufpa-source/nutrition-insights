import { Meal, Food, MealItem } from './types';
import { PlanMetadata, validatePlanClinically } from './utils/nutritionalEvaluator';
import { ValidationIssue } from './nutritionalScoreTypes';
import { isProtein, isCarb, isFruit, calculateItemMacros } from './utils/v3Motor';
import { toast } from 'sonner';

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
export const generateMealWithEngine = (meal: Meal, goal: string, baseCalories: number = 2000, availableFoods: Food[] = []): MealItem[] => {
  if (!availableFoods || availableFoods.length < 10) {
    console.error('[Engine V3] Bloqueio de execução: Base de alimentos insuficiente.', { count: availableFoods?.length });
    toast.error('Base de dados insuficiente para gerar sugestões. Tente recarregar a página.');
    return meal.items;
  }

  const mealName = meal.name.toLowerCase();
  const existingNames = meal.items.map(i => i.name.toLowerCase());
  let newItems: (MealItem | null)[] = [];
  
  // Fator de escala calórica baseado na base de 2000kcal
  const scale = baseCalories / 2000;
  
  // Café da Manhã
  if (mealName.includes('café') || mealName.includes('desjejum')) {
    const carbs = shuffleArray(availableFoods.filter(f => ['Pão', 'Aveia', 'Fruta', 'Banana', 'Maçã', 'Tapioca'].some(word => f.name.includes(word))));
    const proteins = shuffleArray(availableFoods.filter(f => ['Ovo', 'Whey', 'Iogurte', 'Queijo', 'Frango'].some(word => f.name.includes(word))));
    
    if (goal === 'ketogenic') {
      newItems = [
        createMealItem(proteins.find(p => p.name.includes('Ovo')), 3 * scale),
        createMealItem(proteins.find(p => p.name.includes('Queijo')), 30 * scale)
      ];
    } else {
      newItems = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 3 : 2) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 80 : 50) * scale),
        createMealItem(carbs[1] || carbs[0], 1)
      ];
    }
  }

  // Almoço / Jantar
  else if (mealName.includes('almoço') || mealName.includes('jantar')) {
    const carbs = shuffleArray(availableFoods.filter(f => ['Arroz', 'Batata', 'Macarrão', 'Feijão', 'Quinoa'].some(word => f.name.includes(word))));
    const proteins = shuffleArray(availableFoods.filter(f => ['Frango', 'Carne', 'Peixe', 'Ovo', 'Patinho'].some(word => f.name.includes(word))));
    const veggies = shuffleArray(availableFoods.filter(f => ['Alface', 'Tomate', 'Brócolis', 'Cenoura'].some(word => f.name.includes(word))));

    if (goal === 'ketogenic') {
      newItems = [
        createMealItem(proteins[0], 200 * scale),
        createMealItem(veggies[0], 100),
        createMealItem(availableFoods.find(f => f.name.includes('Azeite')), 10 * scale)
      ];
    } else if (goal === 'low-carb') {
      newItems = [
        createMealItem(proteins[0], 180 * scale),
        createMealItem(carbs[0], 80 * scale),
        createMealItem(veggies[0], 100)
      ];
    } else {
      newItems = [
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 250 : 150) * scale),
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 180 : 120) * scale),
        createMealItem(carbs[1] || carbs[0], 100 * scale)
      ];
    }
  }

  // Lanches
  else if (mealName.includes('lanche') || mealName.includes('ceia')) {
    const snacks = shuffleArray(availableFoods.filter(f => ['Fruta', 'Iogurte', 'Aveia', 'Whey', 'Castanha', 'Pasta de Amendoim'].some(word => f.name.includes(word))));
    
    if (goal === 'ketogenic') {
      newItems = [
        createMealItem(snacks.find(s => s.name.includes('Castanha')), 30 * scale),
        createMealItem(snacks.find(s => s.name.includes('Amendoim')), 20 * scale)
      ];
    } else {
      newItems = [
        createMealItem(snacks[0], (goal === 'muscle-gain' ? 2 : 1) * scale),
        createMealItem(snacks[1], 1)
      ];
    }
  }

  // Fallback se nada foi gerado
  if (newItems.length === 0 || newItems.every(i => i === null)) {
    const randoms = shuffleArray(availableFoods).slice(0, 2);
    newItems = [createMealItem(randoms[0], 100 * scale)];
  }

  const filteredItems = newItems.filter((i): i is MealItem => i !== null && !existingNames.includes(i.name.toLowerCase()));
  return [...meal.items, ...filteredItems];
};

/**
 * Gera um plano completo distribuindo alimentos em todas as refeições vazias
 */
export const generatePlanWithEngine = (currentMeals: Meal[], goal: string, baseCalories: number = 2000, availableFoods: Food[] = []): Meal[] => {
  if (!availableFoods || availableFoods.length < 10) {
    console.error('[Engine V3] Bloqueio de Plano: Base insuficiente.');
    toast.error('Erro: Motor desativado por falta de dados clínicos.');
    return currentMeals;
  }

  return currentMeals.map(meal => {
    // Para plano global, ainda usamos lógica de preencher apenas vazias ou complementar se solicitado
    // mas a engine agora nativamente complementa
    if (meal.items.length === 0) {
      return {
        ...meal,
        items: generateMealWithEngine(meal, goal, baseCalories, availableFoods)
      };
    }
    return meal;
  });
};