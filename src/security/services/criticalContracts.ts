/**
 * 🛡️ FITJOURNEY CRITICAL CONTRACTS
 * ----------------------------------------------------------------
 * Definição de esquemas obrigatórios para estabilidade estrutural.
 * Qualquer quebra nestes contratos deve BLOQUEAR a execução.
 */

import { z } from 'zod';

// 1. Contrato de Estado do Paciente (Single Source of Truth)
export const PatientFlowStateSchema = z.enum([
  'awaiting_consent',
  'onboarding_slides',
  'anamnesis',
  'collecting_profile',
  'ready_for_plan',
  'plan_generated',
  'active_plan'
]);

export type PatientFlowState = z.infer<typeof PatientFlowStateSchema>;

// 2. Contrato de Estrutura de Refeição (Engine & Editor)
export const MealItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  quantity: z.number().positive(),
  measurementType: z.enum(['gram', 'ml', 'spoon', 'unit']),
  portionLabel: z.string(),
  imageUrl: z.string().url().nullable().optional(),
  locked: z.boolean().default(false),
  substitutions: z.array(z.any()).default([]) // Contrato V3: sempre array
});

export const MealSchema = z.object({
  id: z.string(),
  name: z.string(),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  items: z.array(MealItemSchema),
  imageUrl: z.string().url().nullable().optional(),
  imageSource: z.enum(['auto', 'manual', 'fallback']).optional()
});

// 3. Contrato de Output da Engine (Geração de Plano)
export const EngineOutputSchema = z.object({
  success: z.boolean(),
  mealPlanId: z.string().uuid().optional(),
  items_count: z.number().nonnegative(),
  template_name_used: z.string().optional(),
  is_fallback_template: z.boolean().optional(),
  error: z.string().optional()
});

// 4. Contrato de Rascunho (V3 Draft)
export const DraftPayloadSchema = z.object({
  meals: z.array(MealSchema),
  version: z.number().int().positive(),
  audit_log: z.array(z.any()).optional()
});

/**
 * Validador de Integridade de Rascunho
 */
export function validateDraftIntegrity(payload: any) {
  const result = DraftPayloadSchema.safeParse(payload);
  if (!result.success) {
    console.error('[ContractViolation] Draft payload is inconsistent:', result.error.format());
    throw new Error(`ESTRUTURA DE DADOS CORROMPIDA: O rascunho falhou na validação de contrato.`);
  }
  return result.data;
}

/**
 * Validador de Fluxo Clínico
 */
export function validateClinicalValidity(data: { meals: any[] }) {
  const hasItems = data.meals.some(m => m.items && m.items.length > 0);
  if (!hasItems) {
    throw new Error(`VIOLAÇÃO CLÍNICA: Tentativa de processar plano sem refeições estruturadas.`);
  }
  
  // Verifica se existem macros zerados em itens com peso
  for (const meal of data.meals) {
    for (const item of meal.items) {
      if (item.kcal === 0 && item.quantity > 0) {
        throw new Error(`DADOS INCONSISTENTES: Item "${item.name}" possui calorias zeradas.`);
      }
    }
  }
}
