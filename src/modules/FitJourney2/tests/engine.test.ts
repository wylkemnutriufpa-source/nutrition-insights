import { describe, it, expect } from 'vitest';
import { NutritionEngine } from '../engine/nutrition-engine';
import { MealBuilder } from '../engine/meal-builder';
import { FoodDatabase } from '../data/food-database';
import { PlanGenerator } from '../engine/plan-generator';

describe('FitJourney2 Engine (v2.0)', () => {
  it('should calculate calories correctly', () => {
    const calories = NutritionEngine.calculateCalories(100, 100, 10);
    // (100 * 4) + (100 * 4) + (10 * 9) = 400 + 400 + 90 = 890
    expect(calories).toBe(890);
  });

  it('should calculate food amount for target protein', () => {
    const egg = FoodDatabase.findById('egg')!; // 13g protein per 100g
    const amount = NutritionEngine.calculateAmountForTargetProtein(26, egg.proteinPer100g);
    expect(amount).toBe(200); // 26 / 0.13 = 200
  });

  it('should build a meal following "protein first" rule', () => {
    const target = { protein: 30, carbs: 50, fats: 10, calories: 410 };
    const chicken = FoodDatabase.findById('chicken-breast')!; // 31g protein
    const rice = FoodDatabase.findById('rice')!; // 28g carbs
    
    const meal = new MealBuilder('Almoço', 'lunch', target)
      .addProtein(chicken)
      .addCarb(rice)
      .build();

    expect(meal.actualMacros.protein).toBeGreaterThanOrEqual(29);
    expect(meal.items[0].id).toBe('chicken-breast');
    expect(meal.items[1].id).toBe('rice');
  });

  it('should generate a complete plan', () => {
    const targets = { protein: 150, carbs: 200, fats: 60, calories: 1940 };
    const plan = PlanGenerator.generateSimplePlan('test-patient', targets, 4);
    
    expect(plan.meals.length).toBe(4);
    expect(plan.meals[0].name).toBe('Café da Manhã');
    expect(plan.meals[1].name).toBe('Almoço');
  });
});
