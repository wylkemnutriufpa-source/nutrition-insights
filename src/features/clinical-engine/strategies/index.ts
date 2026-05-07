import { Meal, Food, MealItem } from '../types/clinical-types';
import { toast } from 'sonner';
import { normalizeFoodMeasurement, recalculateMacros, applyClinicalSafety } from '../utils/foodNormalization';

export interface ClinicalStrategy {
  id: string;
  name: string;
  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[];
  explainDecision(meal: Meal, items: MealItem[]): string;
}

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const makeId = () => Math.random().toString(36).substring(2, 10);

const createMealItem = (food: Food | undefined, quantity: number): MealItem | null => {
  if (!food) return null;
  
  // Step 4: Apply clinical minimums and corrections
  const safeQuantity = applyClinicalSafety(food.name, quantity);
  
  // Step 3: Recalculate macros based on verified database values
  const macros = recalculateMacros(food, safeQuantity);
  
  return {
    ...food,
    ...macros, // Override with recalculated values (NÃO confiar em valores vindos da engine)
    instanceId: makeId(),
    quantity: safeQuantity,
    locked: food.isMarmita || false,
    substitutions: [] // Contrato V3: substitutions sempre array
  };
};

export class FitJourneyStrategy implements ClinicalStrategy {
  id = 'fitjourney_protocol';
  name = 'Protocolo FitJourney';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    const mealName = meal.name.toLowerCase();
    const type = meal.type; // Assumindo que Meal tem 'type' do tipo meal_types definido no prompt
    const scale = baseCalories / 2000;
    let newItems: (MealItem | null)[] = [];

    // Lógica especializada FitJourney: Foco em performance/músculo + Coerência por Tipo
    if (type === 'breakfast' || mealName.includes('café') || mealName.includes('desjejum')) {
      const proteins = shuffleArray(availableFoods.filter(f => ['Whey', 'Ovo', 'Frango', 'Iogurte'].some(w => f.name.includes(w))));
      const carbs = shuffleArray(availableFoods.filter(f => ['Aveia', 'Pão', 'Banana', 'Tapioca'].some(w => f.name.includes(w))));
      newItems = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 40 : 30) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 80 : 50) * scale)
      ];
    } else if (type === 'snack' || mealName.includes('lanche')) {
      const snacks = shuffleArray(availableFoods.filter(f => ['Fruta', 'Iogurte', 'Castanha', 'Barra'].some(w => f.name.includes(w))));
      newItems = [createMealItem(snacks[0], 100 * scale)];
    } else if (['lunch', 'dinner'].includes(type || '') || mealName.includes('almoço') || mealName.includes('jantar')) {
      // 30% de chance de sugerir uma Marmita Fit no FitJourney para praticidade
      if (Math.random() > 0.7) {
        const marmitas = availableFoods.filter(f => f.isMarmita || f.name.toLowerCase().includes('(fit)'));
        if (marmitas.length > 0) {
          const selected = shuffleArray(marmitas)[0];
          return [createMealItem(selected, 1)].filter((i): i is MealItem => i !== null);
        }
      }

      const proteins = shuffleArray(availableFoods.filter(f => ['Frango', 'Patinho', 'Peixe', 'Ovo'].some(w => f.name.includes(w))));
      const carbs = shuffleArray(availableFoods.filter(f => ['Arroz', 'Batata', 'Feijão', 'Macarrão'].some(w => f.name.includes(w))));
      const veggies = shuffleArray(availableFoods.filter(f => ['Brócolis', 'Alface', 'Tomate'].some(w => f.name.includes(w))));
      
      newItems = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 200 : 150) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 250 : 150) * scale),
        createMealItem(veggies[0], 100)
      ];
    } else if (type === 'supper' || mealName.includes('ceia')) {
      const lightProteins = shuffleArray(availableFoods.filter(f => ['Whey', 'Ovo', 'Caseína'].some(w => f.name.includes(w))));
      newItems = [createMealItem(lightProteins[0], 30 * scale)];
    }

    return newItems.filter((i): i is MealItem => i !== null);
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    const hasMarmita = items.some(i => i.isMarmita);
    return hasMarmita 
      ? "Sugerida Marmita Fit para garantir praticidade sem comprometer o aporte de macros."
      : "Priorizado alto valor biológico proteico e carboidratos complexos seguindo as regras de coerência por tipo de refeição (FitJourney).";
  }
}

