import { z } from "zod";

export const SnapshotMacrosSchema = z.object({
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export const SnapshotTargetsSchema = SnapshotMacrosSchema.extend({
  goal: z.string().nullable().optional(),
});

export const SnapshotPatientContextSchema = z.object({
  id: z.string(),
  weight_kg: z.number().nullable(),
  weight_source: z.string().nullable(),
  height_cm: z.number().nullable(),
  age: z.number().nullable(),
  gender: z.string().nullable(),
  activity_level: z.string().nullable(),
  goal: z.string().nullable(),
});

export const SnapshotSubstitutionSchema = z.object({
  food_id: z.string().nullable().optional(),
  name: z.string(),
  grams: z.number().nullable(),
  unit_label: z.string().nullable().optional(),
  macros: SnapshotMacrosSchema.nullable().optional(),
  equivalence_pct: z.number().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export const SnapshotItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  visual_library_item_id: z.string().nullable(),
  is_primary: z.boolean(),
  is_locked: z.boolean(),
  substitution_group_id: z.string().nullable(),
  target_percentage: z.number().nullable(),
  macros: SnapshotMacrosSchema,
  substitutions: z.array(SnapshotSubstitutionSchema),
  clinical_mass_g: z.number(), // OBRIGATÓRIO NA BLINDAGEM
  display_quantity: z.number(), // OBRIGATÓRIO NA BLINDAGEM
  display_unit: z.string(), // OBRIGATÓRIO NA BLINDAGEM
});

export const SnapshotMealSchema = z.object({
  meal_type: z.string(),
  totals: SnapshotMacrosSchema,
  items: z.array(SnapshotItemSchema),
});

export const SnapshotDaySchema = z.object({
  day_of_week: z.number(),
  totals: SnapshotMacrosSchema,
  meals: z.array(SnapshotMealSchema),
});

export const SnapshotPlanMetadataSchema = z.object({
  plan_id: z.string(),
  patient_id: z.string(),
  nutritionist_id: z.string(),
  tenant_id: z.string().nullable(),
  title: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  plan_type: z.string().nullable(),
  plan_mode: z.string().nullable(),
  template_id: z.string().nullable(),
  template_slug: z.string().nullable(),
  template_version: z.number().nullable(),
  generation_source: z.string().nullable(),
  protocol_used: z.string().nullable(),
  editor_version: z.string().optional().default("v3"), // OBRIGATÓRIO NA BLINDAGEM
});

export const MealPlanSnapshotV1Schema = z.object({
  schema_version: z.string(),
  engine_version: z.string(),
  generated_at: z.string(),
  hash: z.string(),
  plan: SnapshotPlanMetadataSchema,
  patient_context: SnapshotPatientContextSchema,
  targets: SnapshotTargetsSchema,
  days: z.array(SnapshotDaySchema),
  weekly_totals: SnapshotMacrosSchema,
  daily_average: SnapshotMacrosSchema,
});

export type MealPlanSnapshotV1 = z.infer<typeof MealPlanSnapshotV1Schema>;
