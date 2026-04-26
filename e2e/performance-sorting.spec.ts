import { test, expect } from "@playwright/test";
import { sortMealPlanItems, type MealPlanItem } from "../src/lib/mealPlanSort";

test.describe("Meal Plan - Performance Regression Tests", () => {
  const generateItems = (count: number): any[] => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        id: `item-${i}`,
        day_of_week: Math.floor(Math.random() * 7),
        meal_type: ["breakfast", "lunch", "dinner", "morning_snack"][Math.floor(Math.random() * 4)],
        is_primary: Math.random() > 0.5,
        calories_target: Math.floor(Math.random() * 500),
        created_at: new Date().toISOString(),
      });
    }
    return items;
  };

  const measureSorting = (count: number) => {
    const items = generateItems(count);
    const start = performance.now();
    sortMealPlanItems(items);
    const end = performance.now();
    return end - start;
  };

  test("Sorting performance should be within limits for large datasets", async () => {
    const sizes = [1000, 5000, 10000];
    const thresholds = {
      1000: 50,  // 50ms
      5000: 150, // 150ms
      10000: 400 // 400ms
    };

    for (const size of sizes) {
      // Run multiple times and take average to avoid noise
      let totalTime = 0;
      const runs = 5;
      for (let i = 0; i < runs; i++) {
        totalTime += measureSorting(size);
      }
      const avgTime = totalTime / runs;
      
      console.log(`Sorting ${size} items took avg ${avgTime.toFixed(2)}ms`);
      
      const threshold = (thresholds as any)[size];
      expect(avgTime, `Sorting ${size} items took ${avgTime.toFixed(2)}ms, exceeding threshold of ${threshold}ms`).toBeLessThan(threshold);
    }
  });

  test("Performance should not degrade significantly (regression check simulation)", async () => {
    // This is a simplified version of dynamic thresholding
    const size = 5000;
    const initialRun = measureSorting(size);
    
    // Simulate a baseline
    const baseline = initialRun; // In real scenarios, this comes from a historical file
    
    const secondRun = measureSorting(size);
    const degradation = (secondRun - baseline) / baseline;
    
    console.log(`Baseline for ${size}: ${baseline.toFixed(2)}ms, Current: ${secondRun.toFixed(2)}ms, Degradation: ${(degradation * 100).toFixed(2)}%`);
    
    // Fail if degradation > 50%
    if (baseline > 10) { // Only check if baseline is significant enough to be stable
        expect(degradation, "Performance degraded by more than 50% compared to baseline").toBeLessThan(0.5);
    }
  });
});
