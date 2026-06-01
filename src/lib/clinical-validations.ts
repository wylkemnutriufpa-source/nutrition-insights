/**
 * CLINICAL VALIDATIONS — FitJourney 2.0
 * 
 * Comprehensive validation schemas for clinical data.
 * Ensures all inputs conform to clinical ranges and constraints.
 * 
 * CRITICAL: These validations prevent invalid data from entering
 * the clinical engine and ensure deterministic behavior.
 */

import { z } from 'zod';

// ──── Clinical Range Constants ────
export const CLINICAL_RANGES = {
  weight: {
    min: 30,
    max: 500,
    unit: 'kg',
    description: 'Peso deve estar entre 30kg e 500kg',
  },
  height: {
    min: 50,
    max: 250,
    unit: 'cm',
    description: 'Altura deve estar entre 50cm e 250cm',
  },
  age: {
    min: 1,
    max: 150,
    unit: 'anos',
    description: 'Idade deve estar entre 1 e 150 anos',
  },
  bmi: {
    min: 10,
    max: 60,
    description: 'IMC deve estar entre 10 e 60',
  },
  kcal: {
    min: 800,
    max: 5000,
    description: 'Calorias devem estar entre 800 e 5000 kcal',
  },
  protein: {
    min: 0,
    max: 500,
    unit: 'g',
    description: 'Proteína deve estar entre 0 e 500g',
  },
  carbs: {
    min: 0,
    max: 500,
    unit: 'g',
    description: 'Carboidratos devem estar entre 0 e 500g',
  },
  fat: {
    min: 0,
    max: 200,
    unit: 'g',
    description: 'Gordura deve estar entre 0 e 200g',
  },
};

// ──── Metabolic Profile Schema ────
export const metabolicProfileSchema = z.object({
  weight: z
    .number()
    .min(CLINICAL_RANGES.weight.min, CLINICAL_RANGES.weight.description)
    .max(CLINICAL_RANGES.weight.max, CLINICAL_RANGES.weight.description),
  height: z
    .number()
    .min(CLINICAL_RANGES.height.min, CLINICAL_RANGES.height.description)
    .max(CLINICAL_RANGES.height.max, CLINICAL_RANGES.height.description),
  age: z
    .number()
    .int()
    .min(CLINICAL_RANGES.age.min, CLINICAL_RANGES.age.description)
    .max(CLINICAL_RANGES.age.max, CLINICAL_RANGES.age.description),
  gender: z.enum(['male', 'female'], {
    errorMap: () => ({ message: 'Gênero deve ser "male" ou "female"' }),
  }),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active'], {
    errorMap: () => ({
      message: 'Nível de atividade deve ser: sedentary, light, moderate, active, very_active',
    }),
  }),
  goal: z.enum(['lose_weight', 'maintain', 'gain_muscle', 'gain_weight', 'improve_health', 'athletic_performance'], {
    errorMap: () => ({
      message: 'Objetivo deve ser: lose_weight, maintain, gain_muscle, gain_weight, improve_health, athletic_performance',
    }),
  }),
});

export type MetabolicProfile = z.infer<typeof metabolicProfileSchema>;

// ──── Macros Schema ────
export const macrosSchema = z
  .object({
    kcal: z
      .number()
      .min(CLINICAL_RANGES.kcal.min, CLINICAL_RANGES.kcal.description)
      .max(CLINICAL_RANGES.kcal.max, CLINICAL_RANGES.kcal.description),
    protein_g: z
      .number()
      .min(CLINICAL_RANGES.protein.min, CLINICAL_RANGES.protein.description)
      .max(CLINICAL_RANGES.protein.max, CLINICAL_RANGES.protein.description),
    carbs_g: z
      .number()
      .min(CLINICAL_RANGES.carbs.min, CLINICAL_RANGES.carbs.description)
      .max(CLINICAL_RANGES.carbs.max, CLINICAL_RANGES.carbs.description),
    fat_g: z
      .number()
      .min(CLINICAL_RANGES.fat.min, CLINICAL_RANGES.fat.description)
      .max(CLINICAL_RANGES.fat.max, CLINICAL_RANGES.fat.description),
  })
  .refine(
    (data) => {
      // Validar que macros correspondem às calorias (tolerância ±5%)
      const calculatedKcal = data.protein_g * 4 + data.carbs_g * 4 + data.fat_g * 9;
      const tolerance = data.kcal * 0.05;
      return Math.abs(calculatedKcal - data.kcal) <= tolerance;
    },
    {
      message: 'Macros não correspondem às calorias (tolerância ±5%)',
      path: ['kcal'],
    }
  );

export type Macros = z.infer<typeof macrosSchema>;

// ──── Food Item Schema ────
export const foodItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  kcal: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.kcal.max),
  protein_g: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.protein.max),
  carbs_g: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.carbs.max),
  fat_g: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.fat.max),
  quantity_display: z.string().min(1).max(100),
  clinical_mass_g: z.number().min(0).optional(),
  description: z.string().optional(),
});

export type FoodItem = z.infer<typeof foodItemSchema>;

