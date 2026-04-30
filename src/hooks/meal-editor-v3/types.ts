export interface HouseholdMeasure {
  unit: string;
  factor: number; // multiplier for the base quantity (usually grams)
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
  daySubstitutions?: Record<string, string>; // dayId -> instanceId
  selectionMode?: 'day' | 'week';
  time?: string; // HH:MM
  icon?: string; // sun | coffee | utensils | moon | star | apple
}

export interface HistoryState {
  past: Meal[][];
  future: Meal[][];
}

export interface ClinicalLog {
  timestamp: string;
  conditionId: string;
  appliedRules: string[];
  changes: {
    type: 'removal' | 'substitution';
    foodName: string;
    reason: string;
  }[];
}
