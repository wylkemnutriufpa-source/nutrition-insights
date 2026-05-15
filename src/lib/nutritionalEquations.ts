
/**
 * FitJourney — Professional Nutritional Equations
 * ----------------------------------------------------------------
 * Cálculos baseados em evidência para TMB e Gasto Calórico Total.
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'maintenance' | 'hypertrophy' | 'weight_loss';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

/**
 * Harris-Benedict Equation (Revised)
 */
export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
}

/**
 * TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Target Macros based on Goal
 */
export function calculateTargetMacros(weight: number, tdee: number, goal: Goal) {
  let targetCalories = tdee;
  
  if (goal === 'weight_loss') {
    targetCalories = tdee - 500; // Standard deficit
  } else if (goal === 'hypertrophy') {
    targetCalories = tdee + 300; // Standard surplus
  }

  // Protein based on goal (g/kg)
  let proteinRatio = 2.0; // default for athletes/active
  if (goal === 'weight_loss') proteinRatio = 2.2;
  if (goal === 'maintenance') proteinRatio = 1.6;
  
  const protein_g = weight * proteinRatio;
  const protein_kcal = protein_g * 4;

  // Fat based on kcal (approx 25%)
  const fat_kcal = targetCalories * 0.25;
  const fat_g = fat_kcal / 9;

  // Carbs (remaining)
  const carb_kcal = targetCalories - protein_kcal - fat_kcal;
  const carb_g = carb_kcal / 4;

  return {
    calories: Math.round(targetCalories),
    protein: Math.round(protein_g),
    carbs: Math.round(carb_g),
    fat: Math.round(fat_g)
  };
}
