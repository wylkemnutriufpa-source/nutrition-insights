import { UserProfile, DailyPlan, Meal } from '../types';
import { 
  calculateTargetKcal, 
  calculateMacros, 
  reconcileMeal, 
  MacroTargets, 
  ClinicalProfile, 
  MealItem 
} from '../../../core/clinical-engine';

export class PlanGenerator {
  static generate(profile: any): DailyPlan {
    const clinicalProfile: ClinicalProfile = {
      sex: profile.sex === 'F' ? 'female' : 'male',
      weight: profile.weight_kg || 70,
      height: profile.height_cm || 170,
      age: profile.age || 30,
      activityLevel: profile.activity_level || 'moderate',
      goal: profile.goal || 'maintain'
    };

    const tmb = 10 * clinicalProfile.weight + 6.25 * clinicalProfile.height - 5 * clinicalProfile.age + (clinicalProfile.sex === 'female' ? -161 : 5);
    const tdee = Math.round(tmb * 1.55);
    const targetKcal = calculateTargetKcal(tdee, clinicalProfile.goal, clinicalProfile.sex);
    const targets = calculateMacros(targetKcal, clinicalProfile.goal, clinicalProfile.weight);

    // Distribution
    const MEAL_DISTRIBUTION: Record<string, number> = {
      breakfast: 0.25,
      snack1: 0.10,
      lunch: 0.30,
      snack2: 0.10,
      dinner: 0.25,
    };

    const meals: Meal[] = Object.entries(MEAL_DISTRIBUTION).map(([type, pct]) => {
      const mealTargets: MacroTargets = {
        protein: targets.protein * pct,
        carbs: targets.carbs * pct,
        fat: targets.fat * pct,
        calories: targets.calories * pct
      };

      // Mock initial items (this would come from a template or library)
      const baseItems: MealItem[] = [
        {
          id: 'p1',
          name: 'Proteína Base',
          grams: 100,
          macro_role: 'protein',
          macros_per_100g: { protein: 25, carbs: 0, fat: 5, calories: 150 }
        },
        {
          id: 'c1',
          name: 'Carboidrato Base',
          grams: 100,
          macro_role: 'carb',
          macros_per_100g: { protein: 2, carbs: 25, fat: 1, calories: 120 }
        }
      ];

      const result = reconcileMeal(baseItems, mealTargets, clinicalProfile);

      return {
        id: Math.random().toString(36).substr(2, 9),
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type: type as any,
        items: result.items.map(it => ({ foodId: it.id, quantity: it.grams })),
        totalMacros: {
          calories: result.totals.calories,
          protein: result.totals.protein,
          carbs: result.totals.carbs,
          fat: result.totals.fat,
        }
      };
    });

    return { 
      meals, 
      totalMacros: {
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat
      }
    };
  }
}
