import { z } from 'zod';

// Schema para HouseholdMeasure
const householdMeasureSchema = z.object({
  unit: z.string(),
  factor: z.number(),
});

// Schema para Food (base)
const foodSchema = z.object({
  id: z.string(),
  name: z.string(),
  kcal: z.number().catch(0),
  calories: z.number().catch(0),
  protein: z.number().catch(0),
  carbs: z.number().catch(0),
  fat: z.number().catch(0),
  portionValue: z.number().default(100),
  portionUnitLabel: z.string().default('g'),
  measurementType: z.enum(['unit', 'gram', 'spoon', 'ml']).default('gram'),
  category: z.string().optional(),
  isMarmita: z.boolean().optional(),
  locked: z.boolean().optional(),
  imageUrl: z.string().optional(),
  householdMeasures: z.array(householdMeasureSchema).optional(),
});

// Schema para MealItem (herda de foodSchema)
const mealItemSchema = foodSchema.extend({
  instanceId: z.string(),
  quantity: z.number().default(100),
  selectedUnit: z.string().optional(),
  substitutions: z.array(foodSchema).default([]),
  description: z.string().optional(),
});

// Schema para Meal
const mealSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(mealItemSchema).default([]),
  time: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  imageSource: z.enum(['auto', 'manual', 'fallback']).optional(),
});

// Schema Principal do Estado do Editor V3
export const editorV3StateSchema = z.object({
  meals: z.array(mealSchema),
  patientId: z.string().nullable(),
  planStatus: z.enum(['draft', 'saving', 'saved']).default('draft'),
  viewMode: z.enum(['daily', 'weekly']).default('daily'),
  auditLog: z.array(z.any()).default([]),
  sharingToken: z.string().nullable().default(null),
});

/**
 * Valida o estado persistido antes da hidratação.
 * Se houver corrupção grave, retorna null para forçar o reset ao estado inicial seguro.
 */
export function validatePersistedState(state: any) {
  try {
    const result = editorV3StateSchema.safeParse(state);
    if (!result.success) {
      console.warn('[Zustand Guard] Estado corrompido detectado na hidratação:', result.error.format());
      return null;
    }
    return result.data;
  } catch (e) {
    console.error('[Zustand Guard] Falha crítica na validação do estado:', e);
    return null;
  }
}
