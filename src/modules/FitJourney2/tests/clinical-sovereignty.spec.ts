import { describe, it, expect } from 'vitest';
import { reconcileMeal } from '../reconciler';
import { MacroTargets, ClinicalProfile, MealItem } from '../types';

describe('Clinical Sovereignty - Soberania Clínica', () => {
  const profile: ClinicalProfile = {
    sex: 'female',
    weight: 60,
    height: 165,
    age: 30,
    activityLevel: 'light',
    goal: 'lose_weight'
  };

  const targets: MacroTargets = {
    protein: 30,
    carbs: 40,
    fat: 10,
    calories: 370
  };

  const baseItems: MealItem[] = [
    {
      id: '1',
      name: 'Frango Grelhado',
      grams: 100,
      macro_role: 'protein',
      macros_per_100g: { protein: 27, carbs: 0, fat: 3, calories: 135 }
    },
    {
      id: '2',
      name: 'Arroz Branco',
      grams: 100,
      macro_role: 'carb',
      macros_per_100g: { protein: 2.5, carbs: 28, fat: 0.2, calories: 124 }
    },
    {
      id: '3',
      name: 'Azeite de Oliva',
      grams: 5,
      macro_role: 'fat',
      macros_per_100g: { protein: 0, carbs: 0, fat: 100, calories: 900 }
    }
  ];

  it('should treat protein as a fixed constraint (Ação 3)', () => {
    const result = reconcileMeal(baseItems, targets, profile);
    
    // Density is 0.27. Target is 30g protein.
    // 30 / 0.27 = 111.11 -> 111g
    expect(result.items.find(i => i.macro_role === 'protein')?.grams).toBe(111);
  });

  it('should never reduce protein to close kcal (Ação 3)', () => {
    const highKcalTargets = { ...targets, calories: 1000 };
    const result = reconcileMeal(baseItems, highKcalTargets, profile);
    
    // Protein should still be based on its own target, not scaled to hit calories.
    expect(result.items.find(i => i.macro_role === 'protein')?.grams).toBe(111);
  });

  it('should use carb as the primary pivot for reconciliation', () => {
    const moreCarbsTargets = { ...targets, carbs: 60 };
    const result = reconcileMeal(baseItems, moreCarbsTargets, profile);
    
    const rice = result.items.find(i => i.name === 'Arroz Branco');
    // Original density 0.28. Current carbs from other items:
    // Chicken: 111 * 0 = 0
    // Olive Oil: 0
    // Total needed: 60
    // 60 / 0.28 = 214.28 -> 214g
    expect(rice?.grams).toBe(214);
  });

  it('should apply the 150g hard clamp for female protein items (Ação 6)', () => {
    const hugeProteinTarget = { ...targets, protein: 100 };
    const result = reconcileMeal(baseItems, hugeProteinTarget, profile);
    
    const chicken = result.items.find(i => i.name === 'Frango Grelhado');
    // Without clamp: 100 / 0.27 = 370g
    // With clamp: 150g
    expect(chicken?.grams).toBe(150);
  });

  it('should remain deterministic - same input, same output', () => {
    const res1 = reconcileMeal(baseItems, targets, profile);
    const res2 = reconcileMeal(baseItems, targets, profile);
    
    expect(res1).toEqual(res2);
  });
});