// ──── Meal Plan Item Schema ────
export const mealPlanItemSchema = z.object({
  meal_plan_id: z.string().uuid(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  tipo_refeicao: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  meta_calorias: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.kcal.max),
  meta_proteinas: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.protein.max),
  meta_carboidratos: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.carbs.max),
  meta_gorduras: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.fat.max),
  quantity_display: z.string().min(1).max(100),
  clinical_mass_g: z.number().min(0).optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
});

export type MealPlanItem = z.infer<typeof mealPlanItemSchema>;

// ──── Meal Plan Schema ────
export const mealPlanSchema = z.object({
  patient_id: z.string().uuid(),
  nutritionist_id: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  total_calories: z
    .number()
    .min(CLINICAL_RANGES.kcal.min)
    .max(CLINICAL_RANGES.kcal.max),
  total_protein: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.protein.max),
  total_carbs: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.carbs.max),
  total_fat: z
    .number()
    .min(0)
    .max(CLINICAL_RANGES.fat.max),
  start_date: z.string().datetime(),
  is_active: z.boolean(),
});

export type MealPlan = z.infer<typeof mealPlanSchema>;

// ──── Substitution Compatibility Schema ────
export const substitutionCompatibilitySchema = z.object({
  original: foodItemSchema,
  substitute: foodItemSchema,
  tolerance: z.number().min(0).max(1).default(0.1), // ±10% by default
});

// ──── Validation Functions ────

/**
 * Validate metabolic profile
 */
export function validateMetabolicProfile(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    metabolicProfileSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Validate macros
 */
export function validateMacros(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    macrosSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Validate food item
 */
export function validateFoodItem(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    foodItemSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Validate meal plan item
 */
export function validateMealPlanItem(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    mealPlanItemSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Validate meal plan
 */
export function validateMealPlan(data: unknown): { valid: boolean; errors?: string[] } {
  try {
    mealPlanSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Erro desconhecido na validação'] };
  }
}

/**
 * Validate substitution compatibility
 * Checks if substitute macros are within tolerance of original
 */
export function validateSubstitutionCompatibility(
  original: FoodItem,
  substitute: FoodItem,
  tolerance: number = 0.1
): { compatible: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Check kcal
  const kcalDiff = Math.abs(substitute.kcal - original.kcal) / original.kcal;
  if (kcalDiff > tolerance) {
    errors.push(`Calorias diferem ${(kcalDiff * 100).toFixed(1)}% (tolerância: ${(tolerance * 100).toFixed(1)}%)`);
  }

  // Check protein
  if (original.protein_g > 0) {
    const proteinDiff = Math.abs(substitute.protein_g - original.protein_g) / original.protein_g;
    if (proteinDiff > tolerance) {
      errors.push(`Proteína difere ${(proteinDiff * 100).toFixed(1)}% (tolerância: ${(tolerance * 100).toFixed(1)}%)`);
    }
  }

  // Check carbs
  if (original.carbs_g > 0) {
    const carbsDiff = Math.abs(substitute.carbs_g - original.carbs_g) / original.carbs_g;
    if (carbsDiff > tolerance) {
      errors.push(`Carboidratos diferem ${(carbsDiff * 100).toFixed(1)}% (tolerância: ${(tolerance * 100).toFixed(1)}%)`);
    }
  }

  // Check fat
  if (original.fat_g > 0) {
    const fatDiff = Math.abs(substitute.fat_g - original.fat_g) / original.fat_g;
    if (fatDiff > tolerance) {
      errors.push(`Gordura difere ${(fatDiff * 100).toFixed(1)}% (tolerância: ${(tolerance * 100).toFixed(1)}%)`);
    }
  }

  return {
    compatible: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Calculate BMI
 */
export function calculateBMI(weight: number, height: number): number {
  if (height <= 0) throw new Error('Altura deve ser maior que 0');
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

/**
 * Validate BMI
 */
export function validateBMI(weight: number, height: number): { valid: boolean; bmi?: number; message?: string } {
  try {
    const bmi = calculateBMI(weight, height);
    if (bmi < CLINICAL_RANGES.bmi.min || bmi > CLINICAL_RANGES.bmi.max) {
      return {
        valid: false,
        bmi,
        message: `IMC ${bmi} fora do range clínico (${CLINICAL_RANGES.bmi.min}-${CLINICAL_RANGES.bmi.max})`,
      };
    }
    return { valid: true, bmi };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Erro ao calcular IMC',
    };
  }
}

/**
 * Validate clinical input (comprehensive)
 */
export function validateClinicalInput(data: unknown): {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate metabolic profile
  const profileValidation = validateMetabolicProfile(data);
  if (!profileValidation.valid) {
    errors.push(...(profileValidation.errors || []));
    return { valid: false, errors };
  }

  const profile = data as MetabolicProfile;

  // Validate BMI
  const bmiValidation = validateBMI(profile.weight, profile.height);
  if (!bmiValidation.valid) {
    warnings.push(bmiValidation.message || 'BMI fora do range esperado');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
