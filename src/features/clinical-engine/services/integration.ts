import { 
  FoodItem, 
  getSubstitutionsWithGrams, 
  calculateItemMacros 
} from "./v3Motor";
import { distributeCalories, MealSlot } from "./distribution";
import { generateWeeklyPlan, DayPlan, Macronutrients, PlannedMeal } from "./weeklyPlanner";
import { calculateDayWithMarmita, Marmita } from "./marmitaEngine";
import { getFoodImage } from "./imageResolver";

/**
 * Phase 7 — Integration Module (V3 ↔ System)
 * 
 * This module connects the V3 engine components to the existing system.
 */

export type PlanMode = 'onboarding' | 'template' | 'marmita' | 'manual' | 'semanal';

export interface IntegrationOptions {
  templateId?: string;
  marmitaIds?: string[];
  enableVariation?: boolean;
  startDate?: Date;
  customWeights?: Record<string, number>;
}

export interface PatientMetrics {
  id: string;
  name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  goal: string;
  activityLevel: string;
  targetCalories: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

export interface V3MealItem extends FoodItem {
  instanceId: string;
  quantity: number;
  substitutions: any[];
}

export interface V3Meal {
  id: string;
  name: string;
  type: string;
  time: string;
  items: V3MealItem[];
  calories: number;
  isMarmita?: boolean;
}

export interface V3PlanoAlimentar {
  id: string;
  patient_id: string;
  mode: PlanMode;
  meals: V3Meal[];
  daily_totals: Macronutrients;
  weekly_plan?: any;
  engine_version: 'v3';
  created_at: string;
}

/**
 * Creates a complete meal plan using the V3 engine.
 */
export async function createPlanWithV3(
  patientMetrics: PatientMetrics,
  mealSlots: MealSlot[],
  mode: PlanMode,
  availableFoods: FoodItem[],
  options: IntegrationOptions = {}
): Promise<V3PlanoAlimentar> {
  // 1. Distribute calories based on mode and metrics
  const distribution = distributeCalories({
    target_calories: patientMetrics.targetCalories,
    meals: mealSlots,
    distribution_type: mode === 'onboarding' ? 'dynamic' : 'fixed',
    custom_weights: options.customWeights
  });

  // 2. Generate initial daily plan (simplified logic for integration layer)
  const meals: V3Meal[] = await Promise.all(distribution.map(async (dist) => {
    const mealItems: V3MealItem[] = [];
    
    // Logic for populating items based on mode
    if (mode === 'onboarding' || mode === 'template' || mode === 'manual') {
      // Find suitable foods for this meal type (simplified)
      const isMain = ['almoco', 'jantar'].includes(dist.meal_type);
      const targetFoods = availableFoods.filter(f => {
        if (isMain) return f.category === 'proteína' || f.category === 'carboidrato';
        return f.category === 'fruta' || f.category === 'outro';
      });

      if (targetFoods.length > 0) {
        const food = targetFoods[0];
        const quantity = 100; // Simplified
        const macros = calculateItemMacros(food, quantity);
        
        // Phase 4: Get substitutions
        const substitutions = getSubstitutionsWithGrams({
          base_item: food,
          base_grams: quantity,
          available_foods: availableFoods,
          image_bank: [] // In real scenario, would come from DB
        });

        // Phase 6: Get images
        const img = await getFoodImage(food.name, food.category);

        mealItems.push({
          ...food,
          instanceId: Math.random().toString(36).substring(7),
          quantity,
          imageUrl: img.url,
          substitutions
        });
      }
    }

    return {
      id: Math.random().toString(36).substring(7),
      name: dist.meal_type.replace('_', ' '),
      type: dist.meal_type,
      time: dist.time,
      items: mealItems,
      calories: dist.calories
    };
  }));

  // 3. Handle Marmita mode (Phase 5)
  let finalMeals = meals;
  if (mode === 'marmita' && options.marmitaIds) {
    // Simplified: assuming we have marmita data
    const marmitas: Record<string, Marmita> = {}; 
    // ... logic to load marmitas by IDs and assign to slots
    const dayPlan = { meals };
    const adjusted = calculateDayWithMarmita(dayPlan, marmitas, patientMetrics.targetCalories);
    finalMeals = adjusted.meals;
  }

  // 4. Handle Weekly mode (Phase 3)
  let weeklyPlanData = null;
  if (mode === 'semanal') {
    const dailyTemplate: DayPlan = {
      date: new Date(),
      day_of_week: 'segunda',
      meals: finalMeals.map(m => ({
        type: m.type,
        time: m.time,
        items: m.items.map(i => ({
          nome: i.name,
          gramas: i.quantity,
          kcal: i.kcal,
          protein_g: i.protein,
          carbs_g: i.carbs,
          fat_g: i.fat
        }))
      })),
      daily_totals: {
        calories: patientMetrics.targetCalories,
        protein_g: patientMetrics.proteinTarget,
        carbs_g: patientMetrics.carbsTarget,
        fat_g: patientMetrics.fatTarget
      }
    };

    weeklyPlanData = generateWeeklyPlan({
      daily_template: dailyTemplate,
      start_date: options.startDate || new Date(),
      patient_id: patientMetrics.id,
      options: {
        enable_variation: !!options.enableVariation
      }
    });
  }

  return {
    id: Math.random().toString(36).substring(7),
    patient_id: patientMetrics.id,
    mode,
    meals: finalMeals,
    daily_totals: {
      calories: patientMetrics.targetCalories,
      protein_g: patientMetrics.proteinTarget,
      carbs_g: patientMetrics.carbsTarget,
      fat_g: patientMetrics.fatTarget
    },
    weekly_plan: weeklyPlanData,
    engine_version: 'v3',
    created_at: new Date().toISOString()
  };
}

/**
 * Detects which engine generated the plan.
 */
export function getPlanMotor(plan: any): 'v2' | 'v3' {
  if (plan.engine_version === 'v3' || plan.generation_source === 'v3' || plan.payload?.version === 1) {
    return 'v3';
  }
  return 'v2';
}

/**
 * Migrates a V2 plan to V3.
 */
export async function migratePlanV2toV3(
  v2Plan: any, 
  availableFoods: FoodItem[]
): Promise<V3PlanoAlimentar> {
  // Convert structure while preserving gram amounts
  const migratedMeals: V3Meal[] = await Promise.all((v2Plan.meals || []).map(async (v2Meal: any) => {
    const v3Items: V3MealItem[] = await Promise.all((v2Meal.items || []).map(async (v2Item: any) => {
      // Find food in available V3 foods to get macros and category
      const food = availableFoods.find(f => f.name === v2Item.nome) || {
        id: v2Item.id || 'unknown',
        name: v2Item.nome,
        kcal: v2Item.kcal || 0,
        protein: v2Item.proteina || 0,
        carbs: v2Item.carboidrato || 0,
        fat: v2Item.gordura || 0,
        measurementType: 'gram' as const,
        category: 'outro'
      };

      const quantity = v2Item.gramas || v2Item.quantity || 100;
      
      // Add V3 features: substitutions and images
      const substitutions = getSubstitutionsWithGrams({
        base_item: food as FoodItem,
        base_grams: quantity,
        available_foods: availableFoods,
        image_bank: []
      });

      const img = await getFoodImage(food.name, food.category);

      return {
        ...food,
        instanceId: Math.random().toString(36).substring(7),
        quantity,
        imageUrl: img.url,
        substitutions
      } as V3MealItem;
    }));

    return {
      id: v2Meal.id || Math.random().toString(36).substring(7),
      name: v2Meal.nome || v2Meal.name || 'Refeição',
      type: v2Meal.tipo || v2Meal.type || 'outros',
      time: v2Meal.horario || v2Meal.time || '00:00',
      items: v3Items,
      calories: v2Meal.calorias || 0
    };
  }));

  return {
    id: v2Plan.id,
    patient_id: v2Plan.patient_id,
    mode: 'manual',
    meals: migratedMeals,
    daily_totals: {
      calories: v2Plan.total_calorias || 0,
      protein_g: v2Plan.total_proteina || 0,
      carbs_g: v2Plan.total_carboidrato || 0,
      fat_g: v2Plan.total_gordura || 0
    },
    engine_version: 'v3',
    created_at: new Date().toISOString()
  };
}
