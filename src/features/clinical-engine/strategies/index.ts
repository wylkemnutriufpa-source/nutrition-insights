import { Meal, Food, MealItem } from '../types/clinical-types';

export interface ClinicalStrategy {
  id: string;
  name: string;
  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[];
  explainDecision(meal: Meal, items: MealItem[]): string;
}

export class FitJourneyStrategy implements ClinicalStrategy {
  id = 'fitjourney_protocol';
  name = 'Protocolo FitJourney';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    // Implementação específica FitJourney (Foco em Performance/Estética)
    // ... (lógica baseada no engine.ts anterior, mas especializada)
    return []; // Placeholder para refatoração
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Priorizado aporte proteico e densidade calórica moderada seguindo o Protocolo FitJourney.";
  }
}

export class BiquiniBrancoStrategy implements ClinicalStrategy {
  id = 'biquini_branco_protocol';
  name = 'Protocolo Biquini Branco';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    // Implementação específica Biquini Branco (Foco em Saúde Hormonal/Definição)
    return []; // Placeholder
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Ajustado para equilíbrio hormonal e controle glicêmico conforme Protocolo Biquini Branco.";
  }
}

export class DefaultV3Strategy implements ClinicalStrategy {
  id = 'default_v3';
  name = 'Engine V3 Padrão';

  generateMeal(meal: Meal, goal: string, baseCalories: number, availableFoods: Food[]): MealItem[] {
    // Lógica determinística padrão
    return []; // Placeholder
  }

  explainDecision(meal: Meal, items: MealItem[]): string {
    return "Substituição determinística baseada em macros equivalentes.";
  }
}
