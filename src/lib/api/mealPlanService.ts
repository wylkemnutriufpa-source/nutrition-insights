/**
 * 🛡️ DEFENSE IN DEPTH - Serviço de Meal Plan com 3 Camadas de Proteção
 * 
 * CAMADA 1: Database Contracts (Transações)
 * CAMADA 2: API Contracts (Validação com Zod)
 * CAMADA 3: Client State Isolation (Tipagem forte)
 * 
 * Este serviço demonstra como blindar operações críticas contra cascata de erros.
 */

import { supabase } from '@/integrations/supabase/client';
import { validateRequest } from '@/lib/validation/validateRequest';
import { withTransaction, withSequentialTransaction } from '@/lib/safeTransaction';
import {
  MealPlanCreateSchema,
  MealPlanUpdateSchema,
  MealPlanSnapshotV3Schema,
  type MealPlanCreate,
  type MealPlanUpdate,
  type MealPlanSnapshotV3,
} from '@/lib/validation/schemas';
import { logAudit, logError } from '@/lib/monitoring';

/**
 * Cria um novo plano de refeição com validação e transação
 * 
 * FLUXO:
 * 1. Validar entrada (Zod)
 * 2. Verificar permissões
 * 3. Executar em transação
 * 4. Retornar resultado tipado
 */
