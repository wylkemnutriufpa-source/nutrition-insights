
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

/**
 * Contract: Draft Integrity
 * - meals nunca pode ser null
 * - items sempre com instanceId único
 * - locked nunca pode ser removido automaticamente
 */
export const validateDraftIntegrity = (data: any) => {
  const result = DraftPayloadSchema.safeParse(data);
  if (!result.success) {
    console.error("[Contract Violation] Draft Integrity:", result.error.format());
    throw new Error("Draft Integrity Contract Violated");
  }

  // Check unique instanceIds
  const instanceIds = new Set();
  data.meals.forEach((meal: any) => {
    meal.items.forEach((item: any) => {
      if (instanceIds.has(item.instanceId)) {
        throw new Error(`Duplicate instanceId found: ${item.instanceId}`);
      }
      instanceIds.add(item.instanceId);
    });
  });

  return result.data;
};

/**
 * Contract: Clinical Validity
 */
export const validateClinicalValidity = (data: any) => {
  // Placeholder for clinical rules
  // Example: Total calories shouldn't be zero if items exist
  let totalKcal = 0;
  if (!data.meals) return true;
  data.meals.forEach((meal: any) => {
    if (!meal.items) return;
    meal.items.forEach((item: any) => {
      totalKcal += (Number(item.kcal || 0) * Number(item.quantity || 0));
    });
  });

  if (totalKcal === 0 && data.meals.some((m: any) => m.items.length > 0)) {
    throw new Error("Clinical Validity Violation: Items exist but total calories is zero");
  }

  return true;
};
