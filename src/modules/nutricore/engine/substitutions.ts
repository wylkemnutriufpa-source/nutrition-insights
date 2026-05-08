import { FoodItem } from "../types";
import { NutritionEngine } from "./nutrition-engine";

export class SubstitutionEngine {
  static getEquivalentAmount(
    currentFood: FoodItem,
    currentAmount: number,
    targetFood: FoodItem
  ): number {
    const currentProtein = (currentAmount * currentFood.proteinPer100g) / 100;
    return NutritionEngine.calculateAmountForTargetProtein(currentProtein, targetFood.proteinPer100g);
  }

  static findSubstitutes(food: FoodItem): FoodItem[] {
    // Basic logic: same category
    // In v2.0 we could have more complex rules (e.g. only lean proteins)
    return []; 
  }
}