export async function createMealPlan(
  data: unknown,
  nutritionistId: string
): Promise<{ id: string; title: string; plan_status: string }> {
  // CAMADA 2: Validar entrada
  const validated = await validateRequest(
    MealPlanCreateSchema,
    data,
    'CreateMealPlan'
  );

  // CAMADA 1: Executar em transação com fallback
  return withTransaction(
    async () => {
      // Verificar permissão: nutricionista pode criar plano para paciente
      const { data: patient, error: patientError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('user_id', validated.patient_id)
        .maybeSingle();

      if (patientError || !patient) {
        throw new Error(`Patient not found: ${validated.patient_id}`);
      }

      // Verificar se nutricionista está no mesmo tenant
      const { data: nutritionist, error: nutritionistError } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('user_id', nutritionistId)
        .maybeSingle();

      if (nutritionistError || !nutritionist) {
        throw new Error(`Nutritionist not found: ${nutritionistId}`);
      }

      if (patient.tenant_id !== nutritionist.tenant_id) {
        throw new Error('Nutritionist and patient must be in the same tenant');
      }

      // Criar plano
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .insert({
          patient_id: validated.patient_id,
          title: validated.title,
          start_date: validated.start_date,
          plan_mode: validated.plan_mode as "single_day" | "weekly",
          plan_status: 'draft',
          generated_by: nutritionistId,
          tenant_id: patient.tenant_id,
        })
        .select('id, title, plan_status')
        .single();

      if (planError || !plan) {
        throw new Error(`Failed to create meal plan: ${planError?.message}`);
      }

      logAudit('meal_plan_created', {
        planId: plan.id,
        patientId: validated.patient_id,
        nutritionistId,
      });

      return plan;
    },
    'CreateMealPlan',
    async () => {
      // Fallback: retornar erro claro em vez de deixar app quebrado
      throw new Error('Failed to create meal plan after retries');
    },
    { timeout: 10000, retries: 2 }
  );
}

/**
 * Atualiza um plano de refeição existente
 */
export async function updateMealPlan(
  planId: string,
  data: unknown,
  userId: string
): Promise<{ id: string; title: string; plan_status: string }> {
  // CAMADA 2: Validar entrada
  const validated = await validateRequest(
    MealPlanUpdateSchema,
    data,
    'UpdateMealPlan'
  );

  // CAMADA 1: Executar em transação
  return withTransaction(
    async () => {
      // Verificar permissão: apenas criador ou admin pode atualizar
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select('id, generated_by, plan_status')
        .eq('id', planId)
        .maybeSingle();

      if (planError || !plan) {
        throw new Error(`Meal plan not found: ${planId}`);
      }

      if (plan.generated_by !== userId) {
        throw new Error('Only the creator can update this meal plan');
      }

      // Não permitir atualizar planos publicados
      if (plan.plan_status === 'active' || plan.plan_status === 'completed') {
        throw new Error('Cannot update published meal plans');
      }

      // Atualizar
      const { data: updated, error: updateError } = await supabase
        .from('meal_plans')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .select('id, title, plan_status')
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update meal plan: ${updateError?.message}`);
      }

      logAudit('meal_plan_updated', { planId, userId });

      return updated;
    },
    'UpdateMealPlan',
    undefined,
    { timeout: 10000, retries: 2 }
  );
}

/**
 * Publica um plano de refeição (transição de draft → active)
 * Operação crítica que envolve múltiplos passos
 */
export async function publishMealPlan(
  planId: string,
  snapshot: unknown,
  userId: string
): Promise<{ id: string; plan_status: string; updated_at: string }> {
  // CAMADA 2: Validar snapshot
  const validatedSnapshot = await validateRequest(
    MealPlanSnapshotV3Schema,
    snapshot,
    'PublishMealPlan - Snapshot'
  );

  // CAMADA 1: Executar em múltiplos passos com rollback
  return withSequentialTransaction(
    [
      {
        name: 'VerifyPlan',
        fn: async () => {
          const { data: plan, error } = await supabase
            .from('meal_plans')
            .select('id, plan_status, generated_by')
            .eq('id', planId)
            .maybeSingle();

          if (error || !plan) {
            throw new Error(`Meal plan not found: ${planId}`);
          }

          if (plan.generated_by !== userId) {
            throw new Error('Only the creator can publish this meal plan');
          }

          if (plan.plan_status !== 'draft') {
            throw new Error(`Cannot publish plan with status: ${plan.plan_status}`);
          }

          return plan;
        },
      },
      {
        name: 'SaveSnapshot',
        fn: async () => {
          const { data: updated, error } = await supabase
            .from('meal_plans')
            .update({
              snapshot: validatedSnapshot,
              plan_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', planId)
            .select('id, plan_status, updated_at')
            .single();

          if (error || !updated) {
            throw new Error(`Failed to save snapshot: ${error?.message}`);
          }

          return updated;
        },
      },
      {
        name: 'NotifyPatient',
        fn: async (results: any) => {
          // Enviar notificação ao paciente (não-crítico, falha silenciosa)
          try {
            await supabase.functions.invoke('notify-patient-plan-published', {
              body: { planId, patientId: results.VerifyPlan.patient_id },
            });
          } catch (e) {
            console.warn('Failed to notify patient, but plan was published', e);
          }
          return results;
        },
      },
    ],
    'PublishMealPlan'
  );
}

/**
 * Deleta um plano de refeição (apenas drafts)
 */
export async function deleteMealPlan(
  planId: string,
  userId: string
): Promise<{ success: boolean }> {
  return withTransaction(
    async () => {
      // Verificar permissão e status
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select('id, generated_by, plan_status')
        .eq('id', planId)
        .maybeSingle();

      if (planError || !plan) {
        throw new Error(`Meal plan not found: ${planId}`);
      }

      if (plan.generated_by !== userId) {
        throw new Error('Only the creator can delete this meal plan');
      }

      if (plan.plan_status !== 'draft') {
        throw new Error('Can only delete draft meal plans');
      }

      // Deletar
      const { error: deleteError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (deleteError) {
        throw new Error(`Failed to delete meal plan: ${deleteError.message}`);
      }

      logAudit('meal_plan_deleted', { planId, userId });

      return { success: true };
    },
    'DeleteMealPlan',
    undefined,
    { timeout: 5000, retries: 1 }
  );
}

/**
 * Recupera um plano com validação de acesso
 */
export async function getMealPlan(
  planId: string,
  userId: string
): Promise<any> {
  const { data: plan, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error || !plan) {
    throw new Error(`Meal plan not found: ${planId}`);
  }

  // Verificar acesso: criador, paciente, ou admin
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (userError || !user) {
    throw new Error('User not found');
  }

  const isCreator = plan.generated_by === userId;
  const isPatient = plan.patient_id === userId;
  const isAdmin = false; // TODO: verificar role

  if (!isCreator && !isPatient && !isAdmin) {
    throw new Error('Access denied to this meal plan');
  }

  return plan;
}
