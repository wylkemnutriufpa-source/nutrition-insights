import { UserProfile, DailyPlan, Meal, PlanTemplate } from '../types';
import { MealBuilder } from './meal-builder';
import { PLAN_TEMPLATES } from '../data/database';

export class PlanGenerator {
  static generateFromTemplate(profile: UserProfile, templateId: string): DailyPlan {
    const template = PLAN_TEMPLATES.find(t => t.id === templateId) || PLAN_TEMPLATES[0];
    
    // Plotagem inteligente: Ajusta quantidades se necessário (ex: simplificado 1:1 por enquanto)
    const meals = template.meals.map(m => MealBuilder.createFromTemplateMeal(m));

    const totalMacros = this.calculateTotal(meals);

    return { 
      id: crypto.randomUUID(),
      templateName: template.name,
      meals, 
      totalMacros 
    };
  }

  static generate(profile: UserProfile): DailyPlan {
    const targetCals = profile.targetCalories || 2000;
    
    const meals: Meal[] = [
      MealBuilder.createBreakfast(targetCals * 0.25),
      MealBuilder.createSnack('Lanche da Manhã', targetCals * 0.10),
      MealBuilder.createMarmitaMeal('Almoço', targetCals * 0.30),
      MealBuilder.createSnack('Lanche da Tarde', targetCals * 0.10),
      MealBuilder.createMarmitaMeal('Jantar', targetCals * 0.25),
    ];

    const totalMacros = this.calculateTotal(meals);

    return { 
      id: crypto.randomUUID(),
      meals, 
      totalMacros 
    };
  }

  private static calculateTotal(meals: Meal[]) {
    return meals.reduce((acc, m) => ({
      calories: acc.calories + m.totalMacros.calories,
      protein: acc.protein + m.totalMacros.protein,
      carbs: acc.carbs + m.totalMacros.carbs,
      fat: acc.fat + m.totalMacros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
}
