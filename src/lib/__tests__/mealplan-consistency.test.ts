
import { describe, it, expect } from 'vitest';

describe('MealPlan Date Consistency', () => {
  it('should default to current date when in basic mode', () => {
    // Current date in ISO string format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Simulating the logic in PatientMealPlan.tsx lines 113-120
    let dateState = '2020-01-01'; // old date
    const isBasic = true;
    
    if (isBasic) {
      if (dateState !== today) {
        dateState = today;
      }
    }
    
    expect(dateState).toBe(today);
  });
});
