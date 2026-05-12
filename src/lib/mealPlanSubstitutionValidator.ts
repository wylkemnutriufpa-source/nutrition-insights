import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";

export type MealPlanItem = {
  id: string;
  title: string;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  meal_type?: string | null;
  description?: string | null;
  metadata?: any;
  edit_metadata?: any;
};

export function validateMealSubstitutions(item: MealPlanItem, maxCount: number = 4, patientName?: string) {
  return { valid: true, errors: [], detailedErrors: [] };
}

export function validatePlanSubstitutions(items: MealPlanItem[], maxCount: number = 4, patientName?: string) {
  return { valid: true, errors: [], detailedErrors: [] };
}
