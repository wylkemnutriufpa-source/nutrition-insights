import { Macronutrients } from "../types";

export interface DistributionRule {
  mealType: string;
  proteinPct: number;
  carbsPct: number;
  fatsPct: number;
}

export class MealDistribution {
  static getStandardDistribution(total: Macronutrients, mealCount: number = 4): Macronutrients[] {
    const distributions: Record<number, number[]> = {
      4: [0.25, 0.25, 0.25, 0.25],
      5: [0.2, 0.2, 0.2, 0.2, 0.2],
      6: [0.15, 0.2, 0.15, 0.2, 0.15, 0.15],
    };

    const ratios = distributions[mealCount] || distributions[4];
    
    return ratios.map(ratio => ({
      protein: Math.round(total.protein * ratio),
      carbs: Math.round(total.carbs * ratio),
      fats: Math.round(total.fats * ratio),
      calories: Math.round(total.calories * ratio),
    }));
  }

  static getSpecificDistribution(total: Macronutrients, type: 'muscle' | 'weight-loss'): Macronutrients[] {
    // Example rules for 4 meals
    const rules = {
      'weight-loss': [
        { protein: 0.25, carbs: 0.2, fats: 0.25 }, // Breakfast
        { protein: 0.3, carbs: 0.4, fats: 0.3 },  // Lunch
        { protein: 0.15, carbs: 0.1, fats: 0.15 }, // Snack
        { protein: 0.3, carbs: 0.3, fats: 0.3 },  // Dinner
      ],
      'muscle': [
        { protein: 0.25, carbs: 0.3, fats: 0.25 },
        { protein: 0.25, carbs: 0.25, fats: 0.25 },
        { protein: 0.25, carbs: 0.25, fats: 0.25 },
        { protein: 0.25, carbs: 0.2, fats: 0.25 },
      ]
    };

    const activeRules = rules[type];

    return activeRules.map(rule => ({
      protein: Math.round(total.protein * rule.protein),
      carbs: Math.round(total.carbs * rule.carbs),
      fats: Math.round(total.fats * rule.fats),
      calories: 0, // Will be recalculated
    })).map(m => ({
      ...m,
      calories: Math.round(m.protein * 4 + m.carbs * 4 + m.fats * 9)
    }));
  }
}
