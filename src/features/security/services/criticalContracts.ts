import { z } from "zod";

// --- DTO Schemas ---

export const HouseholdMeasureSchema = z.object({
  unit: z.string(),
  factor: z.number(),
});

export const FoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  portionValue: z.number(),
  portionUnitLabel: z.string(),
  measurementType: z.enum(['unit', 'gram', 'spoon', 'ml']),
  isMarmita: z.boolean().optional(),
  locked: z.boolean().optional(),
  imageUrl: z.string().optional(),
  householdMeasures: z.array(HouseholdMeasureSchema).optional(),
});

export const MealItemSchema = FoodSchema.extend({
  instanceId: z.string().min(1, "InstanceId is required for item integrity"),
  quantity: z.number().min(0),
  selectedUnit: z.string().optional(),
});

export const MealSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(MealItemSchema),
  time: z.string().optional(),
});

export const DraftPayloadSchema = z.object({
  meals: z.array(MealSchema).min(1, "Plan must have at least one meal"),
  version: z.number(),
  patient_context: z.any().optional(),
});

// --- Contracts ---

export const validateDraftIntegrity = (data: any) => {
  const result = DraftPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const validateClinicalValidity = (data: any) => {
  return true;
};
