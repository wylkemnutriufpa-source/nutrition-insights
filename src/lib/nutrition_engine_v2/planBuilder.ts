/**
 * Motor Determinístico V2 — Construtor de pré-plano
 *
 * Implementa o algoritmo da seção 6 de MOTOR_DETERMINISTICO.md:
 * escala linear com clamp(0.4, 2.0). Reutiliza alimentos do banco existente.
 * NUNCA insere alimentos novos — se um nome do template não existir, o item
 * é silenciosamente ignorado naquela refeição.
 */

import type { EngineMetrics } from "./calculations";
import { MEAL_DISTRIBUTION, MEAL_ORDER, MEAL_LABELS, type Goal, type MealType } from "./constants";
import { MEAL_TEMPLATES, type TemplateItem } from "./templates";

export interface FoodRecord {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
}

export interface PlanItem {
  food_id: string;
  food_name: string;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
}

export interface MealTotals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number;
}

export interface BuiltMeal {
  type: MealType;
  name: string;
  target_kcal: number;
  items: PlanItem[];
  totals: MealTotals;
}

export interface BuiltPlan {
  goal: Goal;
  target_kcal: number;
  target_protein: number;
  target_carb: number;
  target_fat: number;
  meals: BuiltMeal[];
  totals: MealTotals;
  unresolved_items: string[];
  engine_version: string;
}

/** Resolve um TemplateItem contra a lista de alimentos existentes (ILIKE-like). */
export function resolveFood(item: TemplateItem, foods: FoodRecord[]): FoodRecord | null {
  const candidates = [item.food_name, ...(item.aliases ?? [])];
  for (const c of candidates) {
    const target = c.trim().toLowerCase();
    const exact = foods.find((f) => f.name.trim().toLowerCase() === target);
    if (exact) return exact;
  }
  for (const c of candidates) {
    const needle = c.trim().toLowerCase();
    const partial = foods.find((f) => f.name.trim().toLowerCase().includes(needle));
    if (partial) return partial;
  }
  for (const c of candidates) {
    const firstWord = c.trim().toLowerCase().split(/\s+/)[0];
    if (firstWord.length < 4) continue;
    const fuzzy = foods.find((f) => f.name.trim().toLowerCase().includes(firstWord));
    if (fuzzy) return fuzzy;
  }
  return null;
}

function calcItem(food: FoodRecord, grams: number): PlanItem {
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

export function buildAutoPlan(
  metrics: EngineMetrics,
  goal: Goal,
  foods: FoodRecord[]
): BuiltPlan {
  const unresolved: string[] = [];
  const meals: BuiltMeal[] = [];

  for (const mealType of MEAL_ORDER) {
    const targetKcal = metrics.target_kcal * MEAL_DISTRIBUTION[mealType];
    const template =
      MEAL_TEMPLATES[mealType]?.[goal] ?? MEAL_TEMPLATES[mealType]?.maintain ?? [];

    const resolved: Array<{ food: FoodRecord; baseGrams: number }> = [];
    let baseKcal = 0;
    for (const tItem of template) {
      const food = resolveFood(tItem, foods);
      if (!food) {
        unresolved.push(`${mealType}:${tItem.food_name}`);
        continue;
      }
      resolved.push({ food, baseGrams: tItem.base_grams });
      baseKcal += Number(food.calories) * (tItem.base_grams / 100);
    }

    let items: PlanItem[] = [];
    if (baseKcal > 0 && resolved.length > 0) {
      const rawScale = targetKcal / baseKcal;
      const scale = Math.max(0.4, Math.min(rawScale, 2.0));
      items = resolved
        .map(({ food, baseGrams }) => calcItem(food, baseGrams * scale))
        .filter((it) => it.grams > 0);
    }

    meals.push({
      type: mealType,
      name: MEAL_LABELS[mealType],
      target_kcal: round1(targetKcal),
      items,
      totals: sumTotals(items),
    });
  }

  const dayTotals = sumTotals(meals.flatMap((m) => m.items));

  return {
    goal,
    target_kcal: metrics.target_kcal,
    target_protein: metrics.protein_g,
    target_carb: metrics.carb_g,
    target_fat: metrics.fat_g,
    meals,
    totals: dayTotals,
    unresolved_items: unresolved,
    engine_version: metrics.engine_version,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
