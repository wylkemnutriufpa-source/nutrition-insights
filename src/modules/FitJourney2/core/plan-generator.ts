import { UserProfile, DailyPlan, Meal } from '../types';
import { MealBuilder } from './meal-builder';

export class PlanGenerator {
  static generate(profile: UserProfile): DailyPlan {
    const targetCals = profile.targetCalories || 2000;
    
    // Distribution:
    // Breakfast: 25%
    // Snack 1: 10%
    // Lunch: 30%
    // Snack 2: 10%
    // Dinner: 25%
    
    const meals: Meal[] = [
      MealBuilder.createBreakfast(targetCals * 0.25),
      MealBuilder.createSnack('snack1', targetCals * 0.10),
      MealBuilder.createMarmitaMeal('lunch', targetCals * 0.30),
      MealBuilder.createSnack('snack2', targetCals * 0.10),
      MealBuilder.createMarmitaMeal('dinner', targetCals * 0.25),
    ];

    const totalMacros = meals.reduce((acc, m) => ({
      calories: acc.calories + m.totalMacros.calories,
      protein: acc.protein + m.totalMacros.protein,
      carbs: acc.carbs + m.totalMacros.carbs,
      fat: acc.fat + m.totalMacros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return { meals, totalMacros };
  }
}
