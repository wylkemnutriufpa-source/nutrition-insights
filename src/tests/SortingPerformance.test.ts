import { describe, it, expect } from 'vitest';
import { sortMealPlanItems } from '../lib/mealPlanSort';
import { type MealPlanItem } from '../stores/mealPlanEditorV2Store';

describe('Meal Plan Sorting Performance & Determinism', () => {
  const generateLargeDataset = (size: number): MealPlanItem[] => {
    const items: any[] = [];
    for (let i = 0; i < size; i++) {
      items.push({
        id: `item-${i}`,
        title: `Item ${i}`,
        is_primary: i % 10 === 0, // 10% are primary
        calories_target: Math.floor(Math.random() * 1000),
        protein_target: Math.floor(Math.random() * 100),
        day_of_week: 1,
        meal_type: 'breakfast'
      });
    }
    // Shuffle the items
    return items.sort(() => Math.random() - 0.5);
  };

  it('should sort a large dataset (10,000 items) within a tight time limit', () => {
    const dataset = generateLargeDataset(10000);
    
    const start = performance.now();
    const sorted = sortMealPlanItems(dataset);
    const end = performance.now();
    
    const duration = end - start;
    console.log(`Sorting 10,000 items took ${duration.toFixed(2)}ms`);
    
    // Threshold: 100ms for 10,000 items is reasonable for a standard JS sort on modern CPUs
    // If it's O(n^2), it will fail spectacularly.
    expect(duration).toBeLessThan(100);
  });

  it('should be perfectly deterministic across multiple executions', () => {
    const dataset = generateLargeDataset(1000);
    
    const firstRun = sortMealPlanItems([...dataset]);
    const secondRun = sortMealPlanItems([...dataset]);
    const thirdRun = sortMealPlanItems([...dataset]);
    
    expect(firstRun).toEqual(secondRun);
    expect(secondRun).toEqual(thirdRun);
  });

  it('should prioritize Primary items first, then by Calories (DESC), then by Title', () => {
    const items: any[] = [
      { id: '3', title: 'B', is_primary: false, calories_target: 500 },
      { id: '1', title: 'C', is_primary: true, calories_target: 300 },
      { id: '2', title: 'A', is_primary: true, calories_target: 500 },
      { id: '4', title: 'A', is_primary: false, calories_target: 500 },
    ];
    
    const sorted = sortMealPlanItems(items);
    
    // 1st: Primary + 500 cal
    expect(sorted[0].id).toBe('2');
    // 2nd: Primary + 300 cal
    expect(sorted[1].id).toBe('1');
    // 3rd: Non-primary + 500 cal + Title A
    expect(sorted[2].id).toBe('4');
    // 4th: Non-primary + 500 cal + Title B
    expect(sorted[3].id).toBe('3');
  });
});
