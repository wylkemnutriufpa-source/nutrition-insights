import { Meal, Food, MealItem } from '../types/clinical-types';
import { toast } from 'sonner';

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
  return {
    ...food,
    instanceId: makeId(),
    quantity: Math.round(quantity),
    locked: food.isMarmita || false
  };
};

export class FitJourneyStrategy implements ClinicalStrategy {
  id = 'fitjourney_protocol';
  name = 'Protocolo FitJourney';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    const mealName = meal.name.toLowerCase();
    const scale = baseCalories / 2000;
    let newItems: (MealItem | null)[] = [];

    // Lógica especializada FitJourney: Foco em performance/músculo
    if (mealName.includes('café') || mealName.includes('desjejum')) {
      const proteins = shuffleArray(availableFoods.filter(f => ['Whey', 'Ovo', 'Frango', 'Iogurte'].some(w => f.name.includes(w))));
      const carbs = shuffleArray(availableFoods.filter(f => ['Aveia', 'Pão', 'Banana', 'Tapioca'].some(w => f.name.includes(w))));
      newItems = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 40 : 30) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 80 : 50) * scale)
      ];
    } else if (mealName.includes('almoço') || mealName.includes('jantar')) {
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
      newItems = [
        createMealItem(proteins[0], (goal === 'muscle-gain' ? 200 : 150) * scale),
        createMealItem(carbs[0], (goal === 'muscle-gain' ? 250 : 150) * scale)
      ];
    }

    return newItems.filter((i): i is MealItem => i !== null);
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    const hasMarmita = items.some(i => i.isMarmita);
    return hasMarmita 
      ? "Sugerida Marmita Fit para garantir praticidade sem comprometer o aporte de macros."
      : "Priorizado alto valor biológico proteico e carboidratos complexos para otimização metabólica (FitJourney).";
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
      const seeds = shuffleArray(availableFoods.filter(f => ['Linhaça', 'Chia', 'Aveia'].some(w => f.name.includes(w))));
      const fruits = shuffleArray(availableFoods.filter(f => ['Mamão', 'Morango', 'Abacaxi'].some(w => f.name.includes(w))));
      newItems = [
        createMealItem(seeds[0], 20 * scale),
        createMealItem(fruits[0], 100 * scale)
      ];
    } else if (mealName.includes('almoço') || mealName.includes('jantar')) {
      const veggies = shuffleArray(availableFoods.filter(f => ['Alface', 'Tomate', 'Brócolis'].some(w => f.name.includes(w))));
      const leanProteins = shuffleArray(availableFoods.filter(f => ['Tilápia', 'Frango'].some(w => f.name.includes(w))));
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
  name = 'Engine V3 Padrão';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    // Implementação original do engine.ts v3
    const mealName = meal.name.toLowerCase();
    const scale = baseCalories / 2000;
    let newItems: (MealItem | null)[] = [];

    if (mealName.includes('café') || mealName.includes('desjejum')) {
      const proteins = shuffleArray(availableFoods.filter(f => ['Ovo', 'Queijo'].some(w => f.name.includes(w))));
      const carbs = shuffleArray(availableFoods.filter(f => ['Pão', 'Fruta'].some(w => f.name.includes(w))));
      newItems = [createMealItem(proteins[0], 2 * scale), createMealItem(carbs[0], 50 * scale)];
    } else {
      const proteins = shuffleArray(availableFoods.filter(f => ['Frango', 'Carne'].some(w => f.name.includes(w))));
      const carbs = shuffleArray(availableFoods.filter(f => ['Arroz', 'Feijão'].some(w => f.name.includes(w))));
      newItems = [createMealItem(proteins[0], 120 * scale), createMealItem(carbs[0], 150 * scale)];
    }

    return newItems.filter((i): i is MealItem => i !== null);
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Geração determinística baseada em substituição por categoria nutricional.";
  }
}
