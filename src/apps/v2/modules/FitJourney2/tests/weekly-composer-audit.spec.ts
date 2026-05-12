import { describe, it, expect } from 'vitest';
import { composeSlotSequence, composeMeal } from '../../../core/clinical-engine';

describe('Weekly Composer & Meal Assembler Audit', () => {
  it('Weekly Composer: should be deterministic and avoid immediate repeats', () => {
    const config = {
      seed: 'test-seed-123',
      days: 2,
      slots_per_day: ['lunch', 'dinner'],
      behavior: 'conservative' as const,
      clinical_filters: ['frango'],
      pool: ['carne', 'peixe', 'ovos', 'frango']
    };

    const res1 = composeSlotSequence(config);
    const res2 = composeSlotSequence(config);

    // Determinismo
    expect(res1.sequence).toEqual(res2.sequence);
    
    // Filtro Clínico (frango removido)
    expect(res1.sequence).not.toContain('frango');
    
    // Anti-repetição (simplificado)
    for (let i = 1; i < res1.sequence.length; i++) {
      expect(res1.sequence[i]).not.toEqual(res1.sequence[i-1]);
    }

    console.log('Weekly Sequence Proof:', res1.sequence);
  });

  it('Meal Assembler: should compose a meal with correct protein clamp', () => {
    const baseItems = [
      {
        id: 'p1',
        name: 'Frango Grelhado',
        grams: 100,
        macro_role: 'protein' as const,
        macros_per_100g: { protein: 25, carbs: 0, fat: 3, calories: 130 }
      },
      {
        id: 'c1',
        name: 'Arroz',
        grams: 100,
        macro_role: 'carb' as const,
        macros_per_100g: { protein: 2, carbs: 28, fat: 0, calories: 120 }
      }
    ];

    const targets = { protein: 50, carbs: 50, fat: 10, calories: 500 };
    const profile = { sex: 'female' as const, weight: 60, height: 160, age: 30, activityLevel: 'moderate', goal: 'maintain' };

    const meal = composeMeal(baseItems, targets, profile);
    
    // Protein hard clamp (150g frango max)
    const frango = meal.items.find(i => i.name === 'Frango Grelhado')!;
    expect(frango.grams).toBeLessThanOrEqual(150);
    
    // Macros result
    console.log('Assembled Meal Proof:', meal.totals);
  });
});
