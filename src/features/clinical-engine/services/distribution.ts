
export interface MealSlot {
  type: string;
  time: string;
}

export interface DistributionInput {
  target_calories: number;
  meals: MealSlot[];
  distribution_type: 'fixed' | 'dynamic' | 'custom';
  custom_weights?: Record<string, number>;
}

export interface MealDistribution {
  meal_type: string;
  time: string;
  calories: number;
  percentage: number;
}

export interface ValidationResult {
  isValid: boolean;
  totalPercentage: number;
  errors: string[];
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  cafe_da_manha: 20,
  lanche_manha: 10,
  almoco: 30,
  lanche_tarde: 10,
  jantar: 25,
  ceia: 5,
};

const DYNAMIC_WEIGHTS: Record<string, number> = {
  almoco: 1.2,
  jantar: 1.2,
  cafe_da_manha: 1.0,
  lanche_manha: 0.9,
  lanche_tarde: 0.9,
  ceia: 0.7,
};

export const distributeCalories = (input: DistributionInput): MealDistribution[] => {
  const { target_calories, meals, distribution_type, custom_weights } = input;

  if (meals.length === 0) return [];

  let mealWeights: number[] = [];

  if (distribution_type === 'fixed') {
    // Get default weights for present meals
    const presentWeights = meals.map(meal => DEFAULT_WEIGHTS[meal.type] || 10);
    const sum = presentWeights.reduce((a, b) => a + b, 0);
    // Redistribute proportionally to reach 100%
    mealWeights = presentWeights.map(w => (w / sum) * 100);
  } else if (distribution_type === 'dynamic') {
    const presentWeights = meals.map(meal => DYNAMIC_WEIGHTS[meal.type] || 0.9);
    const sum = presentWeights.reduce((a, b) => a + b, 0);
    mealWeights = presentWeights.map(w => (w / sum) * 100);
  } else if (distribution_type === 'custom' && custom_weights) {
    const presentWeights = meals.map(meal => custom_weights[meal.type] || 0);
    const sum = presentWeights.reduce((a, b) => a + b, 0);
    
    if (sum === 0) {
      // Fallback if custom weights are missing or all zero
      const equalWeight = 100 / meals.length;
      mealWeights = meals.map(() => equalWeight);
    } else {
      mealWeights = presentWeights.map(w => (w / sum) * 100);
    }
  } else {
    // Fallback/Default: Equal distribution
    const equalWeight = 100 / meals.length;
    mealWeights = meals.map(() => equalWeight);
  }

  return meals.map((meal, index) => ({
    meal_type: meal.type,
    time: meal.time,
    percentage: Number(mealWeights[index].toFixed(2)),
    calories: Math.round((target_calories * mealWeights[index]) / 100),
  }));
};

export const validateDistribution = (distribution: MealDistribution[]): ValidationResult => {
  const errors: string[] = [];
  const totalPercentage = distribution.reduce((acc, curr) => acc + curr.percentage, 0);
  
  if (Math.abs(totalPercentage - 100) > 0.5) {
    errors.push(`Total percentage is ${totalPercentage.toFixed(2)}%, should be 100% (tolerance 0.5%)`);
  }

  if (distribution.some(d => d.percentage <= 0)) {
    errors.push('All meals must have a percentage greater than 0');
  }

  return {
    isValid: errors.length === 0,
    totalPercentage,
    errors,
  };
};
