import { z } from "zod";

/**
 * Macro tolerance configuration (default 5%)
 */
const MACRO_TOLERANCE_PERCENT = 0.05;

/**
 * Schema for a single weekly plan output.
 * Validates the core structure, data types, and logical constraints.
 * Includes calorie/macro consistency checks within a configurable tolerance.
 */
export const WeeklyPlanSchema = z.object({
  week: z.number().int().min(1),
  calories: z.number().min(1200).describe("Target calories for the week, minimum safe level is 1200"),
  macros: z.object({
    p: z.number().nonnegative().describe("Protein in grams"),
    c: z.number().nonnegative().describe("Carbohydrates in grams"),
    f: z.number().nonnegative().describe("Fats in grams"),
  }),
  strategy: z.string().min(1).describe("Clinical strategy used for this week (e.g., deficit, surplus, maintenance)"),
}).refine((data) => {
  // 1. Calculate calories from macros (P*4 + C*4 + F*9)
  const calculatedKcal = (data.macros.p * 4) + (data.macros.c * 4) + (data.macros.f * 9);
  
  // 2. Check if calculated calories are within tolerance of target calories
  const diff = Math.abs(calculatedKcal - data.calories);
  const maxAllowedDiff = data.calories * MACRO_TOLERANCE_PERCENT;
  
  return diff <= maxAllowedDiff;
}, {
  message: "Weekly macro totals (P*4 + C*4 + F*9) must match total calories within 5% tolerance",
  path: ["macros"]
});

/**
 * Schema for a longitudinal plan (10+ weeks).
 * Verifies that the sequence is coherent and follows the expected output format.
 */
export const LongitudinalPlanSchema = z.array(WeeklyPlanSchema).min(10, "Longitudinal plans must cover at least 10 weeks");

/**
 * Validates a single weekly plan against the schema.
 */
export function validateWeeklyPlan(plan: unknown) {
  return WeeklyPlanSchema.safeParse(plan);
}

/**
 * Validates a sequence of weekly plans (longitudinal).
 */
export function validateLongitudinalPlan(plans: unknown) {
  return LongitudinalPlanSchema.safeParse(plans);
}

export type WeeklyPlanOutput = z.infer<typeof WeeklyPlanSchema>;
export type LongitudinalPlanOutput = z.infer<typeof LongitudinalPlanSchema>;
