export interface HouseholdMeasure {
  unit: string;
  factor: number;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portionValue: number;
  portionUnit: string;
  portionLabel: string;
  isMarmita?: boolean;
  locked?: boolean;
  imageUrl?: string;
  usageCount?: number;
  householdMeasures?: HouseholdMeasure[];
}

export interface MealItem extends Food {
  instanceId: string;
  quantity: number; 
  selectedUnit?: string;
  substitutions?: Food[];
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  daySubstitutions?: Record<string, string>;
  selectionMode?: 'day' | 'week';
  time?: string;
  icon?: string;
}
