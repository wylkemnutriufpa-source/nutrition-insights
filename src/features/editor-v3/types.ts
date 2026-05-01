export interface HouseholdMeasure {
  unit: string;
  factor: number;
}

export interface Food {
  id: string;
  name: string;
  kcal: number;
  calories: number; // Keep for backward compatibility
  protein: number;
  carbs: number;
  fat: number;
  portionValue: number;
  portionUnitLabel: string;
  portionUnit: string; // Keep for backward compatibility
  portionLabel: string; // Keep for backward compatibility
  measurementType: 'unit' | 'gram' | 'spoon' | 'ml';
  category?: string;
  isMarmita?: boolean;
  locked?: boolean;
  imageUrl?: string;
  usageCount?: number;
  householdMeasures?: HouseholdMeasure[];
  ingredients?: any[];
  instructions?: string;
  isVisualLibraryItem?: boolean;
  nutritionistId?: string;
}

export interface MealItem extends Food {
  instanceId: string;
  quantity: number; 
  selectedUnit?: string;
  substitutions?: Food[];
  description?: string;
  instructions?: string;
  ingredients?: any[];
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  daySubstitutions?: Record<string, string>;
  selectionMode?: 'day' | 'week';
  time?: string;
  icon?: string;
  description?: string;
  imageUrl?: string;
  imageSource?: 'auto' | 'manual';
}

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  items: Food[];
}
