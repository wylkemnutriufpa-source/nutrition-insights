export type MacroType = 'carb' | 'protein' | 'fat' | 'fiber';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number; // em gramas ou unidades
  category: 'protein' | 'carb' | 'fat' | 'fruit' | 'dairy' | 'marmita';
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
  items: { foodId: string; quantity: number }[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DailyPlan {
  meals: Meal[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface UserProfile {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: number;
  goal: 'loss' | 'maintenance' | 'gain';
  targetCalories?: number;
  targetProtein?: number;
}
