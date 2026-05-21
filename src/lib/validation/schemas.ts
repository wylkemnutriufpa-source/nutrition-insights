/**
 * 🛡️ DEFENSE IN DEPTH - CAMADA 2: API Contracts
 * 
 * Validação centralizada de todos os dados que entram/saem do sistema.
 * Usando Zod para garantir type-safety em runtime.
 * 
 * Princípios:
 * - Validar TUDO que vem do cliente
 * - Validar TUDO que vem do banco
 * - Falhar rápido com mensagens claras
 * - Nunca confiar em dados não-validados
 */

import { z } from 'zod';

// ============================================================================
// PRIMITIVOS VALIDADOS
// ============================================================================

export const UUIDSchema = z.string().uuid('ID deve ser um UUID válido');
export const EmailSchema = z.string().email('Email inválido');
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-()]{10,}$/, 'Telefone inválido');
export const DateSchema = z.string().date('Data deve estar em formato YYYY-MM-DD');
export const ISODateTimeSchema = z.string().datetime('DateTime deve estar em formato ISO 8601');

// Macros com limites clínicos
export const MacroSchema = z.object({
  kcal: z.number().int().min(0).max(10000, 'Calorias fora do intervalo clínico'),
  protein_g: z.number().min(0).max(500, 'Proteína fora do intervalo clínico'),
  carbs_g: z.number().min(0).max(1000, 'Carboidratos fora do intervalo clínico'),
  fat_g: z.number().min(0).max(500, 'Gordura fora do intervalo clínico'),
});

export const QuantitySchema = z.object({
  value: z.number().positive('Quantidade deve ser positiva'),
  unit: z.enum(['g', 'ml', 'un', 'colher', 'xícara', 'prato']),
});

// ============================================================================
// MEAL PLAN SCHEMAS
// ============================================================================

export const MealPlanCreateSchema = z.object({
  patient_id: UUIDSchema,
  title: z.string().min(1).max(255),
  start_date: DateSchema,
  plan_mode: z.enum(['single_day', 'weekly', 'monthly']).default('weekly'),
  targets: MacroSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const MealPlanUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  notes: z.string().max(2000).optional(),
});

export const MealSchema = z.object({
  id: UUIDSchema.optional(),
  name: z.string().min(1).max(100),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora deve estar em formato HH:MM'),
  day_of_week: z.number().int().min(0).max(6),
  macros: MacroSchema.optional(),
});

export const FoodItemSchema = z.object({
  id: UUIDSchema.optional(),
  title: z.string().min(1).max(255),
  clinical_mass_g: z.number().int().min(5).max(1000, 'Gramagem deve estar entre 5g e 1000g'),
  quantity_display: z.string().min(1).max(50),
  macros: MacroSchema,
  visual: z.object({
    image_url: z.string().url().optional(),
    description: z.string().max(500).optional(),
  }).optional(),
  substitutions: z.array(z.object({
    id: UUIDSchema.optional(),
    title: z.string().min(1).max(255),
    clinical_mass_g: z.number().int().min(5).max(1000),
    macros: MacroSchema,
    visual: z.object({
      image_url: z.string().url().optional(),
    }).optional(),
  })).optional(),
});

export const MealPlanSnapshotV3Schema = z.object({
  snapshot_version: z.literal('v3'),
  targets: MacroSchema,
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    meals: z.array(MealSchema.extend({
      items: z.array(FoodItemSchema),
    })),
  })),
  created_at: ISODateTimeSchema,
  updated_at: ISODateTimeSchema,
});

// ============================================================================
// PATIENT SCHEMAS
// ============================================================================

export const PatientCreateSchema = z.object({
  full_name: z.string().min(2).max(255),
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional(),
  date_of_birth: DateSchema.optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),
  notes: z.string().max(2000).optional(),
});

export const PatientUpdateSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  phone: PhoneSchema.optional(),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// SUBSTITUTION SCHEMAS
// ============================================================================

export const SubstitutionCreateSchema = z.object({
  meal_plan_id: UUIDSchema,
  meal_plan_item_id: UUIDSchema,
  patient_id: UUIDSchema,
  substituted_food: z.string().min(1).max(255),
  original_food: z.string().min(1).max(255),
  substituted_calories: z.number().int().min(0).optional(),
  substituted_protein: z.number().min(0).optional(),
  date: DateSchema,
});

// ============================================================================
// ADHERENCE SCHEMAS
// ============================================================================

export const AdherenceStatusSchema = z.enum(['followed', 'partial', 'not_followed']);

export const MealCompletionSchema = z.object({
  patient_id: UUIDSchema,
  meal_plan_id: UUIDSchema,
  meal_plan_item_id: UUIDSchema,
  date: DateSchema,
  adherence_status: AdherenceStatusSchema,
  completed: z.boolean(),
  completed_at: ISODateTimeSchema.optional(),
});

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type MealPlanCreate = z.infer<typeof MealPlanCreateSchema>;
export type MealPlanUpdate = z.infer<typeof MealPlanUpdateSchema>;
export type MealPlanSnapshotV3 = z.infer<typeof MealPlanSnapshotV3Schema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type PatientCreate = z.infer<typeof PatientCreateSchema>;
export type PatientUpdate = z.infer<typeof PatientUpdateSchema>;
export type SubstitutionCreate = z.infer<typeof SubstitutionCreateSchema>;
export type MealCompletion = z.infer<typeof MealCompletionSchema>;
export type AdherenceStatus = z.infer<typeof AdherenceStatusSchema>;
export type Macro = z.infer<typeof MacroSchema>;
