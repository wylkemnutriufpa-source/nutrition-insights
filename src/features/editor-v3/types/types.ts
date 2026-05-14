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
  protein_g?: number; // Keep for backward compatibility
  carbs: number;
  carbs_g?: number; // Keep for backward compatibility
  fat: number;
  fat_g?: number; // Keep for backward compatibility
  // V3 - Anti-Loop Metrics (Standard 100g base)
  kcal_100g?: number;
  protein_100g?: number;
  carb_100g?: number;
  fat_100g?: number;
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
  isVisualLibraryParent?: boolean; // V3: Define se este item governa a imagem da refeição
  portionMode?: 'standard' | 'free'; // V3: Define se o item tem gramagem ou é livre
  library_item_slug?: string;      // V3: Referência ao slug da biblioteca soberana
  composition_metadata?: any;      // V3: Estrutura da refeição (ingredientes, pesos base)
  nutritionistId?: string;
}

export interface MealItem extends Food {
  instanceId: string;
  quantity: number; // display_quantity: UI only (e.g., 6 spoons, 2 units)
  clinical_mass_g?: number; // clinical_mass_g: SINGLE SOURCE OF TRUTH for math
  unit_count?: number; // Physical count of units
  display_unit?: string; // UI unit label
  blockId?: string; // Weekly block reference (governance)
  manual_override?: boolean; // If true, ignore weekly block propagation
  substitution_group_id?: string;
  correlation_id?: string;
  selectedUnit?: string;
  substitutions: Food[];
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
  weight_source?: 'profile' | 'weight_history' | 'assessment' | 'anamnesis' | 'dynamic_fallback' | 'fallback' | string;
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

export interface V3DietTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  template_type: string;
  objective: string;
  meal_distribution: Array<{ slot: string; time: string }>;
  cluster_map: Record<string, string>;
  kcal_profiles: number[];
  visual_style: string;
  substitutions_enabled: boolean;
  editable: boolean;
  active: boolean;
}
