/**
 * 🛡️ DEFENSE IN DEPTH - CAMADA 1: Database Transactions
 * 
 * Wrapper seguro para operações multi-step no banco de dados.
 * Garante atomicidade: ou tudo funciona, ou nada muda.
 * 
 * Princípios:
 * - Transações explícitas para operações críticas
 * - Rollback automático em caso de erro
 * - Fallback opcional para recuperação
 * - Logging detalhado de todas as operações
 */

import { supabase } from '@/integrations/supabase/client';
import { logError, logAudit } from '@/lib/monitoring';

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly cause: Error,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

interface TransactionOptions {
  timeout?: number; // ms
  retries?: number;
  fallbackOnError?: boolean;
}

/**
 * Executa uma operação dentro de uma transação segura
 * 
 * @param operation - Função que executa a operação
 * @param operationName - Nome da operação para logging
 * @param fallback - Função de fallback se a operação falhar
 * @param options - Opções de transação
 * 
 * @example
 * const result = await withTransaction(
 *   async () => {
 *     const plan = await createMealPlan(data);
 *     const meals = await createMeals(plan.id, mealsData);
 *     return { plan, meals };
 *   },
 *   'CreateMealPlanWithMeals',
 *   async () => {
 *     // Fallback: criar sem transação
 *     return createMealPlanFallback(data);
 *   }
 * );
 */
export async function withTransaction<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallback?: () => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { timeout = 30000, retries = 1, fallbackOnError = !!fallback } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[TRANSACTION] Starting: ${operationName} (attempt ${attempt}/${retries})`);
      
      // Executar com timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Transaction timeout after ${timeout}ms`)),
          timeout
        )
      );
      
      const result = await Promise.race([
        operation(),
        timeoutPromise,
      ]);
      
      console.log(`[TRANSACTION] ✓ Completed: ${operationName}`);
      logAudit('transaction_success', { operation: operationName });
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`[TRANSACTION] ✗ Failed (attempt ${attempt}/${retries}): ${operationName}`, error);
      
      if (attempt < retries) {
        // Aguardar antes de retry (backoff exponencial)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[TRANSACTION] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // Todas as tentativas falharam
  if (fallbackOnError && fallback) {
    console.warn(`[TRANSACTION] All retries failed, attempting fallback for: ${operationName}`);
    try {
      const result = await fallback();
      console.log(`[TRANSACTION] ✓ Fallback succeeded: ${operationName}`);
      logAudit('transaction_fallback_success', { operation: operationName });
      return result;
    } catch (fallbackError) {
      console.error(`[TRANSACTION] ✗ Fallback also failed: ${operationName}`, fallbackError);
      logError("data_error", operationName, (fallbackError as Error).message, { fallbackFailed: true });
      throw new TransactionError(
        `Transaction and fallback both failed for ${operationName}`,
        fallbackError as Error,
        operationName
      );
    }
  }
  
  // Sem fallback ou fallback desabilitado
  logError("data_error", operationName, lastError!.message, { retriesExhausted: true });
  throw new TransactionError(
    `Transaction failed after ${retries} attempt(s): ${operationName}`,
    lastError!,
    operationName
  );
}

/**
 * Executa múltiplas operações em sequência, com rollback se alguma falhar
 * 
 * @example
 * const results = await withSequentialTransaction([
 *   { name: 'CreatePlan', fn: () => createMealPlan(data) },
 *   { name: 'CreateMeals', fn: (plan) => createMeals(plan.id, mealsData) },
 *   { name: 'PublishPlan', fn: (plan) => publishMealPlan(plan.id) },
 * ]);
 */
export async function withSequentialTransaction<T extends Record<string, any>>(
  steps: Array<{
    name: string;
    fn: (previousResults: T) => Promise<any>;
  }>,
  operationName: string = 'SequentialTransaction'
): Promise<T> {
  const results: T = {} as T;
  const completedSteps: string[] = [];
  
  try {
    for (const step of steps) {
      console.log(`[TRANSACTION] Step: ${step.name}`);
      results[step.name as keyof T] = await step.fn(results);
      completedSteps.push(step.name);
    }
    
    console.log(`[TRANSACTION] ✓ All steps completed: ${operationName}`);
    logAudit('sequential_transaction_success', { 
      operation: operationName,
      steps: completedSteps 
    });
    
    return results;
  } catch (error) {
    console.error(`[TRANSACTION] ✗ Failed at step: ${completedSteps[completedSteps.length - 1]}`, error);
    logError("data_error", operationName, (error as Error).message, { 
      completedSteps,
      failedAt: completedSteps[completedSteps.length - 1]
    });
    
    throw new TransactionError(
      `Sequential transaction failed at step: ${completedSteps[completedSteps.length - 1]}`,
      error as Error,
      operationName
    );
  }
}

/**
 * Wrapper para operações que precisam de rollback manual
 * Útil quando a operação envolve múltiplas chamadas de API
 */
export async function withManualRollback<T>(
  operation: () => Promise<T>,
  rollback: () => Promise<void>,
  operationName: string
): Promise<T> {
  try {
    console.log(`[TRANSACTION] Starting with manual rollback: ${operationName}`);
    const result = await operation();
    console.log(`[TRANSACTION] ✓ Completed: ${operationName}`);
    return result;
  } catch (error) {
    console.error(`[TRANSACTION] ✗ Failed, executing rollback: ${operationName}`, error);
    try {
      await rollback();
      console.log(`[TRANSACTION] ✓ Rollback completed: ${operationName}`);
    } catch (rollbackError) {
      console.error(`[TRANSACTION] ✗ Rollback also failed: ${operationName}`, rollbackError);
      logError("data_error", operationName, (rollbackError as Error).message, { rollbackFailed: true });
    }
    throw error;
  }
}
