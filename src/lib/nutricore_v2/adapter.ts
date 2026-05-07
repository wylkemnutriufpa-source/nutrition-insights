import { runEngine, EngineInput, EngineResult } from './nutrition-engine';
import { distributeMacros, MealSlot, DistributedMeal } from './meal-distribution';
import { buildMeal, PlannedMeal } from './meal-builder';
import { BASE_FOODS, Food } from './food-database';
import { MARMITA_RECIPES, Marmita } from './marmitas-database';

// Tipos compatíveis com o FitJourney Elite V3
import { Meal as V3Meal, MealItem as V3MealItem, Food as V3Food, PatientContext } from '../../features/clinical-engine/types/clinical-types';

/**
 * Orquestrador NutriCore V2 - Adaptador para FitJourney Elite V3
 */
export class NutriCoreV2Adapter {
  /**
   * Converte o contexto do paciente do FitJourney para o formato NutriCore
   */
  private static mapPatientToEngine(context: PatientContext): EngineInput {
    // Mapeamento de objetivos
    const goalMap: Record<string, any> = {
      'lose_weight': 'emagrecimento',
      'gain_muscle': 'hipertrofia',
      'maintain': 'manutencao',
      'health': 'saude',
      'performance': 'performance'
    };

    // Mapeamento de nível de atividade
    const activityMap: Record<string, any> = {
      'sedentary': 'sedentario',
      'light': 'leve',
      'moderate': 'moderado',
      'intense': 'intenso',
      'very_active': 'muito_intenso'
    };

    return {
      weight_kg: context.weight || 70,
      height_cm: context.height || 170,
      age_years: context.age || 30,
      sex: context.gender === 'female' ? 'feminino' : 'masculino',
      activity_level: activityMap[context.activityLevel || ''] || 'moderado',
      goal: goalMap[context.goal || ''] || 'manutencao'
    };
  }

  /**
   * Gera um plano Elite V3 usando o novo Motor NutriCore
   */
  static generateElitePlan(context: PatientContext, availableFoods: V3Food[]): V3Meal[] {
    const engineInput = this.mapPatientToEngine(context);
    const engineResult = runEngine(engineInput);

    // Estrutura padrão de refeições baseada no FitJourney
    const mealSlots: MealSlot[] = [
      { type: 'cafe_da_manha', time: '08:00' },
      { type: 'lanche_da_manha', time: '10:30' },
      { type: 'almoço', time: '13:00' },
      { type: 'lanche_da_tarde', time: '16:00' },
      { type: 'jantar', time: '19:30' },
      { type: 'ceia', time: '22:00' }
    ];

    // Distribuição de Macros
    const distributed = distributeMacros(engineResult.macros, mealSlots);

    // NutriCore usa sua própria base de alimentos, mas podemos passar a disponível
    // Mapeando V3Food para Food do NutriCore (simplificado)
    const foodDb: Food[] = availableFoods.map(f => ({
      id: f.id,
      name: f.name,
      category: (f.category as any) || 'carb',
      protein_100g: f.protein,
      carb_100g: f.carbs,
      fat_100g: f.fat,
      kcal_100g: f.kcal,
      base_grams: 100,
      unit: f.portionUnitLabel || 'g'
    }));

    // Se a base estiver vazia, usa o BASE_FOODS do NutriCore
    const finalDb = foodDb.length > 5 ? foodDb : BASE_FOODS;

    return distributed.map(slot => {
      const mealName = slot.type.charAt(0).toUpperCase() + slot.type.slice(1).replace(/_/g, ' ');
      
      const plannedMeal = buildMeal(
        slot.type,
        slot.time,
        {
          protein_g: slot.macros.protein_g,
          carb_g: slot.macros.carb_g,
          fat_g: slot.macros.fat_g,
          kcal: slot.macros.calories
        },
        finalDb,
        {
          restrictions: context.restrictions,
          preferences: context.preferences
        }
      );

      // Converter PlannedMeal para V3Meal
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: mealName,
        time: slot.time,
        items: plannedMeal.items.map(item => ({
          id: item.foodId,
          name: item.name,
          kcal: item.macros.kcal,
          calories: item.macros.kcal,
          protein: item.macros.protein_g,
          carbs: item.macros.carb_g,
          fat: item.macros.fat_g,
          portionValue: 100,
          portionUnitLabel: 'g',
          portionUnit: 'g',
          portionLabel: 'g',
          measurementType: 'gram',
          instanceId: Math.random().toString(36).substring(2, 10),
          quantity: item.grams,
          substitutions: []
        }))
      };
    });
  }

  /**
   * Calcula substituições usando o algoritmo NutriCore
   */
  static getV2Substitutions(food: V3Food, grams: number, availableFoods: V3Food[]): V3Food[] {
    const { getSubstitutions } = require('./substitutions');
    
    // Mapear para tipos NutriCore
    const coreFood: Food = {
      id: food.id,
      name: food.name,
      category: (food.category as any) || 'carb',
      protein_100g: food.protein,
      carb_100g: food.carbs,
      fat_100g: food.fat,
      kcal_100g: food.kcal,
      base_grams: 100,
      unit: 'g'
    };

    const coreDb: Food[] = availableFoods.map(f => ({
      id: f.id,
      name: f.name,
      category: (f.category as any) || 'carb',
      protein_100g: f.protein,
      carb_100g: f.carbs,
      fat_100g: f.fat,
      kcal_100g: f.kcal,
      base_grams: 100,
      unit: 'g'
    }));

    const subs = getSubstitutions(coreFood, coreDb, grams);

    return subs.map((s: any) => ({
      id: s.food.id,
      name: s.food.name,
      kcal: s.food.kcal_100g,
      calories: s.food.kcal_100g,
      protein: s.food.protein_100g,
      carbs: s.food.carb_100g,
      fat: s.food.fat_100g,
      portionValue: 100,
      portionUnitLabel: 'g',
      portionUnit: 'g',
      portionLabel: s.unit_label,
      measurementType: 'gram'
    }));
  }
}
