import { FoodItem, Macronutrients, Meal, SelectedFood } from "../types";
import { NutritionEngine } from "./nutrition-engine";

export class MealBuilder {
  private meal: Partial<Meal> = {
    items: [],
    actualMacros: { protein: 0, carbs: 0, fats: 0, calories: 0 }
  };

  constructor(name: string, type: Meal['type'], target: Macronutrients) {
    this.meal.name = name;
    this.meal.type = type;
    this.meal.targetMacros = target;
  }

  addProtein(food: FoodItem, targetProtein?: number): this {
    const pTarget = targetProtein || this.meal.targetMacros?.protein || 0;
    const amount = NutritionEngine.calculateAmountForTargetProtein(pTarget, food.proteinPer100g);
    this.addItem(food, amount);
    return this;
  }

  addCarb(food: FoodItem, targetCarbs?: number): this {
    const cTarget = targetCarbs || (this.meal.targetMacros?.carbs || 0) - (this.meal.actualMacros?.carbs || 0);
    const amount = NutritionEngine.calculateAmountForTargetCarbs(Math.max(0, cTarget), food.carbsPer100g);
    this.addItem(food, amount);
    return this;
  }

  private addItem(food: FoodItem, amount: number) {
    const macros = NutritionEngine.calculateMacrosFromWeight(
      amount,
      food.proteinPer100g,
      food.carbsPer100g,
      food.fatsPer100g
    );

    const selected: SelectedFood = {
      ...food,
      amount,
      calculatedMacros: macros
    };

    this.meal.items?.push(selected);
    this.updateActualMacros(macros);
  }

  private updateActualMacros(macros: Macronutrients) {
    if (!this.meal.actualMacros) return;
    this.meal.actualMacros.protein += macros.protein;
    this.meal.actualMacros.carbs += macros.carbs;
    this.meal.actualMacros.fats += macros.fats;
    this.meal.actualMacros.calories += macros.calories;
  }

  build(): Meal {
    return this.meal as Meal;
  }
}
