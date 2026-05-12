export type ReconcilePriority = 
  | 'protein_fixed' 
  | 'fat_semifixed' 
  | 'carb_primary_pivot' 
  | 'fiber_secondary_pivot';

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface ClinicalProfile {
  sex: 'male' | 'female';
  weight: number;
  height: number;
  age: number;
  activityLevel: string;
  goal: string;
  role?: string;
  elasticity?: number;
}

export interface MealItem {
  id: string;
  name: string;
  grams: number;
  macro_role: 'protein' | 'carb' | 'fat' | 'fiber' | 'fixed';
  macros_per_100g: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
}

export interface ReconcileResult {
  items: MealItem[];
  totals: MacroTargets;
  violations: string[];
}
