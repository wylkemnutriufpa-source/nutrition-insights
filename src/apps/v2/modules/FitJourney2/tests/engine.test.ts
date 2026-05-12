import { describe, it, expect } from 'vitest';
import { PlanGenerator } from '../core/plan-generator';
import { UserProfile } from '../types';

describe('FitJourney 2.0 Engine', () => {
  it('should generate a full plan with 5 meals', () => {
    const profile: UserProfile = {
      weight: 80,
      height: 180,
      age: 30,
      gender: 'male',
      activityLevel: 1.5,
      goal: 'loss',
      targetCalories: 2000
    };

    const plan = PlanGenerator.generate(profile);
    
    expect(plan.meals).toHaveLength(5);
    expect(plan.meals[0].type).toBe('breakfast');
    expect(plan.meals[1].type).toBe('snack1');
    expect(plan.meals[2].type).toBe('lunch');
    expect(plan.meals[3].type).toBe('snack2');
    expect(plan.meals[4].type).toBe('dinner');
    
    // Check if lunch and dinner are marmitas (from the list)
    expect(plan.meals[2].items[0].foodId).toMatch(/^m\d+$/);
    expect(plan.meals[4].items[0].foodId).toMatch(/^m\d+$/);

    console.log('Generated Plan Total Calories:', plan.totalMacros.calories);
    expect(plan.totalMacros.calories).toBeGreaterThan(1000);
  });
});
