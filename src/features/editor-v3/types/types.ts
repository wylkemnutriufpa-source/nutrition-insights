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

export interface AuditLogEntry {
  type: "image_change" | "plan_created" | "food_added" | "food_removed" | "quantity_updated" | "engine_action" | "save_attempt" | "save_blocked" | "system_action";
  description: string;
  source: "manual" | "engine" | "system";
  mealId?: string;
  itemId?: string;
  metadata?: any;
  created_at: string;
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
  imageSource?: 'auto' | 'manual' | 'fallback';
}

export interface PatientContext {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  goal?: string;
  activityLevel?: string;
  restrictions: string[];
  preferences: string[];
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  consent_given?: boolean;
  consent_date?: string;
  protocol_type?: string;
}

export interface PlanConfidence {
  value: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  breakdown: {
    objectiveAdherence: number;
    quality: number;
    consistency: number;
    restrictions: number;
  };
}

export interface DraftPayload {
  meals: Meal[];
  version: number;
  audit_log?: AuditLogEntry[];
  nutritional_score?: any;
  patient_context?: PatientContext;
  confidence?: PlanConfidence;
}

export interface MealTemplate {
  id: string;
  name: string;
  description: string;
  items: Food[];
}
