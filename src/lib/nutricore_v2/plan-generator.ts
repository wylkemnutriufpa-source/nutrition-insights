import { Food, FoodCategory } from "./food-database";
import { MealType, MealSlot, DistributedMeal } from "./meal-distribution";
import { PlannedMeal, buildMeal, buildMealWithMarmita, BuildMealOptions } from "./meal-builder";
import { runEngine, EngineInput, EngineResult, MacroTargets } from "./nutrition-engine";
import { Marmita } from "./marmitas-database";

export interface PatientMetrics extends EngineInput {
  id?: string;

  restrictions?: string[];
  preferences?: string[];
  allergies?: string[];
}

export interface DailyPlan {
  patient_id?: string;
  date: string;
  meals: PlannedMeal[];
  daily_totals: MacroTargets;
  engine_rationale: string[];
  generated_at: string;
}

/**
 * Gera um plano diário completo baseado na anamnese e motor nutricional.
 */
export function generateDailyPlan(
  patient: PatientMetrics,
  meals: MealSlot[],
  foodDb: Food[],
  date: string = new Date().toISOString().split("T")[0],
  marmita?: Marmita,
  marmitaType: MealType = "almoço"
): DailyPlan {

  // 1. Motor de cálculos (TMB, TDEE, Macros Alvo)
  const engineResult = runEngine(patient);

  // 2. Distribuição de macros por refeição
  const mealsWithMacros = distributeMacros(engineResult.macros, meals, marmita, marmitaType);

  // 3. Orquestração da construção de cada refeição
  const plannedMeals = mealsWithMacros.map((meal) => {
    // Se for o tipo de refeição da marmita, usa a marmita
    if (marmita && meal.type === marmitaType) {
      return buildMealWithMarmita(meal.type, meal.time, marmita);
    }


    // Mesclar restrições e alergias
    const allRestrictions = [
      ...(patient.restrictions || []),
      ...(patient.allergies || [])
    ];

    // Lógica de regras de negócio específicas por tipo de refeição
    let targetMacros = { ...meal.macros };
    
    if (meal.type === "jantar" && !marmita) {
       const reduction = 0.8;
       targetMacros.protein_g *= reduction;
       targetMacros.carb_g *= reduction;
       targetMacros.fat_g *= reduction;
    }

    return buildMeal(
      meal.type,
      meal.time,
      {
        protein_g: targetMacros.protein_g,
        carb_g: targetMacros.carb_g,
        fat_g: targetMacros.fat_g,
        kcal: meal.macros.calories,
      },
      foodDb,
      {
        restrictions: allRestrictions,
        preferences: patient.preferences,
      }
    );
  });

  // 4. Montagem do plano
  return {
    date,
    meals: plannedMeals,
    daily_totals: engineResult.macros,
    engine_rationale: engineResult.rationale,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Helper para distribuir macros
 */
function distributeMacros(
  dailyMacros: MacroTargets,
  meals: MealSlot[],
  marmita?: Marmita,
  marmitaType: MealType = "almoço"
): (MealSlot & { macros: { protein_g: number; carb_g: number; fat_g: number; calories: number } })[] {

  const DEFAULT_WEIGHTS: Record<MealType, number> = {
    cafe_da_manha: 0.2,
    lanche_da_manha: 0.1,
    almoço: 0.3,
    lanche_da_tarde: 0.1,
    jantar: 0.25,
    ceia: 0.05,
  };

  // 1. Calcular macros disponíveis (Daily - Marmita)
  let availableMacros = {
    calories: dailyMacros.protein_kcal + dailyMacros.carb_kcal + dailyMacros.fat_kcal,
    protein_g: dailyMacros.protein_g,
    carb_g: dailyMacros.carb_g,
    fat_g: dailyMacros.fat_g,
  };

  if (marmita) {
    availableMacros.calories -= marmita.calories;
    availableMacros.protein_g -= marmita.protein_g;
    availableMacros.carb_g -= marmita.carbs_g;
    availableMacros.fat_g -= marmita.fat_g;
  }

  // 2. Definir pesos apenas para refeições "não-marmita"
  const totalWeight = meals.reduce((acc, m) => {
    if (marmita && m.type === marmitaType) return acc; 
    const w = m.weight ?? DEFAULT_WEIGHTS[m.type] ?? 0.1;
    return acc + w;
  }, 0);

  return meals.map((meal) => {
    if (marmita && meal.type === marmitaType) {
      return {
        ...meal,

        macros: {
          calories: marmita.calories,
          protein_g: marmita.protein_g,
          carb_g: marmita.carbs_g,
          fat_g: marmita.fat_g,
        }
      };
    }

    const w = meal.weight ?? DEFAULT_WEIGHTS[meal.type] ?? 0.1;
    const weight = w / totalWeight;
    
    return {
      ...meal,
      macros: {
        calories: Math.round(Math.max(0, availableMacros.calories * weight) * 10) / 10,
        protein_g: Math.round(Math.max(0, availableMacros.protein_g * weight) * 10) / 10,
        carb_g: Math.round(Math.max(0, availableMacros.carb_g * weight) * 10) / 10,
        fat_g: Math.round(Math.max(0, availableMacros.fat_g * weight) * 10) / 10,
      }
    };
  });
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}
