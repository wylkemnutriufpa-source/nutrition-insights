import { z } from "npm:zod";

// Base patient schema
export const PatientIdSchema = z.string().uuid();

// generate-meal-plan input schema
export const GenerateMealPlanSchema = z.object({
  patient_id: PatientIdSchema,
  generation_mode: z.enum(["quick", "smart", "clinical", "weekly_marmita", "fixed_marmita"]).optional().default("smart"),
  meal_plan_id: z.string().uuid().optional(),
  save_as_template: z.boolean().optional().default(false),
  enabled_meals: z.array(z.string()).optional(),
  meal_times: z.record(z.string(), z.string()).optional(),
  is_pipeline: z.boolean().optional().default(false),
  requested_nutritionist_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
});

// validate-meal-plan input schema
export const ValidateMealPlanSchema = z.object({
  meal_plan_id: z.string().uuid(),
  strict_mode: z.boolean().optional().default(true),
});

// apply-clinical-adjustment input schema
export const ApplyClinicalAdjustmentSchema = z.object({
  action: z.enum(["analyze", "suggest", "apply"]),
  patient_id: PatientIdSchema,
  plan_id: z.string().uuid().optional(),
  adjustments: z.array(z.object({
    mealItemId: z.string().uuid(),
    action: z.string(),
    value: z.any().optional(),
  })).optional(),
});

// compute-clinical-brain input schema
export const ClinicalBrainSchema = z.object({
  patient_id: PatientIdSchema,
  analysis_depth: z.enum(["shallow", "standard", "deep"]).optional().default("standard"),
});

// compute-clinical-outcome-predictions input schema
export const OutcomePredictionsSchema = z.object({
  patient_id: PatientIdSchema,
  prediction_window_days: z.number().int().min(7).max(90).optional().default(30),
});

// compute-clinical-simulation-engine input schema
export const SimulationEngineSchema = z.object({
  patient_id: PatientIdSchema,
  scenario: z.string(),
  parameters: z.record(z.any()).optional(),
});

// compute-metabolic-phase-strategy input schema
export const MetabolicPhaseSchema = z.object({
  patient_id: PatientIdSchema,
});

// classify-metabolic-profile input schema
export const ClassifyMetabolicProfileSchema = z.object({
  patient_id: PatientIdSchema,
});

// clinical-decision-support input schema
export const ClinicalDecisionSupportSchema = z.object({
  patient_id: PatientIdSchema,
  context: z.string().optional(),
});
