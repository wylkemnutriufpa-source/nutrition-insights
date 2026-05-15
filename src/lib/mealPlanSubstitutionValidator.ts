import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";

export type MealPlanItem = {
  id: string;
  title: string;
  meta_calorias?: number | null;
  meta_proteinas?: number | null;
  meta_carboidratos?: number | null;
  meta_gorduras?: number | null;
  tipo_refeicao?: string | null;
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
