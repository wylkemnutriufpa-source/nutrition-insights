export interface Macronutrients {
  protein: number;
  carbs: number;
  fats: number;
  calories: number;
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: number; // in grams
  servingUnit: string;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  caloriesPer100g: number;
  category: 'protein' | 'carb' | 'fat' | 'fruit' | 'dairy' | 'vegetable';
  householdMeasures: HouseholdMeasure[];
}

export interface HouseholdMeasure {
  unit: string;
  weight: number; // in grams
}

export interface Meal {
  id: string;
  name: string;
  items: SelectedFood[];
  targetMacros: Macronutrients;
  actualMacros: Macronutrients;
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'pre-workout' | 'post-workout';
}

export interface SelectedFood extends FoodItem {
  amount: number; // in grams
  calculatedMacros: Macronutrients;
}

export interface NutritionPlan {
  id: string;
  patientId: string;
  dailyTargets: Macronutrients;
  meals: Meal[];
  createdAt: string;
}
