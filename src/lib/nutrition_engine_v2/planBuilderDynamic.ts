/**
 * Etapa 4: planBuilderDynamic.ts (V2.1)
 * Gera alimentos baseados na estrutura dinâmica, sem usar MEAL_ORDER fixo.
 */

import { EngineMetrics } from "./calculations";
import { FoodRecord, PlanItem, MealTotals, resolveFood } from "./planBuilder";
import { MealStructure } from "./mealStructureBuilder";
import { CaloricDistribution } from "./distributionEngine";
import { Goal, MealType } from "./constants";
import { MEAL_TEMPLATES } from "./templates";

export interface BuiltDynamicMeal {
  id: string;
  type: string;
  name: string;
  time: string;
  target_kcal: number;
  items: PlanItem[];
  totals: MealTotals;
}

export interface BuiltDynamicPlan {
  goal: Goal;
  target_kcal: number;
  target_protein: number;
  target_carb: number;
  target_fat: number;
  meals: BuiltDynamicMeal[];
  totals: MealTotals;
  unresolved_items: string[];
  engine_version: string;
}

/**
 * Mapeia type_hint da estrutura para o template V2 mais próximo
 */
function mapTypeHintToTemplate(hint: string): MealType {
  switch (hint) {
    case 'breakfast': return 'breakfast';
    case 'lunch': return 'lunch';
    case 'dinner': return 'dinner';
    case 'snack': return 'afternoon_snack'; // Fallback comum para snack
    case 'pre_workout': return 'morning_snack';
    case 'post_workout': return 'afternoon_snack';
    default: return 'breakfast';
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumTotals(items: PlanItem[]): MealTotals {
  const t = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0 };
  for (const it of items) {
    t.kcal += it.kcal;
    t.protein += it.protein;
    t.carb += it.carb;
    t.fat += it.fat;
    t.fiber += it.fiber;
  }
  return {
    kcal: round1(t.kcal),
    protein: round1(t.protein),
    carb: round1(t.carb),
    fat: round1(t.fat),
    fiber: round1(t.fiber),
  };
}

export function buildDynamicPlan(
  metrics: EngineMetrics,
  goal: Goal,
  foods: FoodRecord[],
  structure: MealStructure[],
  distributions: CaloricDistribution[]
): BuiltDynamicPlan {
  const unresolved: string[] = [];
  const meals: BuiltDynamicMeal[] = [];

  for (const meal of structure) {
    const dist = distributions.find(d => d.meal_id === meal.id);
    const targetKcal = dist?.kcal_target || 0;
    
    // Mapeamento para template
    const templateKey = mapTypeHintToTemplate(meal.type_hint);
    const template = MEAL_TEMPLATES[templateKey]?.[goal] ?? MEAL_TEMPLATES[templateKey]?.maintain ?? [];

    const resolved: Array<{ food: FoodRecord; baseGrams: number }> = [];
    let baseKcal = 0;
    
    for (const tItem of template) {
      const food = resolveFood(tItem, foods);
      if (!food) {
        unresolved.push(`${meal.name}:${tItem.food_name}`);
        continue;
      }
      resolved.push({ food, baseGrams: tItem.base_grams });
      baseKcal += Number(food.calories) * (tItem.base_grams / 100);
    }

    let items: PlanItem[] = [];
    if (baseKcal > 0 && resolved.length > 0) {
      const scale = Math.max(0.4, Math.min(targetKcal / baseKcal, 2.0));
      items = resolved.map(({ food, baseGrams }) => {
        const grams = baseGrams * scale;
        const f = grams / 100;
        return {
          food_id: food.id,
          food_name: food.name,
          grams: Math.round(grams),
          kcal: round1(Number(food.calories) * f),
          protein: round2(Number(food.protein) * f),
          carb: round2(Number(food.carbs) * f),
          fat: round2(Number(food.fat) * f),
          fiber: round2(Number(food.fiber ?? 0) * f),
        };
      }).filter(it => it.grams > 0);
    }

    meals.push({
      id: meal.id,
      type: meal.type_hint,
      name: meal.name,
      time: meal.time,
      target_kcal: round1(targetKcal),
      items,
      totals: sumTotals(items),
    });
  }

  const dayTotals = sumTotals(meals.flatMap(m => m.items));

  return {
    goal,
    target_kcal: metrics.target_kcal,
    target_protein: metrics.protein_g,
    target_carb: metrics.carb_g,
    target_fat: metrics.fat_g,
    meals,
    totals: dayTotals,
    unresolved_items: unresolved,
    engine_version: "v2.1.0-dynamic",
  };
}