export class BiquiniBrancoStrategy implements ClinicalStrategy {
  id = 'biquini_branco_protocol';
  name = 'Protocolo Biquini Branco';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    const mealName = meal.name.toLowerCase();
    const scale = baseCalories / 2000;
    let newItems: (MealItem | null)[] = [];

    // Lógica especializada Biquini Branco: Foco em densidade nutricional e anti-inflamatório
    if (mealName.includes('café') || mealName.includes('desjejum')) {
      const seeds = shuffleArray(availableFoods.filter(f => ['Linhaça', 'Chia', 'Aveia', 'Gergelim'].some(w => f.name.includes(w))));
      const fruits = shuffleArray(availableFoods.filter(f => ['Mamão', 'Morango', 'Abacaxi', 'Uva'].some(w => f.name.includes(w))));
      newItems = [
        createMealItem(seeds[0], 20 * scale),
        createMealItem(fruits[0], 100 * scale)
      ];
    } else if (mealName.includes('almoço') || mealName.includes('jantar')) {
      // Biquini Branco prioriza refeições frescas, mas pode sugerir marmitas leves
      if (Math.random() > 0.85) {
        const lightMarmitas = availableFoods.filter(f => (f.isMarmita || f.name.toLowerCase().includes('(fit)')) && f.calories < 350);
        if (lightMarmitas.length > 0) {
          return [createMealItem(shuffleArray(lightMarmitas)[0], 1)].filter((i): i is MealItem => i !== null);
        }
      }

      const veggies = shuffleArray(availableFoods.filter(f => ['Alface', 'Tomate', 'Brócolis', 'Cenoura', 'Pepino'].some(w => f.name.includes(w))));
      const leanProteins = shuffleArray(availableFoods.filter(f => ['Tilápia', 'Frango', 'Peixe', 'Ovo'].some(w => f.name.includes(w))));
      newItems = [
        createMealItem(leanProteins[0], 120 * scale),
        createMealItem(veggies[0], 150)
      ];
    }

    return newItems.filter((i): i is MealItem => i !== null);
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Ajustado para baixo impacto inflamatório e alta densidade de micronutrientes (Biquini Branco).";
  }
}

export class DefaultV3Strategy implements ClinicalStrategy {
  id = 'default_v3';
  name = 'Engine V2 Determinística';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    // Integração com o Motor V2 para a geração de refeições
    const mealName = meal.name.toLowerCase();
    const type = meal.type || (mealName.includes('café') ? 'breakfast' : (mealName.includes('almoço') ? 'lunch' : (mealName.includes('jantar') ? 'dinner' : 'afternoon_snack')));
    
    // Mapeamento de objetivos para o motor V2
    const v2Goal = goal === 'lose-weight' ? 'lose' : (goal === 'muscle-gain' ? 'gain' : 'maintain');
    
    // Pegar template do motor V2
    const { MEAL_TEMPLATES } = require('@/lib/nutrition_engine_v2/templates');
    const template = MEAL_TEMPLATES[type]?.[v2Goal] || MEAL_TEMPLATES[type]?.maintain || [];
    
    // Resolver alimentos contra a base disponível (disponibilizada pelo dataFetcher para o editor)
    const newItems: MealItem[] = [];
    const scale = baseCalories / 2000;

    template.forEach((tItem: any) => {
      const candidates = [tItem.food_name, ...(tItem.aliases || [])];
      let resolvedFood: Food | undefined;
      
      for (const c of candidates) {
        resolvedFood = availableFoods.find(f => f.name.toLowerCase().includes(c.toLowerCase()));
        if (resolvedFood) break;
      }

      if (resolvedFood) {
        const item = createMealItem(resolvedFood, tItem.base_grams * scale);
        if (item) newItems.push(item);
      }
    });

    return newItems;
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Geração determinística via Motor V2 (Seção 4: MEAL_TEMPLATES).";
  }
}
