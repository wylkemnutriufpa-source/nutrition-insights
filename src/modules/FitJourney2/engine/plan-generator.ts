import { Macronutrients, Meal, NutritionPlan } from "../types";
import { MealDistribution } from "./meal-distribution";
import { MealBuilder } from "./meal-builder";
import { FoodDatabase } from "../data/food-database";

export class PlanGenerator {
  static generateSimplePlan(
    patientId: string, 
    dailyTargets: Macronutrients,
    mealCount: number = 4
  ): NutritionPlan {
    const distributions = MealDistribution.getStandardDistribution(dailyTargets, mealCount);
    const meals: Meal[] = [];

    const mealTypes: Meal['type'][] = ['breakfast', 'lunch', 'snack', 'dinner'];

    distributions.forEach((target, index) => {
      const type = mealTypes[index % mealTypes.length];
      const name = this.getMealName(type);
      
      const builder = new MealBuilder(name, type, target);
      
      // Basic deterministic logic for auto-generation
      if (type === 'breakfast') {
        builder.addProtein(FoodDatabase.findById('egg')!)
               .addCarb(FoodDatabase.findById('bread-whole')!);
      } else if (type === 'lunch' || type === 'dinner') {
        builder.addProtein(FoodDatabase.findById('chicken-breast')!)
               .addCarb(FoodDatabase.findById('rice')!);
      } else {
        builder.addProtein(FoodDatabase.findById('greek-yogurt')!)
               .addCarb(FoodDatabase.findById('banana')!);
      }

      meals.push(builder.build());
    });

    return {
      id: crypto.randomUUID(),
      patientId,
      dailyTargets,
      meals,
      createdAt: new Date().toISOString()
    };
  }

  private static getMealName(type: Meal['type']): string {
    const names = {
      'breakfast': 'Café da Manhã',
      'lunch': 'Almoço',
      'snack': 'Lanche',
      'dinner': 'Jantar',
      'pre-workout': 'Pré-Treino',
      'post-workout': 'Pós-Treino'
    };
    return names[type];
  }
}
