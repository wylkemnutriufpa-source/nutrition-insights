import { Meal } from "@/features/editor-v3/types/types";

export interface PatientPlan {
  id: string;
  patient_id: string;
  patient_name: string;
  goal: string;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  meals: Meal[];
  created_at: string;
  sharing_token?: string;
}

export interface MealCompletion {
  id: string;
  meal_plan_id: string;
  meal_id: string;
  completed_at: string;
  created_at: string;
}
