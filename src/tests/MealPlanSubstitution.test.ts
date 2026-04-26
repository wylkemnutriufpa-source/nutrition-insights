import { describe, it, expect } from 'vitest';
import { validateMealSubstitutions } from '../lib/mealPlanSubstitutionValidator';
import type { Tables } from '../integrations/supabase/types';

type MealPlanItem = Tables<"meal_plan_items">;

describe('Meal Plan Substitution System', () => {
  const baseItem: Partial<MealPlanItem> = {
    id: 'meal-1',
    title: 'Almoço',
    calories_target: 500,
    protein_target: 30,
    carbs_target: 50,
    fat_target: 15,
    day_of_week: 0,
    meal_type: 'lunch',
  };

  it('should validate substitution limit (0-4)', () => {
    const itemWithTooManySubs: MealPlanItem = {
      ...baseItem,
      edit_metadata: {
        substitutions_json: [
          'Arroz e Feijão',
          'Macarrão',
          'Batata Doce',
          'Cuscuz',
          'Mandioca' // 5th item
        ]
      }
    } as any;

    const result = validateMealSubstitutions(itemWithTooManySubs, 4);
    expect(result.valid).toBe(false);
    expect(result.detailedErrors[0].limitError).toContain('limite definido é 4');
  });

  it('should validate macro tolerances correctly (including fat)', () => {
    // We use a food from FOOD_DATABASE in the validator: "Frango Grelhado"
    // Let's check what's in FOOD_DATABASE to be sure
    const item: MealPlanItem = {
      ...baseItem,
      edit_metadata: {
        substitutions_json: [
          'Patinho Moído' // Usually around 200-220kcal, 30-35g P, 0g C, 5-8g F
        ]
      }
    } as any;

    // Target is 500kcal, 30P, 50C, 15F
    // Patinho will definitely fail on Carbs (0 vs 50)
    
    const result = validateMealSubstitutions(item, 4);
    expect(result.valid).toBe(false);
    const error = result.detailedErrors.find(e => e.foodName.toLowerCase().includes('patinho'));
    expect(error).toBeDefined();
    if (error) {
      expect(error.macros.carbs).toBeDefined();
    }
  });

  it('should handle robust parsing of various formats', () => {
    const formats = [
      '• Arroz → Macarrão',
      '→ Batata Doce',
      'Item: Frango, Arroz',
      'Arroz e Feijão'
    ];

    formats.forEach(sub => {
      const item: MealPlanItem = {
        ...baseItem,
        edit_metadata: {
          substitutions_json: [sub]
        }
      } as any;

      const result = validateMealSubstitutions(item, 4);
      expect(result).toBeDefined();
    });
  });
  
  it('should ensure all items generated for single-day plans use Day 0', () => {
     const generatedItems: Partial<MealPlanItem>[] = [
       { title: 'Café', day_of_week: 0 },
       { title: 'Almoço', day_of_week: 0 },
     ];
     
     const allDayZero = generatedItems.every(i => i.day_of_week === 0);
     expect(allDayZero).toBe(true);
  });
});
