import { Macronutrients } from "../types";

export class NutritionEngine {
  static calculateCalories(protein: number, carbs: number, fats: number): number {
    return Math.round(protein * 4 + carbs * 4 + fats * 9);
  }

  static calculateMacrosFromWeight(
    weight: number,
    proteinPer100g: number,
    carbsPer100g: number,
    fatsPer100g: number
  ): Macronutrients {
    const p = (weight * proteinPer100g) / 100;
    const c = (weight * carbsPer100g) / 100;
    const f = (weight * fatsPer100g) / 100;
    return {
      protein: Number(p.toFixed(1)),
      carbs: Number(c.toFixed(1)),
      fats: Number(f.toFixed(1)),
      calories: this.calculateCalories(p, c, f),
    };
  }

  static calculateAmountForTargetProtein(targetProtein: number, proteinPer100g: number): number {
    if (proteinPer100g <= 0) return 0;
    return Math.round((targetProtein * 100) / proteinPer100g);
  }

  static calculateAmountForTargetCarbs(targetCarbs: number, carbsPer100g: number): number {
    if (carbsPer100g <= 0) return 0;
    return Math.round((targetCarbs * 100) / carbsPer100g);
  }
}
