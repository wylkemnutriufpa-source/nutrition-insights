export interface NutritionalScore {
  total: number;
  breakdown: {
    calories: number;
    macros: number;
    distribution: number;
    quality: number;
  };
}

export interface ValidationIssue {
  type: 'calories' | 'protein' | 'carbs' | 'fat' | 'meal_empty' | 'restriction' | 'preference' | 'distribution';
  severity: 'ok' | 'attention' | 'critical';
  message: string;
  mealId?: string;
}
