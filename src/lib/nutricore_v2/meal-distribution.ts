import { MacroTargets } from "./nutrition-engine";

export type MealType =
  | "cafe_da_manha"
  | "lanche_da_manha"
  | "almoço"
  | "lanche_da_tarde"
  | "jantar"
  | "ceia";

export interface MealSlot {
  type: MealType;
  time: string;
  weight?: number; // Peso relativo da refeição
}

export interface DistributedMeal {
  type: MealType;
  time: string;
  macros: {
    calories: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
  };
}

export const DEFAULT_MEAL_WEIGHTS: Record<MealType, number> = {
  cafe_da_manha: 0.2,
  lanche_da_manha: 0.1,
  almoço: 0.3,
  lanche_da_tarde: 0.1,
  jantar: 0.25,
  ceia: 0.05,
};

/**
 * Distribui os macros diários entre as refeições selecionadas.
 * Se o paciente tiver menos refeições, os pesos são normalizados proporcionalmente.
 */
export function distributeMacros(
  dailyMacros: MacroTargets,
  meals: MealSlot[]
): DistributedMeal[] {
  if (meals.length === 0) return [];

  // Calcular o peso total das refeições selecionadas
  const totalWeight = meals.reduce((acc, meal) => {
    return acc + (meal.weight ?? DEFAULT_MEAL_WEIGHTS[meal.type]);
  }, 0);

  return meals.map((meal) => {
    const rawWeight = meal.weight ?? DEFAULT_MEAL_WEIGHTS[meal.type];
    const normalizedWeight = rawWeight / totalWeight;

    // Calcular calorias totais do dia para facilitar
    const dailyCalories =
      dailyMacros.protein_kcal + dailyMacros.carb_kcal + dailyMacros.fat_kcal;

    return {
      type: meal.type,
      time: meal.time,
      macros: {
        calories: round(dailyCalories * normalizedWeight),
        protein_g: round(dailyMacros.protein_g * normalizedWeight),
        carb_g: round(dailyMacros.carb_g * normalizedWeight),
        fat_g: round(dailyMacros.fat_g * normalizedWeight),
      },
    };
  });
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
