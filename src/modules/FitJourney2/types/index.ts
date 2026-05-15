export type MacroType = 'carb' | 'protein' | 'fat' | 'fiber';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number; // em gramas ou unidades
  category: 'proteína' | 'carboidrato' | 'gordura' | 'fruta' | 'laticínio' | 'marmita';
}

export interface Meal {
  id: string;
  name: string;
  type: 'Café da Manhã' | 'Lanche da Manhã' | 'Almoço' | 'Lanche da Tarde' | 'Jantar' | 'Ceia';
  items: { foodId: string; quantity: number }[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DailyPlan {
  id: string;
  templateName?: string;
  meals: Meal[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: 'hipertrofia' | 'emagrecimento' | 'performance' | 'saúde';
  meals: Omit<Meal, 'id'>[];
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
